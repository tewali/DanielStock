import { createHash, randomUUID } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import { database } from '@/lib/database';
import { listManagedStocks } from '@/lib/managed-stocks';
import { getPriceHistory } from '@/lib/market-data';
import portfolioArtifactData from '@/lib/portfolio-artifact-data.json';

const PORTFOLIO_ID = 'primary';
const IMPORT_TTL_MINUTES = 30;
const TRANSACTION_TYPES = [
  'opening',
  'buy',
  'sell',
  'dividend',
  'fee',
  'tax',
  'deposit',
  'withdrawal',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type TransactionInput = {
  type: TransactionType;
  date: string;
  ticker?: string | null;
  quantity?: number | null;
  executionPrice?: number | null;
  currency: string;
  cashAmount?: number | null;
  fees?: number;
  notes?: string | null;
  idempotencyKey?: string | null;
};

export type PortfolioTransaction = TransactionInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type TransactionRow = {
  id: string;
  transaction_type: TransactionType;
  trade_date: string | Date;
  ticker: string | null;
  quantity: number | null;
  execution_price: number | null;
  currency: string;
  cash_amount: number | null;
  fees: number;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type PositionAccumulator = {
  ticker: string;
  currency: string;
  quantity: number;
  costBasis: number;
  costBasisKnown: boolean;
  realizedGain: number;
  realizedGainKnown: boolean;
  dividends: number;
  fees: number;
};

export type PortfolioPosition = {
  ticker: string;
  name: string;
  currency: string;
  quantity: number;
  averageCost: number | null;
  costBasis: number | null;
  currentPrice: number | null;
  currentPriceAt: string | null;
  marketValue: number | null;
  unrealizedGain: number | null;
  realizedGain: number | null;
  dividends: number;
  fees: number;
  valuationIssue: string | null;
  marketDataSource: 'Yahoo Finance' | null;
};

function requiredDatabase() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for portfolio tools');
  return sql;
}

function iso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dateOnly(value: string | Date) {
  if (typeof value === 'string') return value.slice(0, 10);
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function rowToTransaction(row: TransactionRow): PortfolioTransaction {
  return {
    id: row.id,
    type: row.transaction_type,
    date: dateOnly(row.trade_date),
    ticker: row.ticker,
    quantity: row.quantity,
    executionPrice: row.execution_price,
    currency: row.currency,
    cashAmount: row.cash_amount,
    fees: row.fees,
    notes: row.notes,
    idempotencyKey: row.idempotency_key,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function normalizedTransaction(input: TransactionInput): TransactionInput {
  const type = input.type;
  if (!TRANSACTION_TYPES.includes(type)) throw new Error(`Unsupported transaction type: ${type}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))) {
    throw new Error('Transaction date must be a valid YYYY-MM-DD date');
  }
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code');
  const ticker = input.ticker?.trim().toUpperCase() || null;
  if (ticker && !/^[A-Z0-9.^=-]{1,24}$/.test(ticker)) throw new Error('Invalid ticker');
  const quantity = input.quantity ?? null;
  const executionPrice = input.executionPrice ?? null;
  const cashAmount = input.cashAmount ?? null;
  const fees = input.fees ?? 0;
  if (fees < 0 || !Number.isFinite(fees)) throw new Error('Fees must be zero or positive');

  if (type === 'buy' || type === 'sell') {
    if (!ticker) throw new Error(`${type} transactions require a ticker`);
    if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) throw new Error(`${type} transactions require a positive quantity`);
    if (!executionPrice || executionPrice <= 0 || !Number.isFinite(executionPrice)) {
      throw new Error(`${type} transactions require a positive execution price`);
    }
  } else if (type === 'opening') {
    if (!ticker) throw new Error('opening transactions require a ticker');
    if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) throw new Error('opening transactions require a positive quantity');
    if (executionPrice !== null && (executionPrice <= 0 || !Number.isFinite(executionPrice))) {
      throw new Error('Opening execution price must be positive when supplied');
    }
  } else if (type === 'dividend') {
    if (!ticker) throw new Error('dividend transactions require a ticker');
    if (!cashAmount || cashAmount <= 0 || !Number.isFinite(cashAmount)) throw new Error('dividend transactions require a positive cash amount');
  } else if (!cashAmount || cashAmount <= 0 || !Number.isFinite(cashAmount)) {
    throw new Error(`${type} transactions require a positive cash amount`);
  }

  return {
    type,
    date: input.date,
    ticker,
    quantity,
    executionPrice,
    currency,
    cashAmount,
    fees,
    notes: input.notes?.trim() || null,
    idempotencyKey: input.idempotencyKey?.trim() || null,
  };
}

export async function ensurePortfolioLedgerSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id uuid PRIMARY KEY,
      portfolio_id text NOT NULL DEFAULT 'primary',
      transaction_type text NOT NULL CHECK (transaction_type IN (
        'opening', 'buy', 'sell', 'dividend', 'fee', 'tax', 'deposit', 'withdrawal'
      )),
      trade_date date NOT NULL,
      ticker text,
      quantity double precision,
      execution_price double precision,
      currency text NOT NULL,
      cash_amount double precision,
      fees double precision NOT NULL DEFAULT 0,
      notes text,
      idempotency_key text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (portfolio_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS portfolio_transaction_events (
      id bigserial PRIMARY KEY,
      portfolio_id text NOT NULL,
      transaction_id uuid NOT NULL,
      action text NOT NULL CHECK (action IN ('add', 'update', 'delete', 'import')),
      before_state jsonb,
      after_state jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS portfolio_import_previews (
      id uuid PRIMARY KEY,
      portfolio_id text NOT NULL,
      source_name text,
      rows jsonb NOT NULL,
      errors jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      committed_at timestamptz
    );

    CREATE INDEX IF NOT EXISTS portfolio_transactions_portfolio_date_idx
      ON portfolio_transactions (portfolio_id, trade_date, created_at);
    CREATE INDEX IF NOT EXISTS portfolio_transactions_portfolio_ticker_idx
      ON portfolio_transactions (portfolio_id, ticker, trade_date);
    CREATE INDEX IF NOT EXISTS portfolio_transaction_events_transaction_idx
      ON portfolio_transaction_events (portfolio_id, transaction_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS portfolio_import_previews_expiry_idx
      ON portfolio_import_previews (portfolio_id, expires_at DESC);
  `);
  await seedOpeningPositions(sql);
}

async function seedOpeningPositions(sql: Pool) {
  const seeds = portfolioArtifactData.portfolio.map((position) => ({
    id: randomUUID(),
    ticker: position.ticker,
    name: position.name,
    quantity: position.shares,
    currency: position.ccy,
    trade_date: portfolioArtifactData.kpi.lastRun,
    idempotency_key: `legacy-opening:${position.ticker}`,
  }));
  await sql.query(
    `
      INSERT INTO portfolio_transactions (
        id, portfolio_id, transaction_type, trade_date, ticker, quantity,
        execution_price, currency, cash_amount, fees, notes, idempotency_key
      )
      SELECT
        id, $2, 'opening', trade_date, ticker, quantity, NULL, currency,
        NULL, 0, 'Legacy opening position; acquisition cost is unavailable',
        idempotency_key
      FROM jsonb_to_recordset($1::jsonb) AS seed(
        id uuid,
        ticker text,
        name text,
        quantity double precision,
        currency text,
        trade_date date,
        idempotency_key text
      )
      WHERE NOT EXISTS (
        SELECT 1 FROM portfolio_transaction_events event
        WHERE event.portfolio_id = $2
          AND event.action = 'delete'
          AND event.before_state->>'idempotencyKey' = seed.idempotency_key
      )
      ON CONFLICT (portfolio_id, idempotency_key) DO NOTHING
    `,
    [JSON.stringify(seeds), PORTFOLIO_ID],
  );
}

async function transactionRows(client: Pool | PoolClient, filters?: {
  ticker?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const values: unknown[] = [PORTFOLIO_ID];
  const where = ['portfolio_id = $1'];
  if (filters?.ticker) {
    values.push(filters.ticker.toUpperCase());
    where.push(`ticker = $${values.length}`);
  }
  if (filters?.type) {
    values.push(filters.type);
    where.push(`transaction_type = $${values.length}`);
  }
  if (filters?.from) {
    values.push(filters.from);
    where.push(`trade_date >= $${values.length}::date`);
  }
  if (filters?.to) {
    values.push(filters.to);
    where.push(`trade_date <= $${values.length}::date`);
  }
  values.push(Math.min(filters?.limit ?? 500, 2_000));
  return client.query<TransactionRow>(
    `SELECT * FROM portfolio_transactions
     WHERE ${where.join(' AND ')}
     ORDER BY trade_date DESC, created_at DESC, id DESC
     LIMIT $${values.length}`,
    values,
  );
}

function foldPositions(transactions: PortfolioTransaction[]) {
  const positions = new Map<string, PositionAccumulator>();
  for (const transaction of transactions) {
    if (!transaction.ticker) continue;
    const current = positions.get(transaction.ticker) ?? {
      ticker: transaction.ticker,
      currency: transaction.currency,
      quantity: 0,
      costBasis: 0,
      costBasisKnown: true,
      realizedGain: 0,
      realizedGainKnown: true,
      dividends: 0,
      fees: 0,
    };
    if (current.currency !== transaction.currency) {
      throw new Error(`${transaction.ticker} contains transactions in multiple currencies`);
    }
    current.fees += transaction.fees ?? 0;
    if (transaction.type === 'opening' || transaction.type === 'buy') {
      const quantity = transaction.quantity!;
      current.quantity += quantity;
      if (transaction.executionPrice === null || transaction.executionPrice === undefined) {
        current.costBasisKnown = false;
        current.realizedGainKnown = false;
      } else if (current.costBasisKnown) {
        current.costBasis += quantity * transaction.executionPrice + (transaction.fees ?? 0);
      }
    } else if (transaction.type === 'sell') {
      const quantity = transaction.quantity!;
      if (quantity > current.quantity + 1e-8) throw new Error(`${transaction.ticker} would have a negative position`);
      if (current.costBasisKnown && current.quantity > 0) {
        const averageCost = current.costBasis / current.quantity;
        current.costBasis -= averageCost * quantity;
        if (current.realizedGainKnown) {
          current.realizedGain += quantity * transaction.executionPrice! - (transaction.fees ?? 0) - averageCost * quantity;
        }
      }
      current.quantity -= quantity;
    } else if (transaction.type === 'dividend') {
      current.dividends += transaction.cashAmount ?? 0;
    }
    positions.set(transaction.ticker, current);
  }
  return positions;
}

async function validateLedger(client: PoolClient, tickers: string[]) {
  for (const ticker of new Set(tickers.filter(Boolean))) {
    const rows = await transactionRows(client, { ticker, limit: 2_000 });
    foldPositions(rows.rows.map(rowToTransaction).reverse());
  }
}

async function insertTransaction(
  client: PoolClient,
  input: TransactionInput,
  action: 'add' | 'import' = 'add',
) {
  const normalized = normalizedTransaction(input);
  const id = randomUUID();
  const result = await client.query<TransactionRow>(
    `
      INSERT INTO portfolio_transactions (
        id, portfolio_id, transaction_type, trade_date, ticker, quantity,
        execution_price, currency, cash_amount, fees, notes, idempotency_key
      ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (portfolio_id, idempotency_key) DO NOTHING
      RETURNING *
    `,
    [
      id,
      PORTFOLIO_ID,
      normalized.type,
      normalized.date,
      normalized.ticker,
      normalized.quantity,
      normalized.executionPrice,
      normalized.currency,
      normalized.cashAmount,
      normalized.fees,
      normalized.notes,
      normalized.idempotencyKey,
    ],
  );
  if (!result.rows[0]) {
    const existing = await client.query<TransactionRow>(
      `SELECT * FROM portfolio_transactions
       WHERE portfolio_id = $1 AND idempotency_key = $2`,
      [PORTFOLIO_ID, normalized.idempotencyKey],
    );
    return { transaction: rowToTransaction(existing.rows[0]), inserted: false };
  }
  const transaction = rowToTransaction(result.rows[0]);
  await client.query(
    `INSERT INTO portfolio_transaction_events (
       portfolio_id, transaction_id, action, after_state
     ) VALUES ($1, $2, $3, $4::jsonb)`,
    [PORTFOLIO_ID, transaction.id, action, JSON.stringify(transaction)],
  );
  return { transaction, inserted: true };
}

export async function listTransactions(filters?: {
  ticker?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const sql = requiredDatabase();
  await ensurePortfolioLedgerSchema(sql);
  const result = await transactionRows(sql, filters);
  return result.rows.map(rowToTransaction);
}

export async function addTransaction(input: TransactionInput) {
  const sql = requiredDatabase();
  await ensurePortfolioLedgerSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const created = await insertTransaction(client, input);
    if (created.inserted && created.transaction.ticker) {
      await validateLedger(client, [created.transaction.ticker]);
    }
    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<TransactionInput, 'idempotencyKey'>>,
) {
  const sql = requiredDatabase();
  await ensurePortfolioLedgerSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const existingResult = await client.query<TransactionRow>(
      'SELECT * FROM portfolio_transactions WHERE portfolio_id = $1 AND id = $2 FOR UPDATE',
      [PORTFOLIO_ID, id],
    );
    if (!existingResult.rows[0]) throw new Error('Transaction not found');
    const before = rowToTransaction(existingResult.rows[0]);
    const normalized = normalizedTransaction({ ...before, ...patch });
    const result = await client.query<TransactionRow>(
      `UPDATE portfolio_transactions SET
         transaction_type = $3, trade_date = $4::date, ticker = $5,
         quantity = $6, execution_price = $7, currency = $8,
         cash_amount = $9, fees = $10, notes = $11, updated_at = now()
       WHERE portfolio_id = $1 AND id = $2 RETURNING *`,
      [
        PORTFOLIO_ID,
        id,
        normalized.type,
        normalized.date,
        normalized.ticker,
        normalized.quantity,
        normalized.executionPrice,
        normalized.currency,
        normalized.cashAmount,
        normalized.fees,
        normalized.notes,
      ],
    );
    const after = rowToTransaction(result.rows[0]);
    await validateLedger(client, [before.ticker ?? '', after.ticker ?? '']);
    await client.query(
      `INSERT INTO portfolio_transaction_events (
         portfolio_id, transaction_id, action, before_state, after_state
       ) VALUES ($1, $2, 'update', $3::jsonb, $4::jsonb)`,
      [PORTFOLIO_ID, id, JSON.stringify(before), JSON.stringify(after)],
    );
    await client.query('COMMIT');
    return after;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteTransaction(id: string) {
  const sql = requiredDatabase();
  await ensurePortfolioLedgerSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const result = await client.query<TransactionRow>(
      'DELETE FROM portfolio_transactions WHERE portfolio_id = $1 AND id = $2 RETURNING *',
      [PORTFOLIO_ID, id],
    );
    if (!result.rows[0]) throw new Error('Transaction not found');
    const before = rowToTransaction(result.rows[0]);
    if (before.ticker) await validateLedger(client, [before.ticker]);
    await client.query(
      `INSERT INTO portfolio_transaction_events (
         portfolio_id, transaction_id, action, before_state
       ) VALUES ($1, $2, 'delete', $3::jsonb)`,
      [PORTFOLIO_ID, id, JSON.stringify(before)],
    );
    await client.query('COMMIT');
    return before;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listPositions(includeClosed = false) {
  const [transactions, stocks] = await Promise.all([
    listTransactions({ limit: 2_000 }),
    listManagedStocks(false),
  ]);
  const stockMap = new Map(stocks.map((stock) => [stock.ticker, stock]));
  const accumulators = foldPositions([...transactions].reverse());
  return [...accumulators.values()]
    .filter((position) => includeClosed || position.quantity > 1e-8)
    .map<PortfolioPosition>((position) => {
      const stock = stockMap.get(position.ticker);
      const quoteMatches = Boolean(
        stock?.currentMarketPrice && stock.marketCurrency === position.currency,
      );
      const currentPrice = quoteMatches ? stock!.currentMarketPrice : null;
      const marketValue = currentPrice === null ? null : currentPrice * position.quantity;
      const costBasis = position.costBasisKnown ? position.costBasis : null;
      return {
        ticker: position.ticker,
        name: stock?.name ?? position.ticker,
        currency: position.currency,
        quantity: position.quantity,
        averageCost:
          costBasis === null || position.quantity <= 0
            ? null
            : costBasis / position.quantity,
        costBasis,
        currentPrice,
        currentPriceAt: quoteMatches ? stock!.marketPriceAt : null,
        marketValue,
        unrealizedGain:
          marketValue === null || costBasis === null ? null : marketValue - costBasis,
        realizedGain: position.realizedGainKnown ? position.realizedGain : null,
        dividends: position.dividends,
        fees: position.fees,
        valuationIssue: quoteMatches
          ? null
          : stock?.marketCurrency
            ? `Yahoo quote currency ${stock.marketCurrency} does not match transaction currency ${position.currency}`
            : 'No current Yahoo Finance quote is available',
        marketDataSource: quoteMatches ? 'Yahoo Finance' : null,
      };
    })
    .sort((a, b) => (b.marketValue ?? -1) - (a.marketValue ?? -1));
}

async function eurRates(sql: Pool, currencies: string[]) {
  const unique = [...new Set(currencies.filter((currency) => currency !== 'EUR'))];
  if (!unique.length) return new Map([['EUR', 1]]);
  const symbols = unique.map((currency) => `EUR${currency}=X`);
  const result = await sql.query<{ symbol: string; price: number }>(
    'SELECT symbol, price FROM market_quotes WHERE symbol = ANY($1::text[])',
    [symbols],
  );
  const rates = new Map<string, number>([['EUR', 1]]);
  for (const row of result.rows) {
    const currency = row.symbol.slice(3, 6);
    if (row.price > 0) rates.set(currency, 1 / row.price);
  }
  return rates;
}

export async function getPortfolioSummary() {
  const positions = await listPositions(false);
  const sql = requiredDatabase();
  const rates = await eurRates(sql, positions.map((position) => position.currency));
  const previousCloseResult = await sql.query<{ symbol: string; close: number }>(
    `SELECT DISTINCT ON (symbol) symbol, close
     FROM market_price_history
     WHERE symbol = ANY($1::text[]) AND trading_date < CURRENT_DATE
     ORDER BY symbol, trading_date DESC`,
    [positions.map((position) => position.ticker)],
  );
  const previousCloses = new Map(
    previousCloseResult.rows.map((row) => [row.symbol, row.close]),
  );
  const byCurrency = new Map<
    string,
    {
      marketValue: number;
      costBasis: number;
      unrealizedGain: number;
      dailyChange: number;
      positions: number;
    }
  >();
  let marketValueEur = 0;
  let valuedPositions = 0;
  const missingFx = new Set<string>();
  for (const position of positions) {
    const current = byCurrency.get(position.currency) ?? {
      marketValue: 0,
      costBasis: 0,
      unrealizedGain: 0,
      dailyChange: 0,
      positions: 0,
    };
    current.positions += 1;
    current.marketValue += position.marketValue ?? 0;
    current.costBasis += position.costBasis ?? 0;
    current.unrealizedGain += position.unrealizedGain ?? 0;
    const previousClose = previousCloses.get(position.ticker);
    if (position.currentPrice !== null && previousClose !== undefined) {
      current.dailyChange +=
        (position.currentPrice - previousClose) * position.quantity;
    }
    byCurrency.set(position.currency, current);
    if (position.marketValue !== null) {
      const rate = rates.get(position.currency);
      if (rate) {
        marketValueEur += position.marketValue * rate;
        valuedPositions += 1;
      } else {
        missingFx.add(position.currency);
      }
    }
  }
  return {
    asOf: new Date().toISOString(),
    positionCount: positions.length,
    valuedPositions,
    marketValueEur,
    marketValueEurComplete:
      valuedPositions === positions.length && missingFx.size === 0,
    missingFxCurrencies: [...missingFx].sort((a, b) => a.localeCompare(b)),
    byCurrency: Object.fromEntries(
      [...byCurrency.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
    largestPositions: positions.slice(0, 10),
    concentrationWarnings: positions.flatMap((position) => {
      const currencyTotal = byCurrency.get(position.currency)?.marketValue ?? 0;
      const weight =
        position.marketValue === null || currencyTotal <= 0
          ? null
          : position.marketValue / currencyTotal;
      return weight !== null && weight > 0.1
        ? [{ ticker: position.ticker, currency: position.currency, weight }]
        : [];
    }),
    dataQuality: positions.some((position) => position.costBasis === null)
      ? ['Some legacy opening positions have no acquisition cost, so gain metrics are incomplete.']
      : [],
  };
}

function xirr(cashFlows: Array<{ date: string; amount: number }>) {
  if (cashFlows.length < 2 || !cashFlows.some((flow) => flow.amount < 0) || !cashFlows.some((flow) => flow.amount > 0)) return null;
  const first = new Date(`${cashFlows[0].date}T00:00:00Z`).getTime();
  const npv = (rate: number) =>
    cashFlows.reduce((sum, flow) => {
      const years = (new Date(`${flow.date}T00:00:00Z`).getTime() - first) / 31_557_600_000;
      return sum + flow.amount / (1 + rate) ** years;
    }, 0);
  let low = -0.9999;
  let high = 10;
  let lowValue = npv(low);
  let highValue = npv(high);
  if (lowValue * highValue > 0) return null;
  for (let iteration = 0; iteration < 120; iteration += 1) {
    const mid = (low + high) / 2;
    const value = npv(mid);
    if (Math.abs(value) < 1e-8) return mid;
    if (value * lowValue > 0) {
      low = mid;
      lowValue = value;
    } else {
      high = mid;
      highValue = value;
    }
  }
  return (low + high) / 2;
}

async function timeWeightedReturns(
  sql: Pool,
  transactions: PortfolioTransaction[],
  positions: PortfolioPosition[],
  from: string,
  to: string,
) {
  const tickers = positions.map((position) => position.ticker);
  if (!tickers.length) return {};
  const historyResult = await sql.query<{
    symbol: string;
    trading_date: string | Date;
    close: number;
  }>(
    `SELECT symbol, trading_date, close
     FROM market_price_history
     WHERE symbol = ANY($1::text[])
       AND trading_date >= $2::date
       AND trading_date <= $3::date
     ORDER BY trading_date, symbol`,
    [tickers, from, to],
  );
  const currencyByTicker = new Map(positions.map((position) => [position.ticker, position.currency]));
  const histories = new Map<string, Map<string, number>>();
  for (const row of historyResult.rows) {
    const tickerHistory = histories.get(row.symbol) ?? new Map<string, number>();
    tickerHistory.set(dateOnly(row.trading_date), row.close);
    histories.set(row.symbol, tickerHistory);
  }
  const currencies = [...new Set(positions.map((position) => position.currency))];
  return Object.fromEntries(currencies.map((currency) => {
    const currencyTickers = tickers.filter((ticker) => currencyByTicker.get(ticker) === currency);
    const covered = currencyTickers.filter((ticker) => (histories.get(ticker)?.size ?? 0) >= 2);
    if (covered.length !== currencyTickers.length) {
      return [currency, {
        value: null,
        historyCoverage: `${covered.length}/${currencyTickers.length}`,
        reason: 'Daily Yahoo price history is incomplete for one or more positions.',
      }];
    }
    const dates = [...new Set(covered.flatMap((ticker) => [...histories.get(ticker)!.keys()]))]
      .sort((a, b) => a.localeCompare(b));
    if (dates.length < 2) return [currency, { value: null, historyCoverage: `${covered.length}/${currencyTickers.length}`, reason: 'At least two valuation dates are required.' }];
    const relevantTransactions = [...transactions]
      .reverse()
      .filter((transaction) => transaction.currency === currency && transaction.ticker && covered.includes(transaction.ticker));
    const quantities = new Map<string, number>();
    const latestPrices = new Map<string, number>();
    let transactionIndex = 0;
    let factor = 1;
    for (let dateIndex = 0; dateIndex < dates.length; dateIndex += 1) {
      const date = dates[dateIndex];
      const startValue = [...quantities.entries()].reduce(
        (sum, [ticker, quantity]) => sum + quantity * (latestPrices.get(ticker) ?? 0),
        0,
      );
      let externalFlow = 0;
      let dividends = 0;
      while (transactionIndex < relevantTransactions.length && relevantTransactions[transactionIndex].date <= date) {
        const transaction = relevantTransactions[transactionIndex];
        const ticker = transaction.ticker!;
        const quantity = quantities.get(ticker) ?? 0;
        if (transaction.type === 'buy' || transaction.type === 'opening') {
          const flowPrice = transaction.executionPrice ?? histories.get(ticker)!.get(date) ?? latestPrices.get(ticker) ?? 0;
          externalFlow += transaction.quantity! * flowPrice + (transaction.fees ?? 0);
          quantities.set(ticker, quantity + transaction.quantity!);
        } else if (transaction.type === 'sell') {
          externalFlow -= transaction.quantity! * transaction.executionPrice! - (transaction.fees ?? 0);
          quantities.set(ticker, quantity - transaction.quantity!);
        } else if (transaction.type === 'dividend') {
          dividends += transaction.cashAmount ?? 0;
        }
        transactionIndex += 1;
      }
      for (const ticker of covered) {
        const close = histories.get(ticker)!.get(date);
        if (close !== undefined) latestPrices.set(ticker, close);
      }
      const endValue = [...quantities.entries()].reduce(
        (sum, [ticker, quantity]) => sum + quantity * (latestPrices.get(ticker) ?? 0),
        0,
      );
      if (dateIndex > 0 && startValue > 0) {
        factor *= (endValue + dividends - externalFlow) / startValue;
      }
    }
    return [currency, {
      value: factor - 1,
      historyCoverage: `${covered.length}/${currencyTickers.length}`,
      from: dates[0],
      to: dates.at(-1),
      reason: null,
    }];
  }));
}

export async function getPerformance(options?: {
  from?: string;
  to?: string;
  benchmarkTicker?: string;
}) {
  const [transactions, positions] = await Promise.all([
    listTransactions({ limit: 2_000 }),
    listPositions(false),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
  const from = options?.from ?? defaultFrom;
  const to = options?.to ?? today;
  const scopedTransactions = transactions.filter(
    (transaction) => transaction.date >= from && transaction.date <= to,
  );
  const byCurrency = new Map<string, {
    invested: number;
    proceeds: number;
    dividends: number;
    fees: number;
    realizedGain: number;
    currentValue: number;
    cashFlows: Array<{ date: string; amount: number }>;
    incompleteCostBasis: boolean;
  }>();
  const currentFor = (currency: string) => {
    const value = byCurrency.get(currency) ?? {
      invested: 0,
      proceeds: 0,
      dividends: 0,
      fees: 0,
      realizedGain: 0,
      currentValue: 0,
      cashFlows: [],
      incompleteCostBasis: false,
    };
    byCurrency.set(currency, value);
    return value;
  };
  for (const transaction of [...scopedTransactions].reverse()) {
    const current = currentFor(transaction.currency);
    current.fees += transaction.fees ?? 0;
    if (transaction.type === 'buy') {
      const amount = transaction.quantity! * transaction.executionPrice! + (transaction.fees ?? 0);
      current.invested += amount;
      current.cashFlows.push({ date: transaction.date, amount: -amount });
    } else if (transaction.type === 'opening') {
      if (transaction.executionPrice) {
        const amount = transaction.quantity! * transaction.executionPrice;
        current.invested += amount;
        current.cashFlows.push({ date: transaction.date, amount: -amount });
      } else {
        current.incompleteCostBasis = true;
      }
    } else if (transaction.type === 'sell') {
      const amount = transaction.quantity! * transaction.executionPrice! - (transaction.fees ?? 0);
      current.proceeds += amount;
      current.cashFlows.push({ date: transaction.date, amount });
    } else if (transaction.type === 'dividend') {
      current.dividends += transaction.cashAmount ?? 0;
      current.cashFlows.push({ date: transaction.date, amount: transaction.cashAmount ?? 0 });
    }
  }
  for (const position of positions) {
    const current = currentFor(position.currency);
    current.currentValue += position.marketValue ?? 0;
    current.realizedGain += position.realizedGain ?? 0;
  }
  const sql = requiredDatabase();
  const timeWeighted = await timeWeightedReturns(sql, transactions, positions, from, to);
  const benchmarkTicker = options?.benchmarkTicker?.toUpperCase() ?? '^GSPC';
  const benchmark = await getPriceHistory(benchmarkTicker).then(
    (benchmarkHistory) => {
      const benchmarkBars = benchmarkHistory.bars.filter(
        (bar) => bar.date >= from && bar.date <= to,
      );
      return {
        ticker: benchmarkTicker,
        return:
          benchmarkBars.length >= 2
            ? benchmarkBars.at(-1)!.close / benchmarkBars[0].close - 1
            : null,
        currency: benchmarkHistory.currency,
        from: benchmarkBars[0]?.date ?? null,
        to: benchmarkBars.at(-1)?.date ?? null,
        source: benchmarkHistory.source,
        error: null,
      };
    },
    (error: unknown) => ({
      ticker: benchmarkTicker,
      return: null,
      currency: null,
      from: null,
      to: null,
      source: 'Yahoo Finance' as const,
      error:
        error instanceof Error
          ? error.message
          : 'Benchmark history is unavailable',
    }),
  );
  return {
    from,
    to,
    benchmark,
    byCurrency: Object.fromEntries(
      [...byCurrency.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, value]) => {
        const flows = [...value.cashFlows];
        if (value.currentValue > 0) flows.push({ date: today, amount: value.currentValue });
        const totalReturn = value.currentValue + value.proceeds + value.dividends - value.invested;
        return [
          currency,
          {
            invested: value.invested,
            proceeds: value.proceeds,
            dividends: value.dividends,
            fees: value.fees,
            currentValue: value.currentValue,
            realizedGain: value.incompleteCostBasis ? null : value.realizedGain,
            totalReturn: value.incompleteCostBasis ? null : totalReturn,
            simpleReturn: value.incompleteCostBasis || value.invested <= 0 ? null : totalReturn / value.invested,
            moneyWeightedReturn: value.incompleteCostBasis ? null : xirr(flows),
            timeWeightedReturn: timeWeighted[currency]?.value ?? null,
            timeWeightedReturnCoverage:
              timeWeighted[currency]?.historyCoverage ?? '0/0',
            timeWeightedReturnReason: timeWeighted[currency]?.reason ?? null,
            dataQuality: value.incompleteCostBasis
              ? ['Legacy opening positions have no acquisition cost.']
              : [],
          },
        ];
        }),
    ),
  };
}

export async function getAllocation() {
  const positions = await listPositions(false);
  const stocks = await listManagedStocks(false);
  const stockMap = new Map(stocks.map((stock) => [stock.ticker, stock]));
  const totals = new Map<string, number>();
  for (const position of positions) {
    if (position.marketValue !== null) totals.set(position.currency, (totals.get(position.currency) ?? 0) + position.marketValue);
  }
  const maxWeight = (quality?: number) =>
    quality === undefined
      ? portfolioArtifactData.rules['Max-Gewicht sonst']
      : quality >= 90
        ? portfolioArtifactData.rules['Max-Gewicht Qualität ≥90']
        : quality >= 85
          ? portfolioArtifactData.rules['Max-Gewicht Qualität ≥85']
          : quality >= 80
            ? portfolioArtifactData.rules['Max-Gewicht Qualität ≥80']
            : quality >= 70
              ? portfolioArtifactData.rules['Max-Gewicht Qualität ≥70']
              : portfolioArtifactData.rules['Max-Gewicht sonst'];
  const security = positions.map((position) => {
    const stock = stockMap.get(position.ticker);
    const weightInCurrency =
      position.marketValue === null || !totals.get(position.currency)
        ? null
        : position.marketValue / totals.get(position.currency)!;
    const allowedWeight = maxWeight(stock?.quality);
    return {
      ticker: position.ticker,
      currency: position.currency,
      marketValue: position.marketValue,
      weightInCurrency,
      sector: stock?.sector ?? 'Unknown',
      region: stock?.region ?? 'Unknown',
      quality: stock?.quality ?? null,
      maxWeight: allowedWeight,
      limitExceeded:
        weightInCurrency === null ? null : weightInCurrency > allowedWeight,
      excessWeight:
        weightInCurrency === null
          ? null
          : Math.max(0, weightInCurrency - allowedWeight),
    };
  });
  const group = (key: 'sector' | 'region' | 'currency') => {
    const values = new Map<string, Record<string, number>>();
    for (const item of security) {
      const label = key === 'currency' ? item.currency : item[key];
      if (item.marketValue === null) continue;
      const currencies = values.get(label) ?? {};
      currencies[item.currency] = (currencies[item.currency] ?? 0) + item.marketValue;
      values.set(label, currencies);
    }
    return Object.fromEntries(
      [...values.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
  };
  return {
    asOf: new Date().toISOString(),
    limitCheckBasis:
      'Weights are checked within each transaction currency until all FX rates are available.',
    security,
    bySector: group('sector'),
    byRegion: group('region'),
    byCurrency: group('currency'),
    limitViolations: security.filter((item) => item.limitExceeded),
  };
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field.trim());
      field = '';
    } else if (character === '\n') {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function optionalNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

function transactionFingerprint(input: TransactionInput) {
  return `csv:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

export async function previewTransactionImport(csv: string, sourceName?: string) {
  if (Buffer.byteLength(csv, 'utf8') > 1_000_000) throw new Error('CSV import is limited to 1 MB');
  const parsed = parseCsv(csv);
  if (parsed.length < 2) throw new Error('CSV must contain a header and at least one data row');
  if (parsed.length > 2_001) throw new Error('CSV import is limited to 2,000 rows');
  const headers = parsed[0].map((header) => header.trim().toLowerCase());
  const required = ['date', 'type', 'currency'];
  for (const header of required) if (!headers.includes(header)) throw new Error(`CSV is missing required column: ${header}`);
  const rows: TransactionInput[] = [];
  const errors: Array<{ row: number; error: string }> = [];
  for (let index = 1; index < parsed.length; index += 1) {
    const values = Object.fromEntries(headers.map((header, column) => [header, parsed[index][column] ?? '']));
    try {
      const candidate = normalizedTransaction({
        date: values.date,
        type: values.type?.toLowerCase() as TransactionType,
        ticker: values.ticker || null,
        quantity: optionalNumber(values.quantity),
        executionPrice: optionalNumber(values.execution_price || values.price),
        currency: values.currency,
        cashAmount: optionalNumber(values.cash_amount || values.amount),
        fees: optionalNumber(values.fees) ?? 0,
        notes: values.notes || null,
        idempotencyKey: values.external_id || values.idempotency_key || null,
      });
      candidate.idempotencyKey ||= transactionFingerprint(candidate);
      rows.push(candidate);
    } catch (error) {
      errors.push({ row: index + 1, error: error instanceof Error ? error.message : 'Invalid row' });
    }
  }
  const sql = requiredDatabase();
  await ensurePortfolioLedgerSchema(sql);
  await sql.query(
    `DELETE FROM portfolio_import_previews
     WHERE portfolio_id = $1 AND committed_at IS NULL AND expires_at < now()`,
    [PORTFOLIO_ID],
  );
  const keys = rows.map((row) => row.idempotencyKey!);
  const duplicateResult = await sql.query<{ idempotency_key: string }>(
    `SELECT idempotency_key FROM portfolio_transactions
     WHERE portfolio_id = $1 AND idempotency_key = ANY($2::text[])`,
    [PORTFOLIO_ID, keys],
  );
  const duplicates = new Set(duplicateResult.rows.map((row) => row.idempotency_key));
  const seenInFile = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    const key = row.idempotencyKey!;
    if (duplicates.has(key) || seenInFile.has(key)) duplicateRows += 1;
    seenInFile.add(key);
  }
  const previewId = randomUUID();
  await sql.query(
    `INSERT INTO portfolio_import_previews (
       id, portfolio_id, source_name, rows, errors, expires_at
     ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, now() + ($6 * interval '1 minute'))`,
    [previewId, PORTFOLIO_ID, sourceName ?? null, JSON.stringify(rows), JSON.stringify(errors), IMPORT_TTL_MINUTES],
  );
  return {
    previewId,
    expiresInMinutes: IMPORT_TTL_MINUTES,
    sourceName: sourceName ?? null,
    totalRows: parsed.length - 1,
    validRows: rows.length,
    invalidRows: errors.length,
    duplicateRows,
    errors,
    sample: rows.slice(0, 10),
  };
}

export async function commitTransactionImport(previewId: string) {
  const sql = requiredDatabase();
  await ensurePortfolioLedgerSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const previewResult = await client.query<{
      rows: TransactionInput[];
      errors: Array<{ row: number; error: string }>;
      expires_at: Date;
      committed_at: Date | null;
    }>(
      `SELECT rows, errors, expires_at, committed_at
       FROM portfolio_import_previews
       WHERE portfolio_id = $1 AND id = $2 FOR UPDATE`,
      [PORTFOLIO_ID, previewId],
    );
    const preview = previewResult.rows[0];
    if (!preview) throw new Error('Import preview not found');
    if (preview.committed_at) throw new Error('Import preview was already committed');
    if (preview.expires_at.getTime() <= Date.now()) throw new Error('Import preview has expired');
    if (preview.errors.length) throw new Error('Import preview contains invalid rows');
    let imported = 0;
    let duplicates = 0;
    const affectedTickers: string[] = [];
    for (const row of preview.rows) {
      const inserted = await insertTransaction(client, row, 'import');
      if (inserted.inserted) {
        imported += 1;
        if (inserted.transaction.ticker) affectedTickers.push(inserted.transaction.ticker);
      } else {
        duplicates += 1;
      }
    }
    await validateLedger(client, affectedTickers);
    await client.query(
      `UPDATE portfolio_import_previews SET committed_at = now()
       WHERE portfolio_id = $1 AND id = $2`,
      [PORTFOLIO_ID, previewId],
    );
    await client.query('COMMIT');
    return { previewId, imported, duplicates };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
