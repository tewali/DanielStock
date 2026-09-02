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

export async function refreshCurrentMarketPrices() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is not configured');

  const managed = await listManagedStocks(false);
  const targets = new Map<string, MarketTarget>(
    DEFAULT_MARKET_TARGETS.map((target) => [target.ticker, target]),
  );
  for (const stock of managed) {
    if (!stock.currency) continue;
    targets.set(stock.ticker, {
      ticker: stock.ticker,
      currency: stock.currency,
      basePrice: stock.currentMarketPrice ?? 0,
    });
  }

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
  const skipped: Array<{ ticker: string; reason: string }> = [];
  let eurusd: number | null = null;

  for (const quote of result.quotes) {
    if (quote.ticker === 'EURUSD=X') {
      if (quote.price > 0.5 && quote.price < 2) eurusd = quote.price;
      continue;
    }
    const target = targets.get(quote.ticker);
    if (!target) continue;
    if (quote.currency !== target.currency) {
      skipped.push({ ticker: quote.ticker, reason: 'currency mismatch' });
      continue;
    }
    const reference = previousPrices[quote.ticker] ?? target.basePrice;
    if (
      reference > 0 &&
      Math.abs(quote.price / reference - 1) > MAX_DAILY_DEVIATION
    ) {
      skipped.push({ ticker: quote.ticker, reason: 'implausible price jump' });
      continue;
    }
    accepted[quote.ticker] = quote.price;
  }

  const refreshedAt = new Date().toISOString();
  if (state) {
    const nextState: PortfolioState = {
      ...state,
      prices: { ...previousPrices, ...accepted },
      quoteMeta: { at: refreshedAt, n: Object.keys(accepted).length },
    };
    if (eurusd !== null) {
      nextState.params = { ...state.params, eurusd };
    }
    await sql.query(
      "UPDATE portfolio_state SET state = $1::jsonb, updated_at = now() WHERE id = 'primary'",
      [JSON.stringify(nextState)],
    );
  }

  return {
    refreshedAt,
    requested: symbols.length,
    updated: Object.keys(accepted).length,
    skipped,
    providerErrors: result.errors,
    portfolioStateUpdated: Boolean(state),
  };
}
