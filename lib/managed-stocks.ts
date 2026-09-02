import type { Pool } from 'pg';

import { database } from '@/lib/database';
import { ensureMarketDataSchema, refreshQuotes } from '@/lib/market-data';
import { PORTFOLIO_ARTIFACT_STOCK_SEEDS } from '@/lib/portfolio-artifact-seed';

export type StockAnalyticsPatch = {
  name?: string;
  currency?: string;
  sector?: string;
  region?: string;
  quality?: number;
  moat?: number;
  score?: number;
  fairValue?: number;
  buyBelow?: number;
  holdBelow?: number;
  sellAbove?: number;
  expectedGrowth?: number;
  thesis?: string;
  risk?: string;
  notes?: string;
  researchSource?: string;
  researchDate?: string;
};

export type StockEvaluationScores = {
  market?: number;
  competition?: number;
  regulation?: number;
  balanceSheet?: number;
  margin?: number;
  roe?: number;
  fcf?: number;
  management?: number;
  ownership?: number;
  capitalAllocation?: number;
  businessModel?: number;
  moat?: number;
  brand?: number;
  product?: number;
};

export type StockAnalyticsClearField =
  | 'sector'
  | 'region'
  | 'quality'
  | 'moat'
  | 'score'
  | 'fairValue'
  | 'buyBelow'
  | 'holdBelow'
  | 'sellAbove'
  | 'expectedGrowth'
  | 'thesis'
  | 'risk'
  | 'notes'
  | 'researchSource'
  | 'researchDate';

export type ManagedStock = StockAnalyticsPatch & {
  ticker: string;
  isRemoved: boolean;
  currentMarketPrice: number | null;
  marketCurrency: string | null;
  marketPriceAt: string | null;
  marketDataFetchedAt: string | null;
  evaluationScores?: StockEvaluationScores;
  evaluationAverage?: number;
  createdAt: string;
  updatedAt: string;
};

type StockRow = {
  ticker: string;
  name: string | null;
  currency: string | null;
  sector: string | null;
  region: string | null;
  quality: number | null;
  moat: number | null;
  score: number | null;
  fair_value: number | null;
  buy_below: number | null;
  hold_below: number | null;
  sell_above: number | null;
  expected_growth: number | null;
  thesis: string | null;
  risk: string | null;
  notes: string | null;
  research_source: string | null;
  research_date: string | Date | null;
  evaluation_scores: StockEvaluationScores | null;
  evaluation_average: number | null;
  is_removed: boolean;
  current_market_price: number | null;
  market_currency: string | null;
  market_price_at: string | Date | null;
  market_data_fetched_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function requiredDatabase() {
  const sql = database();
  if (!sql) {
    throw new Error('DATABASE_URL is required for stock management');
  }
  return sql;
}

export async function ensureManagedStocksSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS managed_stocks (
      ticker text PRIMARY KEY,
      name text,
      currency text,
      sector text,
      region text,
      quality double precision,
      moat double precision,
      score double precision,
      fair_value double precision,
      buy_below double precision,
      hold_below double precision,
      sell_above double precision,
      expected_growth double precision,
      thesis text,
      risk text,
      notes text,
      research_source text,
      research_date date,
      evaluation_scores jsonb,
      evaluation_average double precision,
      is_removed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS managed_stock_events (
      id bigserial PRIMARY KEY,
      ticker text NOT NULL,
      action text NOT NULL,
      changes jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS managed_stock_events_ticker_date_idx
      ON managed_stock_events (ticker, created_at DESC);

    ALTER TABLE managed_stocks
      ADD COLUMN IF NOT EXISTS evaluation_scores jsonb,
      ADD COLUMN IF NOT EXISTS evaluation_average double precision;
  `);
}

async function seedPortfolioArtifactStocks(sql: Pool) {
  const result = await sql.query<{ ticker: string }>(
    `
      INSERT INTO managed_stocks (
        ticker, name, currency, sector, region, quality, moat, score,
        fair_value, buy_below, hold_below, sell_above, expected_growth,
        thesis, risk, research_source, research_date, evaluation_scores,
        evaluation_average
      )
      SELECT
        ticker, name, currency, sector, region, quality, moat, score,
        fair_value, buy_below, hold_below, sell_above, expected_growth,
        thesis, risk, research_source, research_date, evaluation_scores,
        evaluation_average
      FROM jsonb_to_recordset($1::jsonb) AS seed(
        ticker text,
        name text,
        currency text,
        sector text,
        region text,
        quality double precision,
        moat double precision,
        score double precision,
        fair_value double precision,
        buy_below double precision,
        hold_below double precision,
        sell_above double precision,
        expected_growth double precision,
        thesis text,
        risk text,
        research_source text,
        research_date date,
        evaluation_scores jsonb,
        evaluation_average double precision
      )
      WHERE true
      ON CONFLICT (ticker) DO NOTHING
      RETURNING ticker
    `,
    [JSON.stringify(PORTFOLIO_ARTIFACT_STOCK_SEEDS)],
  );
  return result.rows.map((row) => row.ticker);
}

async function ensureManagedStocksReady(sql: Pool) {
  await Promise.all([ensureManagedStocksSchema(sql), ensureMarketDataSchema(sql)]);
  const insertedTickers = await seedPortfolioArtifactStocks(sql);
  if (insertedTickers.length) {
    const currencies = new Set(
      PORTFOLIO_ARTIFACT_STOCK_SEEDS
        .filter((stock) => insertedTickers.includes(stock.ticker))
        .map((stock) => stock.currency)
        .filter((currency): currency is string => Boolean(currency && currency !== 'EUR')),
    );
    await refreshQuotes([
      ...insertedTickers,
      ...[...currencies].map((currency) => `EUR${currency}=X`),
    ]);
  }
}

function iso(value: string | Date | null) {
  if (value === null) return null;
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

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function rowToManagedStock(row: StockRow): ManagedStock {
  return {
    ticker: row.ticker,
    name: optional(row.name),
    currency: optional(row.currency),
    sector: optional(row.sector),
    region: optional(row.region),
    quality: optional(row.quality),
    moat: optional(row.moat),
    score: optional(row.score),
    fairValue: optional(row.fair_value),
    buyBelow: optional(row.buy_below),
    holdBelow: optional(row.hold_below),
    sellAbove: optional(row.sell_above),
    expectedGrowth: optional(row.expected_growth),
    thesis: optional(row.thesis),
    risk: optional(row.risk),
    notes: optional(row.notes),
    researchSource: optional(row.research_source),
    researchDate: row.research_date ? dateOnly(row.research_date) : undefined,
    evaluationScores: optional(row.evaluation_scores),
    evaluationAverage: optional(row.evaluation_average),
    isRemoved: row.is_removed,
    currentMarketPrice: row.current_market_price,
    marketCurrency: row.market_currency,
    marketPriceAt: iso(row.market_price_at),
    marketDataFetchedAt: iso(row.market_data_fetched_at),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

const SELECT_STOCK = `
  SELECT s.*,
         q.price AS current_market_price,
         q.currency AS market_currency,
         q.price_at AS market_price_at,
         q.fetched_at AS market_data_fetched_at
  FROM managed_stocks s
  LEFT JOIN market_quotes q ON q.symbol = s.ticker
`;

export async function listManagedStocks(includeRemoved = false) {
  const sql = requiredDatabase();
  await ensureManagedStocksReady(sql);
  const result = await sql.query<StockRow>(
    `${SELECT_STOCK}
     WHERE ($1::boolean OR NOT s.is_removed)
     ORDER BY s.ticker`,
    [includeRemoved],
  );
  return result.rows.map(rowToManagedStock);
}

export async function getManagedStock(ticker: string) {
  const sql = requiredDatabase();
  await ensureManagedStocksReady(sql);
  const result = await sql.query<StockRow>(
    `${SELECT_STOCK} WHERE s.ticker = $1`,
    [ticker],
  );
  return result.rows[0] ? rowToManagedStock(result.rows[0]) : null;
}

export async function upsertManagedStock(
  ticker: string,
  patch: StockAnalyticsPatch,
  action: 'add' | 'update',
  restore = false,
) {
  const sql = requiredDatabase();
  await ensureManagedStocksSchema(sql);
  const client = await sql.connect();
  const values = [
    ticker,
    patch.name ?? null,
    patch.currency ?? null,
    patch.sector ?? null,
    patch.region ?? null,
    patch.quality ?? null,
    patch.moat ?? null,
    patch.score ?? null,
    patch.fairValue ?? null,
    patch.buyBelow ?? null,
    patch.holdBelow ?? null,
    patch.sellAbove ?? null,
    patch.expectedGrowth ?? null,
    patch.thesis ?? null,
    patch.risk ?? null,
    patch.notes ?? null,
    patch.researchSource ?? null,
    patch.researchDate ?? null,
    restore,
  ];

  await client.query('BEGIN');
  try {
    await client.query(
      `
        INSERT INTO managed_stocks (
          ticker, name, currency, sector, region, quality, moat, score,
          fair_value, buy_below, hold_below, sell_above, expected_growth,
          thesis, risk, notes, research_source, research_date, is_removed
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, false
        )
        ON CONFLICT (ticker) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, managed_stocks.name),
          currency = COALESCE(EXCLUDED.currency, managed_stocks.currency),
          sector = COALESCE(EXCLUDED.sector, managed_stocks.sector),
          region = COALESCE(EXCLUDED.region, managed_stocks.region),
          quality = COALESCE(EXCLUDED.quality, managed_stocks.quality),
          moat = COALESCE(EXCLUDED.moat, managed_stocks.moat),
          score = COALESCE(EXCLUDED.score, managed_stocks.score),
          fair_value = COALESCE(EXCLUDED.fair_value, managed_stocks.fair_value),
          buy_below = COALESCE(EXCLUDED.buy_below, managed_stocks.buy_below),
          hold_below = COALESCE(EXCLUDED.hold_below, managed_stocks.hold_below),
          sell_above = COALESCE(EXCLUDED.sell_above, managed_stocks.sell_above),
          expected_growth = COALESCE(EXCLUDED.expected_growth, managed_stocks.expected_growth),
          thesis = COALESCE(EXCLUDED.thesis, managed_stocks.thesis),
          risk = COALESCE(EXCLUDED.risk, managed_stocks.risk),
          notes = COALESCE(EXCLUDED.notes, managed_stocks.notes),
          research_source = COALESCE(EXCLUDED.research_source, managed_stocks.research_source),
          research_date = COALESCE(EXCLUDED.research_date, managed_stocks.research_date),
          is_removed = CASE
            WHEN $19::boolean THEN false
            ELSE managed_stocks.is_removed
          END,
          updated_at = now()
      `,
      values,
    );
    await client.query(
      `INSERT INTO managed_stock_events (ticker, action, changes)
       VALUES ($1, $2, $3::jsonb)`,
      [ticker, action, JSON.stringify(patch)],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getManagedStock(ticker);
}

export async function removeManagedStock(ticker: string) {
  const sql = requiredDatabase();
  await ensureManagedStocksSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    await client.query(
      `
        INSERT INTO managed_stocks (ticker, is_removed)
        VALUES ($1, true)
        ON CONFLICT (ticker) DO UPDATE SET
          is_removed = true,
          updated_at = now()
      `,
      [ticker],
    );
    await client.query(
      `INSERT INTO managed_stock_events (ticker, action, changes)
       VALUES ($1, 'remove', '{}'::jsonb)`,
      [ticker],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getManagedStock(ticker);
}

const CLEARABLE_COLUMNS: Record<StockAnalyticsClearField, string> = {
  sector: 'sector',
  region: 'region',
  quality: 'quality',
  moat: 'moat',
  score: 'score',
  fairValue: 'fair_value',
  buyBelow: 'buy_below',
  holdBelow: 'hold_below',
  sellAbove: 'sell_above',
  expectedGrowth: 'expected_growth',
  thesis: 'thesis',
  risk: 'risk',
  notes: 'notes',
  researchSource: 'research_source',
  researchDate: 'research_date',
};

export async function clearManagedStockFields(
  ticker: string,
  fields: StockAnalyticsClearField[],
) {
  if (!fields.length) return getManagedStock(ticker);
  const sql = requiredDatabase();
  await ensureManagedStocksSchema(sql);
  const unique = [...new Set(fields)];
  const assignments = unique.map((field) => `${CLEARABLE_COLUMNS[field]} = NULL`);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const result = await client.query(
      `UPDATE managed_stocks SET ${assignments.join(', ')}, updated_at = now()
       WHERE ticker = $1 RETURNING ticker`,
      [ticker],
    );
    if (!result.rowCount) throw new Error(`No managed record exists for ${ticker}`);
    await client.query(
      `INSERT INTO managed_stock_events (ticker, action, changes)
       VALUES ($1, 'update', $2::jsonb)`,
      [ticker, JSON.stringify({ clearedFields: unique })],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getManagedStock(ticker);
}

export async function updateManagedStockEvaluation(
  ticker: string,
  input: {
    scores?: StockEvaluationScores;
    clearScores?: Array<keyof StockEvaluationScores>;
    thesis?: string;
    risk?: string;
    researchSource?: string;
    researchDate?: string;
  },
) {
  const sql = requiredDatabase();
  await ensureManagedStocksSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const existingResult = await client.query<{
      evaluation_scores: StockEvaluationScores | null;
    }>(
      'SELECT evaluation_scores FROM managed_stocks WHERE ticker = $1 FOR UPDATE',
      [ticker],
    );
    if (!existingResult.rows[0]) throw new Error(`No managed record exists for ${ticker}`);
    const scores = {
      ...existingResult.rows[0].evaluation_scores,
      ...input.scores,
    };
    for (const key of input.clearScores ?? []) delete scores[key];
    const values = Object.values(scores);
    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    await client.query(
      `UPDATE managed_stocks SET
         evaluation_scores = $2::jsonb,
         evaluation_average = $3,
         thesis = COALESCE($4, thesis),
         risk = COALESCE($5, risk),
         research_source = COALESCE($6, research_source),
         research_date = COALESCE($7::date, research_date),
         updated_at = now()
       WHERE ticker = $1`,
      [
        ticker,
        JSON.stringify(scores),
        average,
        input.thesis ?? null,
        input.risk ?? null,
        input.researchSource ?? null,
        input.researchDate ?? null,
      ],
    );
    await client.query(
      `INSERT INTO managed_stock_events (ticker, action, changes)
       VALUES ($1, 'update', $2::jsonb)`,
      [
        ticker,
        JSON.stringify({
          evaluationScores: input.scores,
          clearedEvaluationScores: input.clearScores,
          evaluationAverage: average,
          thesis: input.thesis,
          risk: input.risk,
          researchSource: input.researchSource,
          researchDate: input.researchDate,
        }),
      ],
    );
    await client.query('COMMIT');
    return getManagedStock(ticker);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
