import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import {
  getManagedStock,
  listManagedStocks,
  removeManagedStock,
  upsertManagedStock,
} from '@/lib/managed-stocks';
import { getPriceHistory, refreshQuotes } from '@/lib/market-data';

const tickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.^=-]{1,24}$/)
  .describe('Yahoo Finance ticker symbol, for example MSFT or SAP.DE');

const analyticsShape = {
  sector: z.string().trim().min(1).max(120).optional(),
  region: z.string().trim().min(1).max(120).optional(),
  quality: z.number().min(0).max(100).optional(),
  moat: z.number().min(0).max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  fairValue: z.number().positive().optional(),
  buyBelow: z.number().positive().optional(),
  holdBelow: z.number().positive().optional(),
  sellAbove: z.number().positive().optional(),
  expectedGrowth: z
    .number()
    .min(-1)
    .max(10)
    .optional()
    .describe('Expected annual growth as a decimal rate, for example 0.12 for 12%'),
  thesis: z.string().trim().min(1).max(10_000).optional(),
  risk: z.string().trim().min(1).max(10_000).optional(),
  notes: z.string().trim().min(1).max(10_000).optional(),
  researchSource: z.string().trim().min(1).max(2_000).optional(),
  researchDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Research date in YYYY-MM-DD format'),
};

const addStockSchema = z
  .object({
    ticker: tickerSchema,
    name: z.string().trim().min(1).max(240),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    ...analyticsShape,
  })
  .strict()
  .describe(
    'Stock metadata and analytics only. Market-price fields are not accepted.',
  );

const updateStockSchema = z
  .object({
    ticker: tickerSchema,
    name: z.string().trim().min(1).max(240).optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    ...analyticsShape,
  })
  .strict()
  .refine(({ ticker: _ticker, ...patch }) => Object.keys(patch).length > 0, {
    message: 'Provide at least one metadata or analytics field to update',
  });

function result(value: unknown) {
  const structuredContent = JSON.parse(JSON.stringify(value)) as Record<
    string,
    unknown
  >;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

export function createPortfolioMcpServer(scopes: string[] = []) {
  const server = new McpServer({
    name: 'danielstock-portfolio-manager',
    version: '1.0.0',
  });

  server.registerTool(
    'list_stocks',
    {
      title: 'List managed stocks',
      description:
        'Lists stock additions, removals, and analytics overrides managed through this MCP. Current prices are read-only Yahoo Finance data.',
      inputSchema: z
        .object({ includeRemoved: z.boolean().optional().default(false) })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ includeRemoved }) => {
      if (!scopes.includes('stocks:read')) {
        return failure(new Error('insufficient_scope: stocks:read is required'));
      }
      try {
        return result({ stocks: await listManagedStocks(includeRemoved) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_stock',
    {
      title: 'Get a managed stock',
      description:
        'Gets the stored metadata and analytics for one ticker, plus the latest read-only Yahoo Finance quote when available.',
      inputSchema: z.object({ ticker: tickerSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ ticker }) => {
      if (!scopes.includes('stocks:read')) {
        return failure(new Error('insufficient_scope: stocks:read is required'));
      }
      try {
        const stock = await getManagedStock(ticker);
        return stock
          ? result({ stock })
          : failure(new Error(`No managed record exists for ${ticker}`));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'add_stock',
    {
      title: 'Add or restore a stock',
      description:
        'Adds a stock to the dashboard, or restores a removed stock. The current quote and one-year daily history are fetched from Yahoo Finance automatically and cannot be supplied by the caller.',
      inputSchema: addStockSchema,
      annotations: { idempotentHint: true },
    },
    async ({ ticker, ...metadata }) => {
      if (!scopes.includes('stocks:write')) {
        return failure(new Error('insufficient_scope: stocks:write is required'));
      }
      try {
        const [market, historyResult] = await Promise.all([
          refreshQuotes([ticker]),
          getPriceHistory(ticker).then(
            (history) => ({ history, error: null }),
            (error: unknown) => ({
              history: null,
              error:
                error instanceof Error
                  ? error.message
                  : 'Price history is temporarily unavailable',
            }),
          ),
        ]);
        const quote = market.quotes.find((item) => item.ticker === ticker);
        if (!quote) {
          const detail = market.errors[0]?.error ?? 'No quote returned';
          throw new Error(`Yahoo Finance rejected ${ticker}: ${detail}`);
        }
        const stock = await upsertManagedStock(
          ticker,
          { ...metadata, currency: metadata.currency ?? quote.currency },
          'add',
          true,
        );
        return result({
          stock,
          marketDataSource: quote.source,
          priceHistory: historyResult.history
            ? {
                bars: historyResult.history.bars.length,
                from: historyResult.history.bars.at(0)?.date ?? null,
                to: historyResult.history.bars.at(-1)?.date ?? null,
                fetchedAt: historyResult.history.fetchedAt,
                source: historyResult.history.source,
              }
            : { error: historyResult.error },
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'remove_stock',
    {
      title: 'Remove a stock',
      description:
        'Removes a ticker from dashboard stock collections. The record is retained as an auditable tombstone and can be restored with add_stock.',
      inputSchema: z.object({ ticker: tickerSchema }).strict(),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ ticker }) => {
      if (!scopes.includes('stocks:write')) {
        return failure(new Error('insufficient_scope: stocks:write is required'));
      }
      try {
        return result({ stock: await removeManagedStock(ticker) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'update_stock_analytics',
    {
      title: 'Update stock metadata and analytics',
      description:
        'Updates research data, scores, thesis, risk, growth assumptions, or valuation thresholds and refreshes the read-only Yahoo quote. Unknown fields—including market price fields—are rejected.',
      inputSchema: updateStockSchema,
      annotations: { idempotentHint: true },
    },
    async ({ ticker, ...patch }) => {
      if (!scopes.includes('stocks:write')) {
        return failure(new Error('insufficient_scope: stocks:write is required'));
      }
      try {
        const market = await refreshQuotes([ticker]);
        const quote = market.quotes.find((item) => item.ticker === ticker);
        if (!quote) {
          const detail = market.errors[0]?.error ?? 'No quote returned';
          throw new Error(`Yahoo Finance rejected ${ticker}: ${detail}`);
        }
        return result({
          stock: await upsertManagedStock(ticker, patch, 'update'),
          marketDataSource: quote.source,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'refresh_stock_market_data',
    {
      title: 'Refresh Yahoo Finance market data',
      description:
        'Refreshes the current quote and one-year daily history directly from Yahoo Finance. It accepts only a ticker and never accepts a price.',
      inputSchema: z.object({ ticker: tickerSchema }).strict(),
      annotations: { idempotentHint: true },
    },
    async ({ ticker }) => {
      if (!scopes.includes('stocks:write')) {
        return failure(new Error('insufficient_scope: stocks:write is required'));
      }
      try {
        const [quotes, history] = await Promise.all([
          refreshQuotes([ticker]),
          getPriceHistory(ticker),
        ]);
        const quote = quotes.quotes.find((item) => item.ticker === ticker);
        if (!quote) {
          const detail = quotes.errors[0]?.error ?? 'No quote returned';
          throw new Error(`Yahoo Finance rejected ${ticker}: ${detail}`);
        }
        return result({
          quote,
          history: {
            ticker: history.ticker,
            bars: history.bars.length,
            from: history.bars.at(0)?.date ?? null,
            to: history.bars.at(-1)?.date ?? null,
            fetchedAt: history.fetchedAt,
            source: history.source,
          },
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
