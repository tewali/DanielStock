CREATE TABLE IF NOT EXISTS company_history (
  revision bigserial PRIMARY KEY,
  portfolio_id text NOT NULL DEFAULT 'primary',
  ticker text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('buyback','insider','product')),
  record_key text NOT NULL,
  record_date date NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_history_lookup_idx
  ON company_history(portfolio_id,ticker,kind,record_key,revision DESC);
