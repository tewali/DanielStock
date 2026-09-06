ALTER TABLE fundamental_filings ADD COLUMN IF NOT EXISTS report_metadata jsonb;
ALTER TABLE fundamental_filings ADD COLUMN IF NOT EXISTS document_pdf bytea;
ALTER TABLE fundamental_filings ADD COLUMN IF NOT EXISTS extracted_text text;
ALTER TABLE fundamental_periods ADD COLUMN IF NOT EXISTS raw_facts jsonb;
ALTER TABLE fundamental_periods ADD COLUMN IF NOT EXISTS normalization_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS fundamental_periods_normalization_idx ON fundamental_periods(filing_id,normalization_hash);
CREATE INDEX IF NOT EXISTS fundamental_filings_ticker_idx ON fundamental_filings((report_metadata->>'ticker'));
