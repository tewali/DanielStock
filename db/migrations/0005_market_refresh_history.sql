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
