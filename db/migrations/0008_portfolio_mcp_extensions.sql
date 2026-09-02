CREATE TABLE IF NOT EXISTS portfolio_state_events (
  id bigserial PRIMARY KEY,
  portfolio_id text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_watchlist
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS zone text,
  ADD COLUMN IF NOT EXISTS quality double precision,
  ADD COLUMN IF NOT EXISTS moat_commentary text;

CREATE TABLE IF NOT EXISTS portfolio_watchlist_events (
  id bigserial PRIMARY KEY,
  portfolio_id text NOT NULL,
  ticker text NOT NULL,
  action text NOT NULL CHECK (action IN ('add', 'update', 'remove')),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_state_events_date_idx
  ON portfolio_state_events (portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS portfolio_watchlist_events_ticker_date_idx
  ON portfolio_watchlist_events (portfolio_id, ticker, created_at DESC);
