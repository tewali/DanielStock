ALTER TABLE managed_stocks
  ADD COLUMN IF NOT EXISTS evaluation_scores jsonb,
  ADD COLUMN IF NOT EXISTS evaluation_average double precision;
