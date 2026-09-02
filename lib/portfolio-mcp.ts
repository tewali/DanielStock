import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import {
  clearManagedStockFields,
  getManagedStock,
  listManagedStocks,
  removeManagedStock,
  updateManagedStockEvaluation,
  upsertManagedStock,
} from '@/lib/managed-stocks';
import { listChangeHistory } from '@/lib/portfolio-audit';
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
  getScreeningMethodology,
  getScreeningStock,
  searchScreeningUniverse,
} from '@/lib/portfolio-screening';
import {
  getPortfolioSettings,
  getPurchasePlan,
  updatePortfolioSettings,
} from '@/lib/portfolio-settings';
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
    clearFields: z
      .array(
        z.enum([
          'sector', 'region', 'quality', 'moat', 'score', 'fairValue',
          'buyBelow', 'holdBelow', 'sellAbove', 'expectedGrowth', 'thesis',
          'risk', 'notes', 'researchSource', 'researchDate',
        ]),
      )
      .min(1)
      .optional(),
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

const evaluationScoreKeySchema = z.enum([
  'market', 'competition', 'regulation', 'balanceSheet', 'margin', 'roe',
  'fcf', 'management', 'ownership', 'capitalAllocation', 'businessModel',
  'moat', 'brand', 'product',
]);

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

const portfolioParametersSchema = z
  .object({
    eurusd: z.number().positive().optional(),
    optionsCash: z.number().min(0).optional(),
    cash: z.number().min(0).optional(),
    minQ: z.number().min(0).max(100).optional(),
    minMoat: z.number().min(0).max(100).optional(),
    maxWatch: z.number().int().min(1).max(1_000).optional(),
    t90: z.number().min(0).max(1).optional(),
    t85: z.number().min(0).max(1).optional(),
    t80: z.number().min(0).max(1).optional(),
    t70: z.number().min(0).max(1).optional(),
    tRest: z.number().min(0).max(1).optional(),
    dayLimit: z.number().min(0).max(1).optional(),
    reserve: z.number().min(0).max(1).optional(),
    trHigh: z.number().min(0).max(1).optional(),
    trMid: z.number().min(0).max(1).optional(),
    trLow: z.number().min(0).max(1).optional(),
    maxBuys: z.number().int().min(0).max(100).optional(),
    minOrder: z.number().min(0).optional(),
  })
  .strict();

const portfolioParameterKeySchema = z.enum([
  'eurusd', 'optionsCash', 'cash', 'minQ', 'minMoat', 'maxWatch', 't90',
  't85', 't80', 't70', 'tRest', 'dayLimit', 'reserve', 'trHigh', 'trMid',
  'trLow', 'maxBuys', 'minOrder',
]);

const tickerNumberRecordSchema = z.record(
  tickerSchema,
  z.number().min(-0.99).max(10),
);

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
          scores: evaluationScoresSchema.optional(),
          clearScores: z.array(evaluationScoreKeySchema).min(1).optional(),
          thesis: z.string().trim().min(1).max(10_000).optional(),
          risk: z.string().trim().min(1).max(10_000).optional(),
          researchSource: z.string().trim().min(1).max(2_000).optional(),
          researchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          clearFields: z
            .array(z.enum(['thesis', 'risk', 'researchSource', 'researchDate']))
            .min(1)
            .optional(),
        })
        .strict()
        .refine(
          ({ ticker: _ticker, ...changes }) =>
            Object.values(changes).some((value) => value !== undefined),
          { message: 'Provide scores, fields to clear, or research changes' },
        ),
      annotations: { idempotentHint: true },
    },
    async ({ ticker, scores, clearScores, clearFields, ...research }) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        if (scores || clearScores) {
          await updateManagedStockEvaluation(ticker, {
            scores,
            clearScores,
            ...research,
          });
        } else if (Object.keys(research).length) {
          await upsertManagedStock(ticker, research, 'update');
        }
        if (clearFields?.length) await clearManagedStockFields(ticker, clearFields);
        return result({
          stock: await getManagedStock(ticker),
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
    async ({ ticker, clearFields, ...patch }) => {
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
        if (Object.keys(patch).length) await upsertManagedStock(ticker, patch, 'update');
        if (clearFields?.length) await clearManagedStockFields(ticker, clearFields);
        return result({
          stock: await getManagedStock(ticker),
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
          name: z.string().trim().min(1).max(240).optional(),
          origin: z.string().trim().min(1).max(240).optional(),
          rank: z.number().int().positive().optional(),
          status: z.string().trim().min(1).max(240).optional(),
          zone: z.string().trim().min(1).max(240).optional(),
          quality: z.number().min(0).max(100).optional(),
          moatCommentary: z.string().trim().min(1).max(10_000).optional(),
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

  server.registerTool(
    'get_portfolio_settings',
    {
      title: 'Get portfolio policy and scenario settings',
      description:
        'Returns portfolio limits, purchase-plan parameters, saved growth and margin-of-safety overrides, scenario shock, and ranking priority. Manual market-price overrides are deliberately excluded.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getPortfolioSettings());
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'update_portfolio_settings',
    {
      title: 'Update portfolio policy and scenario settings',
      description:
        'Updates any subset of purchase-plan parameters, ranking priority, scenario shock, growth assumptions, or margin-of-safety assumptions. Yahoo prices cannot be supplied.',
      inputSchema: z
        .object({
          parameters: portfolioParametersSchema.optional(),
          priority: z.enum(['abstand', 'qualitaet', 'konfidenz']).optional(),
          shockPercent: z.number().min(-40).max(40).optional(),
          growthOverrides: tickerNumberRecordSchema.optional(),
          marginOfSafetyOverrides: z
            .record(tickerSchema, z.number().min(0).max(1))
            .optional(),
          clearGrowthOverrides: z.array(tickerSchema).min(1).optional(),
          clearMarginOfSafetyOverrides: z.array(tickerSchema).min(1).optional(),
          resetParameters: z.array(portfolioParameterKeySchema).min(1).optional(),
        })
        .strict()
        .refine((input) => Object.keys(input).length > 0, {
          message: 'Provide at least one portfolio setting',
        }),
      annotations: { idempotentHint: true },
    },
    async (input) => {
      if (!scopes.includes('stocks:write')) return failure(new Error('insufficient_scope: stocks:write is required'));
      try {
        return result(await updatePortfolioSettings(input));
      } catch (error) {
        return failure(error);
      }
    },
  );

  const planInputSchema = z
    .object({
      shockPercent: z.number().min(-40).max(40).optional(),
      parameters: portfolioParametersSchema.optional(),
      priority: z.enum(['abstand', 'qualitaet', 'konfidenz']).optional(),
      growthOverrides: tickerNumberRecordSchema.optional(),
      marginOfSafetyOverrides: z
        .record(tickerSchema, z.number().min(0).max(1))
        .optional(),
    })
    .strict();

  server.registerTool(
    'get_purchase_plan',
    {
      title: 'Get the current purchase and reduction plan',
      description:
        'Calculates buy, reduce, and sell candidates, daily allocations, policy checks, and option candidates from the ledger, saved settings, and immutable Yahoo prices.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getPurchasePlan());
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'run_portfolio_scenario',
    {
      title: 'Run a non-persistent portfolio scenario',
      description:
        'Calculates the purchase plan under temporary price-shock, growth, margin-of-safety, policy, or ranking assumptions without saving them or changing Yahoo prices.',
      inputSchema: planInputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result(await getPurchasePlan(input));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_price_history',
    {
      title: 'Get Yahoo Finance price history',
      description:
        'Returns read-only daily OHLC, adjusted close, and volume bars from Yahoo Finance, optionally filtered by date. Prices cannot be supplied or edited.',
      inputSchema: z
        .object({
          ticker: tickerSchema,
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          limit: z.number().int().min(1).max(366).optional().default(366),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ ticker, from, to, limit }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        const history = await getPriceHistory(ticker);
        const bars = history.bars
          .filter((bar) => !from || bar.date >= from)
          .filter((bar) => !to || bar.date <= to)
          .slice(-limit);
        return result({ ...history, bars, returnedBars: bars.length });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'search_screening_universe',
    {
      title: 'Search the quality screening universe',
      description:
        'Searches all 250 screened securities and joins available valuation, Growing 50, growth-valuation, and watchlist research fields.',
      inputSchema: z
        .object({
          query: z.string().trim().min(1).max(240).optional(),
          region: z.string().trim().min(1).max(120).optional(),
          sector: z.string().trim().min(1).max(120).optional(),
          verdict: z.string().trim().min(1).max(120).optional(),
          minimumQuality: z.number().min(0).max(100).optional(),
          growing50Only: z.boolean().optional().default(false),
          watchlistOnly: z.boolean().optional().default(false),
          limit: z.number().int().min(1).max(250).optional().default(50),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({ stocks: searchScreeningUniverse(input) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'get_screening_stock',
    {
      title: 'Get complete screening research for one stock',
      description:
        'Returns the embedded screening, valuation, Growing 50, growth-valuation, and original watchlist record for one ticker.',
      inputSchema: z.object({ ticker: tickerSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ ticker }) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      const stock = getScreeningStock(ticker);
      return stock ? result({ stock }) : failure(new Error(`${ticker} is not in the screening universe`));
    },
  );

  server.registerTool(
    'get_screening_methodology',
    {
      title: 'Get screening methodology and policy definitions',
      description:
        'Returns the quality rules, Growing Companies factor model, kill criteria, workflow, evidence links, watchlist guidance, and plan legend.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      return result(getScreeningMethodology());
    },
  );

  server.registerTool(
    'list_change_history',
    {
      title: 'List immutable portfolio change history',
      description:
        'Reads stock, transaction, settings, watchlist, and append-only research events. Audit records cannot be edited or deleted through MCP.',
      inputSchema: z
        .object({
          ticker: tickerSchema.optional(),
          entityType: z.enum(['stock', 'transaction', 'settings', 'watchlist', 'research']).optional(),
          limit: z.number().int().min(1).max(500).optional().default(100),
        })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async (filters) => {
      if (!scopes.includes('stocks:read')) return failure(new Error('insufficient_scope: stocks:read is required'));
      try {
        return result({ events: await listChangeHistory(filters) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
