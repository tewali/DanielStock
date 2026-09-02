import portfolioArtifactData from '@/lib/portfolio-artifact-data.json';

const valuation = new Map(portfolioArtifactData.valuation.map((item) => [item.ticker, item]));
const growing = new Map(portfolioArtifactData.grow.map((item) => [item.ticker, item]));
const growthValuation = new Map(portfolioArtifactData.gcp.map((item) => [item.ticker, item]));
const watchlist = new Map(portfolioArtifactData.watch.map((item) => [item.ticker, item]));

function enrichedStock(stock: (typeof portfolioArtifactData.universe)[number]) {
  return {
    ...stock,
    valuation: valuation.get(stock.ticker) ?? null,
    growing50: growing.get(stock.ticker) ?? null,
    growthValuation: growthValuation.get(stock.ticker) ?? null,
    watchlist: watchlist.get(stock.ticker) ?? null,
  };
}

export function searchScreeningUniverse(options?: {
  query?: string;
  region?: string;
  sector?: string;
  verdict?: string;
  minimumQuality?: number;
  growing50Only?: boolean;
  watchlistOnly?: boolean;
  limit?: number;
}) {
  const query = options?.query?.trim().toLocaleLowerCase('de') ?? '';
  return portfolioArtifactData.universe
    .filter((stock) =>
      !query ||
      stock.ticker.toLocaleLowerCase('de').includes(query) ||
      stock.name.toLocaleLowerCase('de').includes(query),
    )
    .filter((stock) => !options?.region || stock.region === options.region)
    .filter((stock) => !options?.sector || stock.sector === options.sector)
    .filter((stock) => !options?.verdict || stock.verdict === options.verdict)
    .filter((stock) => stock.q >= (options?.minimumQuality ?? 0))
    .filter((stock) => !options?.growing50Only || growing.has(stock.ticker))
    .filter((stock) => !options?.watchlistOnly || watchlist.has(stock.ticker))
    .sort((a, b) => b.q - a.q || a.ticker.localeCompare(b.ticker))
    .slice(0, Math.min(options?.limit ?? 50, 250))
    .map(enrichedStock);
}

export function getScreeningStock(ticker: string) {
  const normalized = ticker.trim().toUpperCase();
  const stock = portfolioArtifactData.universe.find((item) => item.ticker === normalized);
  if (!stock) return null;
  return enrichedStock(stock);
}

export function getScreeningMethodology() {
  return {
    qualityRules: portfolioArtifactData.rules,
    growingCompaniesConcept: portfolioArtifactData.gcConcept,
    watchlistMeta: portfolioArtifactData.watchMeta,
    planLegend: portfolioArtifactData.planLegend,
  };
}
