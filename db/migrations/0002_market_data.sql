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
