import portfolioArtifactData from '@/lib/portfolio-artifact-data.json';

export type PortfolioArtifactStockSeed = {
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
  research_source: string | null;
  research_date: string | null;
  evaluation_scores: Record<string, number> | null;
  evaluation_average: number | null;
};

const evaluationKeys: Record<string, string> = {
  Markt: 'market',
  Wettbewerb: 'competition',
  Regulierung: 'regulation',
  Bilanz: 'balanceSheet',
  Marge: 'margin',
  ROE: 'roe',
  FCF: 'fcf',
  Management: 'management',
  Eigentümer: 'ownership',
  Kapitalallokation: 'capitalAllocation',
  Geschäftsmodell: 'businessModel',
  Burggraben: 'moat',
  Marke: 'brand',
  Produkt: 'product',
};

function evaluationScores(scores?: Record<string, number>) {
  if (!scores) return null;
  return Object.fromEntries(
    Object.entries(scores).flatMap(([key, value]) => {
      const normalized = evaluationKeys[key];
      return normalized ? [[normalized, value]] : [];
    }),
  );
}

function researchDate(value?: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

const universeByTicker = new Map(
  portfolioArtifactData.universe.map((stock) => [stock.ticker, stock]),
);
const matrix = portfolioArtifactData.matrix as Record<
  string,
  { thesis?: string; risk?: string; date?: string }
>;
const seeds = new Map<string, PortfolioArtifactStockSeed>();

for (const stock of portfolioArtifactData.valuation) {
  const universe = universeByTicker.get(stock.ticker);
  const analysis = matrix[stock.ticker];
  seeds.set(stock.ticker, {
    ticker: stock.ticker,
    name: stock.name,
    currency: stock.ccy,
    sector: universe?.sector ?? null,
    region: universe?.region ?? null,
    quality: stock.quality,
    moat: stock.moat,
    score: stock.score,
    fair_value: stock.fv,
    buy_below: stock.buy,
    hold_below: stock.hold,
    sell_above: stock.sell,
    expected_growth: stock.g,
    thesis: analysis?.thesis ?? null,
    risk: analysis?.risk ?? null,
    research_source: stock.src === '#' ? null : stock.src,
    research_date: researchDate(analysis?.date),
    evaluation_scores: evaluationScores(
      (analysis as { scores?: Record<string, number> } | undefined)?.scores,
    ),
    evaluation_average:
      (analysis as { avg?: number } | undefined)?.avg ?? null,
  });
}

for (const stock of portfolioArtifactData.portfolio) {
  if (seeds.has(stock.ticker)) continue;
  const universe = universeByTicker.get(stock.ticker);
  const analysis = matrix[stock.ticker];
  seeds.set(stock.ticker, {
    ticker: stock.ticker,
    name: stock.name,
    currency: stock.ccy,
    sector: universe?.sector ?? null,
    region: universe?.region ?? null,
    quality: stock.quality,
    moat: null,
    score: null,
    fair_value: null,
    buy_below: null,
    hold_below: null,
    sell_above: null,
    expected_growth: null,
    thesis: analysis?.thesis ?? null,
    risk: analysis?.risk ?? null,
    research_source: null,
    research_date: researchDate(analysis?.date),
    evaluation_scores: evaluationScores(
      (analysis as { scores?: Record<string, number> } | undefined)?.scores,
    ),
    evaluation_average:
      (analysis as { avg?: number } | undefined)?.avg ?? null,
  });
}

export const PORTFOLIO_ARTIFACT_STOCK_SEEDS = [...seeds.values()].sort((a, b) =>
  a.ticker.localeCompare(b.ticker),
);
