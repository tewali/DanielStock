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
