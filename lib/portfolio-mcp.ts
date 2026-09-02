import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import {
  getManagedStock,
  listManagedStocks,
  removeManagedStock,
  updateManagedStockEvaluation,
  upsertManagedStock,
} from '@/lib/managed-stocks';
import { getPriceHistory, refreshQuotes } from '@/lib/market-data';
import {
  addTransaction,
  commitTransactionImport,
  deleteTransaction,
  getAllocation,
  getPerformance,
  getPortfolioSummary,
  listPositions,
  listTransactions,
  previewTransactionImport,
  type TransactionType,
  updateTransaction,
} from '@/lib/portfolio-ledger';
import {
  addResearchNote,
  getInvestmentOpportunities,
  listResearchNotes,
  listWatchlist,
  manageWatchlist,
} from '@/lib/portfolio-research';
import {
  getMarketRefreshHistory,
  retryMarketRefresh,
} from '@/lib/scheduled-market-refresh';

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

const transactionTypeSchema = z.enum([
  'opening',
  'buy',
  'sell',
  'dividend',
  'fee',
  'tax',
  'deposit',
  'withdrawal',
]);

const transactionShape = {
  type: transactionTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ticker: tickerSchema.nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  executionPrice: z
    .number()
    .positive()
    .nullable()
    .optional()
    .describe('Actual execution price for this transaction, never a current market quote'),
  currency: z.string().trim().toUpperCase().length(3),
  cashAmount: z.number().positive().nullable().optional(),
  fees: z.number().min(0).optional().default(0),
  notes: z.string().trim().min(1).max(10_000).nullable().optional(),
};

const addTransactionSchema = z
  .object({
    ...transactionShape,
    idempotencyKey: z.string().trim().min(1).max(240).nullable().optional(),
  })
  .strict();

const updateTransactionSchema = z
  .object({
    transactionId: z.uuid(),
    type: transactionTypeSchema.optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ticker: tickerSchema.nullable().optional(),
    quantity: z.number().positive().nullable().optional(),
    executionPrice: z.number().positive().nullable().optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    cashAmount: z.number().positive().nullable().optional(),
    fees: z.number().min(0).optional(),
    notes: z.string().trim().min(1).max(10_000).nullable().optional(),
  })
  .strict()
  .refine(
    ({ transactionId: _transactionId, ...patch }) => Object.keys(patch).length > 0,
    { message: 'Provide at least one transaction field to update' },
  );

const evaluationScoresSchema = z
  .object({
    market: z.number().int().min(1).max(6).optional(),
    competition: z.number().int().min(1).max(6).optional(),
    regulation: z.number().int().min(1).max(6).optional(),
    balanceSheet: z.number().int().min(1).max(6).optional(),
    margin: z.number().int().min(1).max(6).optional(),
    roe: z.number().int().min(1).max(6).optional(),
    fcf: z.number().int().min(1).max(6).optional(),
    management: z.number().int().min(1).max(6).optional(),
    ownership: z.number().int().min(1).max(6).optional(),
    capitalAllocation: z.number().int().min(1).max(6).optional(),
    businessModel: z.number().int().min(1).max(6).optional(),
    moat: z.number().int().min(1).max(6).optional(),
    brand: z.number().int().min(1).max(6).optional(),
    product: z.number().int().min(1).max(6).optional(),
  })
  .strict()
  .refine((scores) => Object.keys(scores).length > 0, {
    message: 'Provide at least one evaluation score',
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
    'get_stock_evaluation',
    {
      title: 'Get detailed stock evaluation',
      description:
        'Returns the 14-factor evaluation matrix (1 very good, 6 very poor), computed average, thesis, risk, research source, and research date.',
      inputSchema: z.object({ ticker: tickerSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ ticker }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        const stock = await getManagedStock(ticker);
        if (!stock) return failure(new Error(`No managed record exists for ${ticker}`));
        return result({
          ticker: stock.ticker,
          evaluationScores: stock.evaluationScores ?? {},
          evaluationAverage: stock.evaluationAverage ?? null,
          scale: { best: 1, worst: 6 },
          thesis: stock.thesis ?? null,
          risk: stock.risk ?? null,
          researchSource: stock.researchSource ?? null,
          researchDate: stock.researchDate ?? null,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'update_stock_evaluation',
    {
      title: 'Update detailed stock evaluation',
      description:
        'Updates any subset of the 14 evaluation factors on the 1-to-6 scale and optionally appends the latest thesis, risk, source, and date. The average is recalculated automatically; market prices cannot be supplied.',
      inputSchema: z
        .object({
          ticker: tickerSchema,
          scores: evaluationScoresSchema,
          thesis: z.string().trim().min(1).max(10_000).optional(),
          risk: z.string().trim().min(1).max(10_000).optional(),
          researchSource: z.string().trim().min(1).max(2_000).optional(),
          researchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        })
        .strict(),
      annotations: { idempotentHint: true },
    },
    async ({ ticker, scores, ...research }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result({
          stock: await updateManagedStockEvaluation(ticker, {
            scores,
            ...research,
          }),
        });
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

  server.registerTool(
    'list_positions',
    {
      title: 'List portfolio positions',
      description:
        'Lists actual holdings derived from the transaction ledger, with quantities, cost basis when known, and read-only Yahoo Finance valuations.',
      inputSchema: z.object({ includeClosed: z.boolean().optional().default(false) }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ includeClosed }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({ positions: await listPositions(includeClosed) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_portfolio_summary',
    {
      title: 'Get portfolio summary',
      description:
        'Returns portfolio value, currency totals, largest positions, valuation completeness, and cost-basis data-quality warnings.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getPortfolioSummary());
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'list_transactions',
    {
      title: 'List portfolio transactions',
      description: 'Lists audited portfolio ledger entries with optional ticker, type, and date filters.',
      inputSchema: z
        .object({
          ticker: tickerSchema.optional(),
          type: transactionTypeSchema.optional(),
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          limit: z.number().int().min(1).max(2_000).optional().default(500),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ ticker, type, from, to, limit }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({
          transactions: await listTransactions({
            ticker,
            type: type as TransactionType | undefined,
            from,
            to,
            limit,
          }),
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'add_transaction',
    {
      title: 'Add portfolio transaction',
      description:
        'Adds a buy, sell, opening balance, dividend, fee, tax, deposit, or withdrawal. executionPrice is the historical trade execution price and cannot modify Yahoo market quotes.',
      inputSchema: addTransactionSchema,
    },
    async (input) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result(await addTransaction(input));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'update_transaction',
    {
      title: 'Update portfolio transaction',
      description:
        'Updates an audited transaction and rejects changes that would make any holding negative. Current market prices remain immutable.',
      inputSchema: updateTransactionSchema,
    },
    async ({ transactionId, ...patch }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result({ transaction: await updateTransaction(transactionId, patch) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'delete_transaction',
    {
      title: 'Delete portfolio transaction',
      description:
        'Deletes one transaction while retaining an audit event. Deletion is rejected when it would make a holding negative.',
      inputSchema: z.object({ transactionId: z.uuid() }).strict(),
      annotations: { destructiveHint: true },
    },
    async ({ transactionId }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result({ deleted: await deleteTransaction(transactionId) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'preview_transaction_import',
    {
      title: 'Preview CSV transaction import',
      description:
        'Parses and validates a CSV without changing the ledger. Required columns: date,type,currency. Common optional columns: ticker,quantity,execution_price,cash_amount,fees,notes,external_id.',
      inputSchema: z
        .object({
          csv: z.string().min(1).max(1_000_000),
          sourceName: z.string().trim().min(1).max(240).optional(),
        })
        .strict(),
    },
    async ({ csv, sourceName }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result(await previewTransactionImport(csv, sourceName));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'commit_transaction_import',
    {
      title: 'Commit CSV transaction import',
      description:
        'Commits a previously validated, unexpired preview. Duplicate idempotency keys are skipped and the entire import rolls back if positions would become invalid.',
      inputSchema: z.object({ previewId: z.uuid() }).strict(),
    },
    async ({ previewId }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result(await commitTransactionImport(previewId));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_performance',
    {
      title: 'Get portfolio performance',
      description:
        'Returns invested capital, proceeds, dividends, fees, realized/total return, and money-weighted return by currency. Incomplete legacy cost basis is reported explicitly.',
      inputSchema: z
        .object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          benchmarkTicker: tickerSchema.optional().default('^GSPC'),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, benchmarkTicker }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getPerformance({ from, to, benchmarkTicker }));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_allocation',
    {
      title: 'Get portfolio allocation',
      description:
        'Returns security weights and native-currency allocation grouped by sector, region, and currency.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getAllocation());
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_investment_opportunities',
    {
      title: 'Rank investment opportunities',
      description:
        'Ranks managed securities using quality, moat, score, valuation thresholds, and read-only Yahoo Finance prices.',
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).optional().default(20),
          minimumQuality: z.number().min(0).max(100).optional().default(0),
          watchlistOnly: z.boolean().optional().default(false),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async (options) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({ opportunities: await getInvestmentOpportunities(options) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'list_market_refreshes',
    {
      title: 'List market refresh history',
      description:
        'Lists recent automatic and retry runs, including updated, failed, and skipped tickers with reasons.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional().default(8) }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getMarketRefreshHistory(limit));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'retry_failed_refreshes',
    {
      title: 'Retry failed market refreshes',
      description:
        'Retries only failed tickers from a previous run. Prices are fetched directly from Yahoo Finance and cannot be provided by the caller.',
      inputSchema: z.object({ runId: z.number().int().positive() }).strict(),
      annotations: { idempotentHint: true },
    },
    async ({ runId }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result(await retryMarketRefresh(runId));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'add_research_note',
    {
      title: 'Add timestamped research note',
      description:
        'Appends a note, thesis update, or risk update without overwriting previous research.',
      inputSchema: z
        .object({
          ticker: tickerSchema,
          kind: z.enum(['note', 'thesis', 'risk']).default('note'),
          content: z.string().trim().min(1).max(20_000),
          source: z.string().trim().min(1).max(2_000).optional(),
          researchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        })
        .strict(),
    },
    async (input) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result({ note: await addResearchNote(input) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'list_research_notes',
    {
      title: 'List research notes',
      description: 'Lists append-only research notes with optional ticker and kind filters.',
      inputSchema: z
        .object({
          ticker: tickerSchema.optional(),
          kind: z.enum(['note', 'thesis', 'risk']).optional(),
          limit: z.number().int().min(1).max(500).optional().default(100),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async (filters) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({ notes: await listResearchNotes(filters) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'manage_watchlist',
    {
      title: 'Manage watchlist membership',
      description: 'Adds/restores or removes a ticker from the PostgreSQL watchlist, with optional notes and priority.',
      inputSchema: z
        .object({
          ticker: tickerSchema,
          action: z.enum(['add', 'remove']),
          notes: z.string().trim().min(1).max(10_000).optional(),
          priority: z.number().int().min(1).max(5).optional(),
        })
        .strict(),
      annotations: { idempotentHint: true },
    },
    async (input) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result({ watchlistItem: await manageWatchlist(input) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'list_watchlist',
    {
      title: 'List watchlist',
      description: 'Lists PostgreSQL watchlist membership, notes, priorities, and removal state.',
      inputSchema: z.object({ includeRemoved: z.boolean().optional().default(false) }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ includeRemoved }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({ watchlist: await listWatchlist(includeRemoved) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
