CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id uuid PRIMARY KEY,
  portfolio_id text NOT NULL DEFAULT 'primary',
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'opening', 'buy', 'sell', 'dividend', 'fee', 'tax', 'deposit', 'withdrawal'
  )),
  trade_date date NOT NULL,
  ticker text,
  quantity double precision,
  execution_price double precision,
  currency text NOT NULL,
  cash_amount double precision,
  fees double precision NOT NULL DEFAULT 0,
  notes text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS portfolio_transaction_events (
  id bigserial PRIMARY KEY,
  portfolio_id text NOT NULL,
  transaction_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('add', 'update', 'delete', 'import')),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_import_previews (
  id uuid PRIMARY KEY,
  portfolio_id text NOT NULL,
  source_name text,
  rows jsonb NOT NULL,
  errors jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  committed_at timestamptz
);

CREATE TABLE IF NOT EXISTS portfolio_research_notes (
  id bigserial PRIMARY KEY,
  portfolio_id text NOT NULL DEFAULT 'primary',
  ticker text NOT NULL,
  note_kind text NOT NULL CHECK (note_kind IN ('note', 'thesis', 'risk')),
  content text NOT NULL,
  source text,
  research_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_watchlist (
  portfolio_id text NOT NULL DEFAULT 'primary',
  ticker text NOT NULL,
  notes text,
  priority integer CHECK (priority BETWEEN 1 AND 5),
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  PRIMARY KEY (portfolio_id, ticker)
);

CREATE INDEX IF NOT EXISTS portfolio_transactions_portfolio_date_idx
  ON portfolio_transactions (portfolio_id, trade_date, created_at);
CREATE INDEX IF NOT EXISTS portfolio_transactions_portfolio_ticker_idx
  ON portfolio_transactions (portfolio_id, ticker, trade_date);
CREATE INDEX IF NOT EXISTS portfolio_transaction_events_transaction_idx
  ON portfolio_transaction_events (portfolio_id, transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS portfolio_import_previews_expiry_idx
  ON portfolio_import_previews (portfolio_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS portfolio_research_notes_ticker_date_idx
  ON portfolio_research_notes (portfolio_id, ticker, research_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS portfolio_watchlist_active_idx
  ON portfolio_watchlist (portfolio_id, removed_at, priority, ticker);
