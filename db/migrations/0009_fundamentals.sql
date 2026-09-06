CREATE TABLE IF NOT EXISTS fundamental_filings (
  id uuid PRIMARY KEY,
  portfolio_id text NOT NULL DEFAULT 'primary',
  source_name text NOT NULL,
  source_url text,
  content_hash text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, content_hash)
);

CREATE TABLE IF NOT EXISTS fundamental_periods (
  id uuid PRIMARY KEY,
  filing_id uuid NOT NULL REFERENCES fundamental_filings(id),
  portfolio_id text NOT NULL DEFAULT 'primary',
  ticker text NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('quarterly', 'annual', 'ttm')),
  fiscal_year integer NOT NULL,
  fiscal_quarter integer CHECK (fiscal_quarter BETWEEN 1 AND 4),
  currency text NOT NULL,
  fact_basis text NOT NULL CHECK (fact_basis IN ('reported', 'manual')),
  source_url text,
  notes text,
  revenue double precision,
  gross_profit double precision,
  operating_income double precision,
  net_income double precision,
  diluted_eps double precision,
  operating_cash_flow double precision,
  capex double precision,
  free_cash_flow double precision,
  gross_margin double precision,
  operating_margin double precision,
  net_margin double precision,
  fcf_margin double precision,
  nopat double precision,
  invested_capital double precision,
  roic double precision,
  cash double precision,
  total_debt double precision,
  net_debt double precision,
  diluted_shares double precision,
  shares_outstanding double precision,
  stock_based_compensation double precision,
  buybacks double precision,
  dividends_paid double precision,
  metric_origins jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fundamental_assumptions (
  id uuid PRIMARY KEY,
  portfolio_id text NOT NULL DEFAULT 'primary',
  ticker text NOT NULL,
  metric text NOT NULL,
  period_end date NOT NULL,
  scenario text NOT NULL CHECK (scenario IN ('base', 'bull', 'bear', 'custom')),
  value double precision NOT NULL,
  currency text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, ticker, metric, period_end, scenario)
);

CREATE TABLE IF NOT EXISTS fundamental_import_previews (
  id uuid PRIMARY KEY,
  portfolio_id text NOT NULL DEFAULT 'primary',
  source_name text NOT NULL,
  source_url text,
  content_hash text NOT NULL,
  rows jsonb NOT NULL,
  errors jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  committed_at timestamptz
);

CREATE INDEX IF NOT EXISTS fundamental_periods_history_idx
  ON fundamental_periods (portfolio_id, ticker, period_type, period_end DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS fundamental_assumptions_history_idx
  ON fundamental_assumptions (portfolio_id, ticker, period_end, scenario);
CREATE INDEX IF NOT EXISTS fundamental_import_previews_expiry_idx
  ON fundamental_import_previews (portfolio_id, expires_at DESC);
