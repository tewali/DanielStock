import type { Pool } from 'pg';
import YahooFinance from 'yahoo-finance2';

import { database } from '@/lib/database';

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const PROVIDER = 'Yahoo Finance';

const YAHOO_SYMBOL_OVERRIDES: Record<string, string> = {
  'BF.B': 'BF-B',
  'BRK.B': 'BRK-B',
  'QTCO.HE': 'QTCOM.HE',
};

function providerSymbol(ticker: string) {
  return YAHOO_SYMBOL_OVERRIDES[ticker] ?? ticker;
}

export type MarketQuote = {
  ticker: string;
  providerSymbol: string;
  price: number;
  currency: string;
  exchange: string | null;
  marketState: string | null;
  delayMinutes: number | null;
  priceAt: string | null;
  fetchedAt: string;
  source: typeof PROVIDER;
};

export type PriceBar = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
};

export type PriceHistory = {
  ticker: string;
  currency: string;
  exchange: string | null;
  source: typeof PROVIDER;
  fetchedAt: string;
  bars: PriceBar[];
};

function normalizedCurrencyAndFactor(currency?: string) {
  if (currency === 'GBp' || currency === 'GBX') {
    return { currency: 'GBP', factor: 0.01 };
  }
  return { currency: currency?.toUpperCase() || '—', factor: 1 };
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function ensureMarketDataSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS market_quotes (
      symbol text PRIMARY KEY,
      provider_symbol text NOT NULL,
      price double precision NOT NULL,
      currency text NOT NULL,
      exchange text,
      market_state text,
      delay_minutes integer,
      price_at timestamptz,
      fetched_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS market_price_history (
      symbol text NOT NULL,
      trading_date date NOT NULL,
      currency text NOT NULL,
      open double precision,
      high double precision,
      low double precision,
      close double precision NOT NULL,
      adjusted_close double precision,
      volume double precision,
      fetched_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (symbol, trading_date)
    );

    CREATE INDEX IF NOT EXISTS market_price_history_symbol_date_idx
      ON market_price_history (symbol, trading_date DESC);
  `);
}

async function saveQuotes(sql: Pool, quotes: MarketQuote[]) {
  await Promise.all(
    quotes.map((quote) =>
      sql.query(
        `
          INSERT INTO market_quotes (
            symbol, provider_symbol, price, currency, exchange, market_state,
            delay_minutes, price_at, fetched_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (symbol) DO UPDATE SET
            provider_symbol = EXCLUDED.provider_symbol,
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            exchange = EXCLUDED.exchange,
            market_state = EXCLUDED.market_state,
            delay_minutes = EXCLUDED.delay_minutes,
            price_at = EXCLUDED.price_at,
            fetched_at = EXCLUDED.fetched_at
        `,
        [
          quote.ticker,
          quote.providerSymbol,
          quote.price,
          quote.currency,
          quote.exchange,
          quote.marketState,
          quote.delayMinutes,
          quote.priceAt,
          quote.fetchedAt,
        ],
      ),
    ),
  );
}

export async function refreshQuotes(symbols: string[]) {
  const unique = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase())),
  ];
  const requestedByProvider = new Map(
    unique.map((ticker) => [providerSymbol(ticker), ticker]),
  );
  const providerSymbols = [...requestedByProvider.keys()];
  const quotes: MarketQuote[] = [];
  const errors: Array<{ ticker: string; error: string }> = [];
  let cacheWarning: string | null = null;

  for (let offset = 0; offset < providerSymbols.length; offset += 40) {
    const batch = providerSymbols.slice(offset, offset + 40);
    try {
      const results = await yahoo.quote(batch);
      const returned = new Set<string>();

      for (const result of results) {
        const returnedSymbol = result.symbol.toUpperCase();
        returned.add(returnedSymbol);
        const ticker =
          requestedByProvider.get(returnedSymbol) ?? returnedSymbol;
        const rawPrice = finite(result.regularMarketPrice);
        if (rawPrice === null || rawPrice <= 0) {
          errors.push({ ticker, error: 'Kein aktueller Kurs verfügbar' });
          continue;
        }

        const normalized = normalizedCurrencyAndFactor(result.currency);
        quotes.push({
          ticker,
          providerSymbol: result.symbol,
          price: rawPrice * normalized.factor,
          currency: normalized.currency,
          exchange: result.fullExchangeName || result.exchange || null,
          marketState: result.marketState || null,
          delayMinutes: finite(result.exchangeDataDelayedBy),
          priceAt: result.regularMarketTime?.toISOString() ?? null,
          fetchedAt: new Date().toISOString(),
          source: PROVIDER,
        });
      }

      for (const ticker of batch) {
        if (!returned.has(ticker)) {
          errors.push({
            ticker: requestedByProvider.get(ticker) ?? ticker,
            error: 'Symbol nicht gefunden',
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Yahoo Finance ist nicht erreichbar';
      errors.push(
        ...batch.map((ticker) => ({
          ticker: requestedByProvider.get(ticker) ?? ticker,
          error: message,
        })),
      );
    }
  }

  const sql = database();
  if (sql && quotes.length) {
    try {
      await ensureMarketDataSchema(sql);
      await saveQuotes(sql, quotes);
    } catch {
      cacheWarning =
        'Kurse konnten nicht in PostgreSQL zwischengespeichert werden';
    }
  }

  return { quotes, errors, cacheWarning };
}

function rowToBar(row: {
  trading_date: string | Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjusted_close: number | null;
  volume: number | null;
}): PriceBar {
  const date =
    row.trading_date instanceof Date
      ? [
          row.trading_date.getFullYear(),
          String(row.trading_date.getMonth() + 1).padStart(2, '0'),
          String(row.trading_date.getDate()).padStart(2, '0'),
        ].join('-')
      : String(row.trading_date).slice(0, 10);
  return {
    date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    adjustedClose: row.adjusted_close,
    volume: row.volume,
  };
}

async function cachedHistory(sql: Pool, ticker: string) {
  await ensureMarketDataSchema(sql);
  const result = await sql.query<{
    trading_date: string | Date;
    currency: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    adjusted_close: number | null;
    volume: number | null;
    fetched_at: Date;
  }>(
    `
      SELECT trading_date, currency, open, high, low, close, adjusted_close,
             volume, fetched_at
      FROM market_price_history
      WHERE symbol = $1
      ORDER BY trading_date ASC
    `,
    [ticker],
  );

  if (!result.rows.length) return null;
  const fetchedAt = result.rows.reduce(
    (latest, row) => (row.fetched_at > latest ? row.fetched_at : latest),
    result.rows[0].fetched_at,
  );
  return {
    currency: result.rows[0].currency,
    fetchedAt,
    bars: result.rows.map(rowToBar),
  };
}

async function fetchHistory(ticker: string): Promise<PriceHistory> {
  const period1 = new Date();
  period1.setUTCFullYear(period1.getUTCFullYear() - 1);
  const result = await yahoo.chart(providerSymbol(ticker), {
    period1,
    interval: '1d',
    return: 'array',
  });
  const normalized = normalizedCurrencyAndFactor(result.meta.currency);
  const bars = result.quotes.flatMap((quote) => {
    const close = finite(quote.close);
    if (close === null) return [];
    return [
      {
        date: quote.date.toISOString().slice(0, 10),
        open:
          finite(quote.open) === null
            ? null
            : finite(quote.open)! * normalized.factor,
        high:
          finite(quote.high) === null
            ? null
            : finite(quote.high)! * normalized.factor,
        low:
          finite(quote.low) === null
            ? null
            : finite(quote.low)! * normalized.factor,
        close: close * normalized.factor,
        adjustedClose:
          finite(quote.adjclose) === null
            ? null
            : finite(quote.adjclose)! * normalized.factor,
        volume: finite(quote.volume),
      },
    ];
  });

  return {
    ticker,
    currency: normalized.currency,
    exchange: result.meta.fullExchangeName || result.meta.exchangeName || null,
    source: PROVIDER,
    fetchedAt: new Date().toISOString(),
    bars,
  };
}

async function saveHistory(sql: Pool, history: PriceHistory) {
  if (!history.bars.length) return;
  await ensureMarketDataSchema(sql);
  await sql.query(
    `
      INSERT INTO market_price_history (
        symbol, trading_date, currency, open, high, low, close,
        adjusted_close, volume, fetched_at
      )
      SELECT $1, x.date, $2, x.open, x.high, x.low, x.close,
             x."adjustedClose", x.volume, $3
      FROM jsonb_to_recordset($4::jsonb) AS x(
        date date,
        open double precision,
        high double precision,
        low double precision,
        close double precision,
        "adjustedClose" double precision,
        volume double precision
      )
      ON CONFLICT (symbol, trading_date) DO UPDATE SET
        currency = EXCLUDED.currency,
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        adjusted_close = EXCLUDED.adjusted_close,
        volume = EXCLUDED.volume,
        fetched_at = EXCLUDED.fetched_at
    `,
    [
      history.ticker,
      history.currency,
      history.fetchedAt,
      JSON.stringify(history.bars),
    ],
  );
}

export async function getPriceHistory(ticker: string): Promise<PriceHistory> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const sql = database();
  let cached = null;
  if (sql) {
    try {
      cached = await cachedHistory(sql, normalizedTicker);
    } catch {
      cached = null;
    }
  }
  const fresh =
    cached && Date.now() - cached.fetchedAt.getTime() < 12 * 60 * 60 * 1000;

  if (cached && fresh) {
    return {
      ticker: normalizedTicker,
      currency: cached.currency,
      exchange: null,
      source: PROVIDER,
      fetchedAt: cached.fetchedAt.toISOString(),
      bars: cached.bars,
    };
  }

  try {
    const history = await fetchHistory(normalizedTicker);
    if (sql) {
      try {
        await saveHistory(sql, history);
      } catch {
        // The chart remains usable when PostgreSQL is temporarily unavailable.
      }
    }
    return history;
  } catch (error) {
    if (cached) {
      return {
        ticker: normalizedTicker,
        currency: cached.currency,
        exchange: null,
        source: PROVIDER,
        fetchedAt: cached.fetchedAt.toISOString(),
        bars: cached.bars,
      };
    }
    throw error;
  }
}
