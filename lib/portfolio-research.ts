import type { Pool } from 'pg';

import { database } from '@/lib/database';
import { listManagedStocks } from '@/lib/managed-stocks';
import portfolioArtifactData from '@/lib/portfolio-artifact-data.json';

const PORTFOLIO_ID = 'primary';

function requiredDatabase() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for research tools');
  return sql;
}

function dateOnly(value: string | Date) {
  if (typeof value === 'string') return value.slice(0, 10);
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export async function ensurePortfolioResearchSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS portfolio_research_notes (
      id bigserial PRIMARY KEY,
      portfolio_id text NOT NULL DEFAULT 'primary',
      ticker text NOT NULL,
      note_kind text NOT NULL CHECK (note_kind IN ('note', 'thesis', 'risk')),
      content text NOT NULL,
      source text,
      research_date date NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS portfolio_watchlist (
      portfolio_id text NOT NULL DEFAULT 'primary',
      ticker text NOT NULL,
      notes text,
      priority integer CHECK (priority BETWEEN 1 AND 5),
      added_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      removed_at timestamptz,
      PRIMARY KEY (portfolio_id, ticker)
    );

    CREATE INDEX IF NOT EXISTS portfolio_research_notes_ticker_date_idx
      ON portfolio_research_notes (portfolio_id, ticker, research_date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS portfolio_watchlist_active_idx
      ON portfolio_watchlist (portfolio_id, removed_at, priority, ticker);
  `);
  await seedWatchlist(sql);
}

async function seedWatchlist(sql: Pool) {
  const rows = portfolioArtifactData.watch.map((stock) => ({
    ticker: stock.ticker,
    notes: `${stock.name}: ${stock.status}. ${stock.moat}`,
    priority: stock.rank <= 10 ? 1 : stock.rank <= 25 ? 2 : 3,
  }));
  await sql.query(
    `
      INSERT INTO portfolio_watchlist (portfolio_id, ticker, notes, priority)
      SELECT $2, ticker, notes, priority
      FROM jsonb_to_recordset($1::jsonb) AS seed(
        ticker text,
        notes text,
        priority integer
      )
      WHERE true
      ON CONFLICT (portfolio_id, ticker) DO NOTHING
    `,
    [JSON.stringify(rows), PORTFOLIO_ID],
  );
}

export async function addResearchNote(input: {
  ticker: string;
  kind: 'note' | 'thesis' | 'risk';
  content: string;
  source?: string;
  researchDate?: string;
}) {
  const sql = requiredDatabase();
  await ensurePortfolioResearchSchema(sql);
  const result = await sql.query<{
    id: string;
    ticker: string;
    note_kind: 'note' | 'thesis' | 'risk';
    content: string;
    source: string | null;
    research_date: Date | string;
    created_at: Date | string;
  }>(
    `INSERT INTO portfolio_research_notes (
       portfolio_id, ticker, note_kind, content, source, research_date
     ) VALUES ($1, $2, $3, $4, $5, $6::date)
     RETURNING *`,
    [
      PORTFOLIO_ID,
      input.ticker.toUpperCase(),
      input.kind,
      input.content,
      input.source ?? null,
      input.researchDate ?? new Date().toISOString().slice(0, 10),
    ],
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    ticker: row.ticker,
    kind: row.note_kind,
    content: row.content,
    source: row.source,
    researchDate: dateOnly(row.research_date),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listResearchNotes(filters?: {
  ticker?: string;
  kind?: 'note' | 'thesis' | 'risk';
  limit?: number;
}) {
  const sql = requiredDatabase();
  await ensurePortfolioResearchSchema(sql);
  const values: unknown[] = [PORTFOLIO_ID];
  const where = ['portfolio_id = $1'];
  if (filters?.ticker) {
    values.push(filters.ticker.toUpperCase());
    where.push(`ticker = $${values.length}`);
  }
  if (filters?.kind) {
    values.push(filters.kind);
    where.push(`note_kind = $${values.length}`);
  }
  values.push(Math.min(filters?.limit ?? 100, 500));
  const result = await sql.query<{
    id: string;
    ticker: string;
    note_kind: 'note' | 'thesis' | 'risk';
    content: string;
    source: string | null;
    research_date: Date | string;
    created_at: Date | string;
  }>(
    `SELECT * FROM portfolio_research_notes
     WHERE ${where.join(' AND ')}
     ORDER BY research_date DESC, created_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    ticker: row.ticker,
    kind: row.note_kind,
    content: row.content,
    source: row.source,
    researchDate: dateOnly(row.research_date),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function manageWatchlist(input: {
  ticker: string;
  action: 'add' | 'remove';
  notes?: string;
  priority?: number;
}) {
  const sql = requiredDatabase();
  await ensurePortfolioResearchSchema(sql);
  const ticker = input.ticker.toUpperCase();
  if (input.action === 'remove') {
    await sql.query(
      `INSERT INTO portfolio_watchlist (portfolio_id, ticker, removed_at)
       VALUES ($1, $2, now())
       ON CONFLICT (portfolio_id, ticker) DO UPDATE SET
         removed_at = now(), updated_at = now()`,
      [PORTFOLIO_ID, ticker],
    );
  } else {
    await sql.query(
      `INSERT INTO portfolio_watchlist (
         portfolio_id, ticker, notes, priority, removed_at
       ) VALUES ($1, $2, $3, $4, NULL)
       ON CONFLICT (portfolio_id, ticker) DO UPDATE SET
         notes = COALESCE(EXCLUDED.notes, portfolio_watchlist.notes),
         priority = COALESCE(EXCLUDED.priority, portfolio_watchlist.priority),
         removed_at = NULL,
         updated_at = now()`,
      [PORTFOLIO_ID, ticker, input.notes ?? null, input.priority ?? null],
    );
  }
  return getWatchlistItem(ticker);
}

async function getWatchlistItem(ticker: string) {
  const sql = requiredDatabase();
  const result = await sql.query<{
    ticker: string;
    notes: string | null;
    priority: number | null;
    added_at: Date;
    updated_at: Date;
    removed_at: Date | null;
  }>(
    `SELECT * FROM portfolio_watchlist
     WHERE portfolio_id = $1 AND ticker = $2`,
    [PORTFOLIO_ID, ticker],
  );
  const row = result.rows[0];
  return {
    ticker: row.ticker,
    notes: row.notes,
    priority: row.priority,
    isRemoved: Boolean(row.removed_at),
    addedAt: row.added_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listWatchlist(includeRemoved = false) {
  const sql = requiredDatabase();
  await ensurePortfolioResearchSchema(sql);
  const result = await sql.query<{
    ticker: string;
    notes: string | null;
    priority: number | null;
    added_at: Date;
    updated_at: Date;
    removed_at: Date | null;
  }>(
    `SELECT * FROM portfolio_watchlist
     WHERE portfolio_id = $1 AND ($2::boolean OR removed_at IS NULL)
     ORDER BY priority NULLS LAST, ticker`,
    [PORTFOLIO_ID, includeRemoved],
  );
  return result.rows.map((row) => ({
    ticker: row.ticker,
    notes: row.notes,
    priority: row.priority,
    isRemoved: Boolean(row.removed_at),
    addedAt: row.added_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function getInvestmentOpportunities(options?: {
  limit?: number;
  minimumQuality?: number;
  watchlistOnly?: boolean;
}) {
  const [stocks, watchlist] = await Promise.all([
    listManagedStocks(false),
    listWatchlist(false),
  ]);
  const watched = new Set(watchlist.map((item) => item.ticker));
  return stocks
    .filter((stock) => !options?.watchlistOnly || watched.has(stock.ticker))
    .filter((stock) => (stock.quality ?? 0) >= (options?.minimumQuality ?? 0))
    .flatMap((stock) => {
      if (!stock.currentMarketPrice) return [];
      const fairValue = stock.fairValue ?? null;
      const discountToFairValue = fairValue
        ? fairValue / stock.currentMarketPrice - 1
        : null;
      const belowBuyThreshold = stock.buyBelow
        ? stock.currentMarketPrice <= stock.buyBelow
        : null;
      const rankingScore =
        (stock.quality ?? 0) * 0.35 +
        (stock.moat ?? 0) * 0.2 +
        (stock.score ?? 0) * 0.2 +
        Math.max(-50, Math.min(50, (discountToFairValue ?? 0) * 100)) * 0.25;
      return [{
        ticker: stock.ticker,
        name: stock.name ?? stock.ticker,
        currency: stock.marketCurrency ?? stock.currency,
        currentPrice: stock.currentMarketPrice,
        marketPriceAt: stock.marketPriceAt,
        fairValue,
        buyBelow: stock.buyBelow ?? null,
        discountToFairValue,
        belowBuyThreshold,
        quality: stock.quality ?? null,
        moat: stock.moat ?? null,
        score: stock.score ?? null,
        isWatchlisted: watched.has(stock.ticker),
        rankingScore,
        marketDataSource: 'Yahoo Finance' as const,
      }];
    })
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, Math.min(options?.limit ?? 20, 100));
}
