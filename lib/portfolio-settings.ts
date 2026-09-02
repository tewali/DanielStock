import type { Pool } from 'pg';

import { database } from '@/lib/database';
import { listManagedStocks } from '@/lib/managed-stocks';
import portfolioArtifactData from '@/lib/portfolio-artifact-data.json';
import { listPositions } from '@/lib/portfolio-ledger';

const PORTFOLIO_ID = 'primary';

export type PurchasePlanPriority = 'abstand' | 'qualitaet' | 'konfidenz';

export type PortfolioParameters = {
  eurusd: number;
  optionsCash: number;
  cash: number;
  minQ: number;
  minMoat: number;
  maxWatch: number;
  t90: number;
  t85: number;
  t80: number;
  t70: number;
  tRest: number;
  dayLimit: number;
  reserve: number;
  trHigh: number;
  trMid: number;
  trLow: number;
  maxBuys: number;
  minOrder: number;
};

type PortfolioState = {
  growth?: Record<string, number>;
  prices?: Record<string, number>;
  mos?: Record<string, number>;
  shock?: number;
  priority?: PurchasePlanPriority;
  quoteMeta?: { at: string; n: number } | null;
  params?: Partial<PortfolioParameters>;
  [key: string]: unknown;
};

export const DEFAULT_PORTFOLIO_PARAMETERS: PortfolioParameters = {
  eurusd: portfolioArtifactData.rules['EUR je USD'],
  optionsCash: portfolioArtifactData.rules['Options-Cash EUR'],
  cash: portfolioArtifactData.planParams.cash,
  minQ: portfolioArtifactData.rules['Mindest-Qualität'],
  minMoat: portfolioArtifactData.rules['Mindest-Moat'],
  maxWatch: portfolioArtifactData.rules['Maximale Watchlist'],
  t90: portfolioArtifactData.rules['Max-Gewicht Qualität ≥90'],
  t85: portfolioArtifactData.rules['Max-Gewicht Qualität ≥85'],
  t80: portfolioArtifactData.rules['Max-Gewicht Qualität ≥80'],
  t70: portfolioArtifactData.rules['Max-Gewicht Qualität ≥70'],
  tRest: portfolioArtifactData.rules['Max-Gewicht sonst'],
  dayLimit: portfolioArtifactData.planParams.dayBudgetPct,
  reserve: portfolioArtifactData.planParams.reserve,
  trHigh: portfolioArtifactData.planParams.trHigh,
  trMid: portfolioArtifactData.planParams.trMid,
  trLow: portfolioArtifactData.planParams.trLow,
  maxBuys: portfolioArtifactData.planParams.maxBuys,
  minOrder: portfolioArtifactData.planParams.minOrder,
};

function requiredDatabase() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for portfolio settings');
  return sql;
}

export async function ensurePortfolioSettingsSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS portfolio_state (
      id text PRIMARY KEY,
      state jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS portfolio_state_events (
      id bigserial PRIMARY KEY,
      portfolio_id text NOT NULL,
      changes jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS portfolio_state_events_date_idx
      ON portfolio_state_events (portfolio_id, created_at DESC);
  `);
}

async function readState(sql: Pool) {
  await ensurePortfolioSettingsSchema(sql);
  const result = await sql.query<{ state: PortfolioState; updated_at: Date }>(
    'SELECT state, updated_at FROM portfolio_state WHERE id = $1',
    [PORTFOLIO_ID],
  );
  return result.rows[0] ?? null;
}

function publicSettings(state: PortfolioState | null, updatedAt: Date | null) {
  return {
    parameters: { ...DEFAULT_PORTFOLIO_PARAMETERS, ...state?.params },
    priority: state?.priority ?? ('abstand' as const),
    shockPercent: state?.shock ?? 0,
    growthOverrides: state?.growth ?? {},
    marginOfSafetyOverrides: state?.mos ?? {},
    quoteMeta: state?.quoteMeta ?? null,
    updatedAt: updatedAt?.toISOString() ?? null,
    marketPriceOverridesExcluded: true,
  };
}

export async function getPortfolioSettings() {
  const row = await readState(requiredDatabase());
  return publicSettings(row?.state ?? null, row?.updated_at ?? null);
}

export async function updatePortfolioSettings(input: {
  parameters?: Partial<PortfolioParameters>;
  priority?: PurchasePlanPriority;
  shockPercent?: number;
  growthOverrides?: Record<string, number>;
  marginOfSafetyOverrides?: Record<string, number>;
  clearGrowthOverrides?: string[];
  clearMarginOfSafetyOverrides?: string[];
  resetParameters?: Array<keyof PortfolioParameters>;
}) {
  const sql = requiredDatabase();
  await ensurePortfolioSettingsSchema(sql);
  const client = await sql.connect();
  await client.query('BEGIN');
  try {
    const currentResult = await client.query<{ state: PortfolioState }>(
      'SELECT state FROM portfolio_state WHERE id = $1 FOR UPDATE',
      [PORTFOLIO_ID],
    );
    const current = currentResult.rows[0]?.state ?? {};
    const parameters = {
      ...DEFAULT_PORTFOLIO_PARAMETERS,
      ...current.params,
      ...input.parameters,
    };
    for (const key of input.resetParameters ?? []) {
      parameters[key] = DEFAULT_PORTFOLIO_PARAMETERS[key];
    }
    const growth = { ...current.growth, ...input.growthOverrides };
    for (const ticker of input.clearGrowthOverrides ?? []) delete growth[ticker.toUpperCase()];
    const margins = { ...current.mos, ...input.marginOfSafetyOverrides };
    for (const ticker of input.clearMarginOfSafetyOverrides ?? []) delete margins[ticker.toUpperCase()];
    const next: PortfolioState = {
      ...current,
      params: parameters,
      priority: input.priority ?? current.priority,
      shock: input.shockPercent ?? current.shock,
      growth,
      mos: margins,
    };
    const saved = await client.query<{ updated_at: Date }>(
      `INSERT INTO portfolio_state (id, state, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()
       RETURNING updated_at`,
      [PORTFOLIO_ID, JSON.stringify(next)],
    );
    await client.query(
      `INSERT INTO portfolio_state_events (portfolio_id, changes)
       VALUES ($1, $2::jsonb)`,
      [PORTFOLIO_ID, JSON.stringify(input)],
    );
    await client.query('COMMIT');
    return publicSettings(next, saved.rows[0].updated_at);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function maxWeight(quality: number | undefined, parameters: PortfolioParameters) {
  if (quality === undefined) return parameters.tRest;
  if (quality >= 90) return parameters.t90;
  if (quality >= 85) return parameters.t85;
  if (quality >= 80) return parameters.t80;
  if (quality >= 70) return parameters.t70;
  return parameters.tRest;
}

async function eurRates(sql: Pool, currencies: string[]) {
  const unique = [...new Set(currencies.filter((currency) => currency !== 'EUR'))];
  const rates = new Map<string, number>([['EUR', 1]]);
  if (!unique.length) return rates;
  const result = await sql.query<{ symbol: string; price: number }>(
    'SELECT symbol, price FROM market_quotes WHERE symbol = ANY($1::text[])',
    [unique.map((currency) => `EUR${currency}=X`)],
  );
  for (const row of result.rows) {
    if (row.price > 0) rates.set(row.symbol.slice(3, 6), 1 / row.price);
  }
  return rates;
}

export async function getPurchasePlan(overrides?: {
  shockPercent?: number;
  parameters?: Partial<PortfolioParameters>;
  priority?: PurchasePlanPriority;
  growthOverrides?: Record<string, number>;
  marginOfSafetyOverrides?: Record<string, number>;
}) {
  const [saved, positions] = await Promise.all([
    getPortfolioSettings(),
    listPositions(false),
  ]);
  const stocks = await listManagedStocks(false);
  const parameters = { ...saved.parameters, ...overrides?.parameters };
  const priority = overrides?.priority ?? saved.priority;
  const shockPercent = overrides?.shockPercent ?? saved.shockPercent;
  const growth = { ...saved.growthOverrides, ...overrides?.growthOverrides };
  const margins = {
    ...saved.marginOfSafetyOverrides,
    ...overrides?.marginOfSafetyOverrides,
  };
  const sql = requiredDatabase();
  const rates = await eurRates(sql, positions.map((position) => position.currency));
  const positionMap = new Map(positions.map((position) => [position.ticker, position]));
  const marketValues = new Map<string, number>();
  const missingFxCurrencies = new Set<string>();
  const marketFactor = 1 + shockPercent / 100;
  for (const position of positions) {
    const rate = rates.get(position.currency);
    if (position.marketValue === null || !rate) {
      if (!rate) missingFxCurrencies.add(position.currency);
      continue;
    }
    marketValues.set(position.ticker, position.marketValue * rate * marketFactor);
  }
  const portfolioValueEur = [...marketValues.values()].reduce((sum, value) => sum + value, 0);
  const assetsEur = portfolioValueEur + parameters.cash;
  const candidates = stocks.flatMap((stock) => {
    if (!stock.currentMarketPrice || !stock.marketCurrency) return [];
    const currentPrice = stock.currentMarketPrice * marketFactor;
    const baseGrowth = stock.expectedGrowth;
    const selectedGrowth = growth[stock.ticker] ?? baseGrowth;
    const growthFactor =
      baseGrowth !== undefined && selectedGrowth !== undefined
        ? ((1 + selectedGrowth) / (1 + baseGrowth)) ** 10
        : 1;
    const fairValue = stock.fairValue === undefined ? null : stock.fairValue * growthFactor;
    const buyBelow = margins[stock.ticker] !== undefined && fairValue !== null
      ? fairValue * (1 - margins[stock.ticker])
      : stock.buyBelow === undefined
        ? null
        : stock.buyBelow * growthFactor;
    const sellAbove = stock.sellAbove === undefined ? null : stock.sellAbove * growthFactor;
    const position = positionMap.get(stock.ticker);
    const currentValueEur = marketValues.get(stock.ticker) ?? 0;
    const currentWeight = portfolioValueEur > 0 ? currentValueEur / portfolioValueEur : 0;
    const allowedWeight = maxWeight(stock.quality, parameters);
    const eligible =
      (stock.quality ?? 0) >= parameters.minQ &&
      (stock.moat ?? 0) >= parameters.minMoat;
    let action: 'buy' | 'reduce' | 'sell' | null = null;
    if (position && sellAbove !== null && currentPrice >= sellAbove) action = 'sell';
    else if (position && currentWeight > allowedWeight * 1.25) action = 'reduce';
    else if (eligible && buyBelow !== null && currentPrice <= buyBelow) action = 'buy';
    if (!action) return [];
    const confidence: 'high' | 'medium' | 'low' =
      (stock.quality ?? 0) >= 85
        ? 'high'
        : (stock.quality ?? 0) >= 75
          ? 'medium'
          : 'low';
    const targetWeight = action === 'buy' ? allowedWeight * 0.8 : allowedWeight;
    return [{
      ticker: stock.ticker,
      name: stock.name ?? stock.ticker,
      action,
      confidence,
      currency: stock.marketCurrency,
      currentPrice,
      fairValue,
      buyBelow,
      sellAbove,
      quality: stock.quality ?? null,
      moat: stock.moat ?? null,
      currentWeight,
      targetWeight,
      maxWeight: allowedWeight,
      distanceToBuy: buyBelow ? currentPrice / buyBelow - 1 : null,
      positionQuantity: position?.quantity ?? 0,
      currentValueEur,
    }];
  });
  const confidenceRank = { high: 0, medium: 1, low: 2 } as const;
  const buys = candidates.filter((item) => item.action === 'buy').sort((a, b) => {
    if (priority === 'qualitaet') return (b.quality ?? 0) - (a.quality ?? 0);
    if (priority === 'konfidenz') return confidenceRank[a.confidence] - confidenceRank[b.confidence] || (a.distanceToBuy ?? 9) - (b.distanceToBuy ?? 9);
    return (a.distanceToBuy ?? 9) - (b.distanceToBuy ?? 9);
  });
  const reductions = candidates.filter((item) => item.action !== 'buy');
  const dailyBudgetEur = parameters.cash * parameters.dayLimit;
  let committedEur = 0;
  let orderCount = 0;
  const rows = [...reductions, ...buys].map((item) => {
    if (item.action !== 'buy') {
      return {
        ...item,
        suggestedAmountEur: Math.max(0, item.currentValueEur - item.targetWeight * assetsEur),
        scheduledTodayEur: 0,
      };
    }
    const tranche = item.confidence === 'high' ? parameters.trHigh : item.confidence === 'medium' ? parameters.trMid : parameters.trLow;
    const suggestedAmountEur = Math.min(
      Math.max(0, item.targetWeight * assetsEur - item.currentValueEur),
      tranche * assetsEur,
    );
    const budgetLeft = dailyBudgetEur - committedEur;
    const scheduledTodayEur =
      orderCount < parameters.maxBuys && budgetLeft >= parameters.minOrder
        ? Math.min(suggestedAmountEur, budgetLeft)
        : 0;
    if (scheduledTodayEur >= parameters.minOrder) {
      committedEur += scheduledTodayEur;
      orderCount += 1;
    }
    return { ...item, suggestedAmountEur, scheduledTodayEur };
  });
  const optionsCandidates = rows.flatMap((item) => {
    if (item.currency !== 'USD') return [];
    if (item.action === 'buy' && item.buyBelow && item.buyBelow * 100 / parameters.eurusd <= parameters.optionsCash) {
      return [{ ticker: item.ticker, strategy: 'cash-secured-put', contracts: 1, referenceStrike: Math.floor(item.buyBelow / 5) * 5 }];
    }
    if (item.action === 'reduce' && item.positionQuantity >= 100) {
      return [{ ticker: item.ticker, strategy: 'covered-call', contracts: Math.floor(item.positionQuantity / 100), referenceStrike: item.sellAbove }];
    }
    return [];
  });
  return {
    asOf: new Date().toISOString(),
    scenario: { shockPercent, growthOverrides: growth, marginOfSafetyOverrides: margins },
    parameters,
    priority,
    portfolioValueEur,
    cashEur: parameters.cash,
    assetsEur,
    dailyBudgetEur,
    committedEur,
    orderCount,
    missingFxCurrencies: [...missingFxCurrencies].sort(),
    rows,
    optionsCandidates,
    checks: {
      dailyBudgetRespected: committedEur <= dailyBudgetEur + 0.01,
      maximumBuysRespected: orderCount <= parameters.maxBuys,
      reserveAfterPlanEur: parameters.cash - committedEur,
      requiredReserveEur: parameters.cash * parameters.reserve,
    },
    marketDataSource: 'Yahoo Finance',
  };
}
