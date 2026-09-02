import type { Pool } from 'pg';

import { database } from '@/lib/database';
import {
  DEFAULT_MARKET_TARGETS,
  type MarketTarget,
} from '@/lib/default-market-targets';
import { listManagedStocks } from '@/lib/managed-stocks';
import { refreshQuotes } from '@/lib/market-data';

const MAX_DAILY_DEVIATION = 0.35;

type PortfolioState = {
  prices?: Record<string, number>;
  params?: Record<string, number>;
  quoteMeta?: { at: string; n: number } | null;
  [key: string]: unknown;
};

type RefreshTrigger = 'cron' | 'retry';
type ItemStatus = 'updated' | 'failed' | 'skipped';

type RefreshItem = {
  ticker: string;
  status: ItemStatus;
  reason: string | null;
  price: number | null;
  currency: string | null;
};

export type RefreshRun = {
  id: number;
  trigger: RefreshTrigger;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  requested: number;
  updated: number;
  failed: number;
  skipped: number;
  error: string | null;
  items: RefreshItem[];
};

export async function ensureMarketRefreshSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS market_refresh_runs (
      id bigserial PRIMARY KEY,
      trigger text NOT NULL CHECK (trigger IN ('cron', 'retry')),
      status text NOT NULL CHECK (status IN ('running', 'success', 'failed')),
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz,
      requested integer NOT NULL DEFAULT 0,
      updated integer NOT NULL DEFAULT 0,
      failed integer NOT NULL DEFAULT 0,
      skipped integer NOT NULL DEFAULT 0,
      error text
    );

    CREATE TABLE IF NOT EXISTS market_refresh_items (
      id bigserial PRIMARY KEY,
      run_id bigint NOT NULL REFERENCES market_refresh_runs(id) ON DELETE CASCADE,
      ticker text NOT NULL,
      status text NOT NULL CHECK (status IN ('updated', 'failed', 'skipped')),
      reason text,
      price double precision,
      currency text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (run_id, ticker)
    );

    CREATE INDEX IF NOT EXISTS market_refresh_runs_finished_idx
      ON market_refresh_runs (finished_at DESC);
    CREATE INDEX IF NOT EXISTS market_refresh_items_run_idx
      ON market_refresh_items (run_id, status, ticker);
  `);
}

async function marketTargets() {
  const targets = new Map<string, MarketTarget>(
    DEFAULT_MARKET_TARGETS.map((target) => [target.ticker, target]),
  );
  const managed = await listManagedStocks(false);
  for (const stock of managed) {
    if (!stock.currency) continue;
    targets.set(stock.ticker, {
      ticker: stock.ticker,
      currency: stock.currency,
      basePrice: stock.currentMarketPrice ?? 0,
    });
  }
  return targets;
}

function runFromRow(row: {
  id: string | number;
  trigger: RefreshTrigger;
  status: 'running' | 'success' | 'failed';
  started_at: Date | string;
  finished_at: Date | string | null;
  requested: number;
  updated: number;
  failed: number;
  skipped: number;
  error: string | null;
  items: RefreshItem[] | null;
}): RefreshRun {
  return {
    id: Number(row.id),
    trigger: row.trigger,
    status: row.status,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at
      ? new Date(row.finished_at).toISOString()
      : null,
    requested: row.requested,
    updated: row.updated,
    failed: row.failed,
    skipped: row.skipped,
    error: row.error,
    items: row.items ?? [],
  };
}

export async function getMarketRefreshHistory(limit = 8) {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureMarketRefreshSchema(sql);
  const result = await sql.query(
    `
      SELECT r.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'ticker', i.ticker,
              'status', i.status,
              'reason', i.reason,
              'price', i.price,
              'currency', i.currency
            ) ORDER BY i.status, i.ticker
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM market_refresh_runs r
      LEFT JOIN market_refresh_items i ON i.run_id = r.id
      GROUP BY r.id
      ORDER BY r.started_at DESC
      LIMIT $1
    `,
    [limit],
  );
  const runs = result.rows.map(runFromRow);
  const lastAutomatic =
    runs.find(
      (run) => run.trigger === 'cron' && run.status === 'success',
    ) ?? null;
  if (lastAutomatic || runs.length < limit) return { lastAutomatic, runs };

  const automaticResult = await sql.query(
    `
      SELECT r.*, '[]'::jsonb AS items
      FROM market_refresh_runs r
      WHERE r.trigger = 'cron' AND r.status = 'success'
      ORDER BY r.finished_at DESC
      LIMIT 1
    `,
  );
  return {
    lastAutomatic: automaticResult.rows[0]
      ? runFromRow(automaticResult.rows[0])
      : null,
    runs,
  };
}

async function saveItems(sql: Pool, runId: number, items: RefreshItem[]) {
  if (!items.length) return;
  await Promise.all(
    items.map((item) =>
      sql.query(
        `
          INSERT INTO market_refresh_items (
            run_id, ticker, status, reason, price, currency
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          runId,
          item.ticker,
          item.status,
          item.reason,
          item.price,
          item.currency,
        ],
      ),
    ),
  );
}

export async function refreshCurrentMarketPrices(options?: {
  trigger?: RefreshTrigger;
  symbols?: string[];
}) {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureMarketRefreshSchema(sql);
  const trigger = options?.trigger ?? 'cron';
  const startResult = await sql.query<{ id: string }>(
    `INSERT INTO market_refresh_runs (trigger, status)
     VALUES ($1, 'running') RETURNING id`,
    [trigger],
  );
  const runId = Number(startResult.rows[0].id);

  try {
    const allTargets = await marketTargets();
    const requestedSymbols = options?.symbols
      ? [...new Set(options.symbols.map((ticker) => ticker.toUpperCase()))]
      : [...allTargets.keys()];
    const targets = new Map(
      requestedSymbols
        .map((ticker) => [ticker, allTargets.get(ticker)] as const)
        .filter((entry): entry is [string, MarketTarget] => Boolean(entry[1])),
    );
    if (!targets.size) throw new Error('Keine aktiven Titel für diesen Lauf');
    const symbols = [...targets.keys(), 'EURUSD=X'];
    const result = await refreshQuotes(symbols);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS portfolio_state (
        id text PRIMARY KEY,
        state jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const stateResult = await sql.query<{ state: PortfolioState }>(
      "SELECT state FROM portfolio_state WHERE id = 'primary' LIMIT 1",
    );
    const state = stateResult.rows[0]?.state;
    const previousPrices = state?.prices ?? {};
    const accepted: Record<string, number> = {};
    const items = new Map<string, RefreshItem>();
    let eurusd: number | null = null;

    for (const quote of result.quotes) {
      if (quote.ticker === 'EURUSD=X') {
        if (quote.price > 0.5 && quote.price < 2) eurusd = quote.price;
        continue;
      }
      const target = targets.get(quote.ticker);
      if (!target) continue;
      if (quote.currency !== target.currency) {
        items.set(quote.ticker, {
          ticker: quote.ticker,
          status: 'skipped',
          reason: `Währung ${quote.currency} statt ${target.currency}`,
          price: quote.price,
          currency: quote.currency,
        });
        continue;
      }
      const reference = previousPrices[quote.ticker] ?? target.basePrice;
      if (
        reference > 0 &&
        Math.abs(quote.price / reference - 1) > MAX_DAILY_DEVIATION
      ) {
        items.set(quote.ticker, {
          ticker: quote.ticker,
          status: 'skipped',
          reason: `Kurssprung über 35 % gegenüber ${reference.toFixed(2)}`,
          price: quote.price,
          currency: quote.currency,
        });
        continue;
      }
      accepted[quote.ticker] = quote.price;
      items.set(quote.ticker, {
        ticker: quote.ticker,
        status: 'updated',
        reason: null,
        price: quote.price,
        currency: quote.currency,
      });
    }

    for (const providerError of result.errors) {
      if (providerError.ticker === 'EURUSD=X') continue;
      items.set(providerError.ticker, {
        ticker: providerError.ticker,
        status: 'failed',
        reason: providerError.error,
        price: null,
        currency: null,
      });
    }
    for (const ticker of targets.keys()) {
      if (!items.has(ticker)) {
        items.set(ticker, {
          ticker,
          status: 'failed',
          reason: 'Keine Antwort vom Kursdienst',
          price: null,
          currency: null,
        });
      }
    }

    const refreshedAt = new Date().toISOString();
    if (state) {
      const nextState: PortfolioState = {
        ...state,
        prices: { ...previousPrices, ...accepted },
        quoteMeta: { at: refreshedAt, n: Object.keys(accepted).length },
      };
      if (eurusd !== null) nextState.params = { ...state.params, eurusd };
      await sql.query(
        "UPDATE portfolio_state SET state = $1::jsonb, updated_at = now() WHERE id = 'primary'",
        [JSON.stringify(nextState)],
      );
    }

    const itemList = [...items.values()];
    await saveItems(sql, runId, itemList);
    const updated = itemList.filter((item) => item.status === 'updated').length;
    const failed = itemList.filter((item) => item.status === 'failed').length;
    const skipped = itemList.filter((item) => item.status === 'skipped').length;
    await sql.query(
      `
        UPDATE market_refresh_runs SET
          status = 'success', finished_at = now(), requested = $2,
          updated = $3, failed = $4, skipped = $5
        WHERE id = $1
      `,
      [runId, targets.size, updated, failed, skipped],
    );

    return {
      runId,
      refreshedAt,
      requested: targets.size,
      updated,
      failed,
      skipped,
      portfolioStateUpdated: Boolean(state),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Scheduled market refresh failed';
    await sql.query(
      `UPDATE market_refresh_runs
       SET status = 'failed', finished_at = now(), error = $2
       WHERE id = $1`,
      [runId, message],
    );
    throw error;
  }
}

export async function retryMarketRefresh(runId: number) {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureMarketRefreshSchema(sql);
  const result = await sql.query<{ ticker: string }>(
    `
      SELECT ticker FROM market_refresh_items
      WHERE run_id = $1 AND status = 'failed'
      ORDER BY ticker
    `,
    [runId],
  );
  const symbols = result.rows.map((row) => row.ticker);
  if (!symbols.length) throw new Error('Dieser Lauf hat keine fehlgeschlagenen Titel');
  return refreshCurrentMarketPrices({ trigger: 'retry', symbols });
}
