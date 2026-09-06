import { z } from 'zod';
import { database } from '@/lib/database';

const date = z.iso.date();
const currency = z.string().regex(/^[A-Z]{3}$/);
const common = {
  recordKey: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .describe('Stable source record ID; reuse for corrections'),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.^=-]{1,24}$/),
  date,
  sourceName: z.string().trim().min(1).max(240),
  sourceUrl: z.url().refine((value) => /^https?:\/\//.test(value)),
  notes: z.string().max(4000).optional(),
};
export const companyHistorySchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        ...common,
        kind: z.literal('buyback'),
        periodStart: date,
        periodType: z.enum(['quarterly', 'annual', 'event']),
        amount: z.number().nonnegative(),
        currency,
        sharesRepurchased: z.number().nonnegative().optional(),
        programName: z.string().max(240).optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal('insider'),
        insiderName: z.string().trim().min(1).max(240),
        role: z.string().max(240).optional(),
        direction: z.enum(['buy', 'sell']),
        shares: z.number().positive(),
        transactionValue: z.number().nonnegative().optional(),
        currency,
        transactionType: z.enum([
          'open_market',
          'exercise',
          'planned',
          'other',
        ]),
        filedAt: date.optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal('product'),
        product: z.string().trim().min(1).max(240),
        periodStart: date,
        periodType: z.enum(['quarterly', 'annual']),
        market: z.string().trim().min(1).max(240),
        region: z.string().trim().min(1).max(120),
        basis: z.enum(['revenue', 'units', 'users']),
        evidence: z.enum(['reported', 'estimate', 'assumption']),
        marketShare: z.number().min(0).max(1).optional(),
        growth: z.number().min(-1).optional(),
        growthComparison: z.enum(['yoy', 'qoq']).optional(),
        revenue: z.number().nonnegative().optional(),
        currency: currency.optional(),
        units: z.number().nonnegative().optional(),
      })
      .strict(),
  ])
  .superRefine((record, ctx) => {
    if ('periodStart' in record && record.periodStart > record.date)
      ctx.addIssue({
        code: 'custom',
        message: 'periodStart must precede date',
      });
    if (record.kind === 'product') {
      if (
        record.marketShare === undefined &&
        record.growth === undefined &&
        record.revenue === undefined &&
        record.units === undefined
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Provide at least one product metric',
        });
      if (record.growth !== undefined && !record.growthComparison)
        ctx.addIssue({
          code: 'custom',
          message: 'growth requires growthComparison',
        });
      if (record.revenue !== undefined && !record.currency)
        ctx.addIssue({ code: 'custom', message: 'revenue requires currency' });
    }
  });

export const companyHistoryFilters = z
  .object({
    ticker: common.ticker,
    kind: z.enum(['buyback', 'insider', 'product']).optional(),
    from: date.optional(),
    to: date.optional(),
    includeRevisions: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(100),
    offset: z.number().int().min(0).default(0),
  })
  .strict();

const schema = `CREATE TABLE IF NOT EXISTS company_history (
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
  ON company_history(portfolio_id,ticker,kind,record_key,revision DESC);`;

async function db() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for company history');
  await sql.query(schema);
  return sql;
}

export async function uploadCompanyHistory(input: unknown) {
  const records = z.array(companyHistorySchema).min(1).max(500).parse(input);
  const keys = records.map((r) => `${r.ticker}:${r.kind}:${r.recordKey}`);
  if (new Set(keys).size !== keys.length)
    throw new Error('Duplicate record keys in batch');
  const sql = await db();
  const client = await sql.connect();
  let written = 0;
  try {
    await client.query('BEGIN');
    // Serialize imports so identical concurrent uploads cannot create duplicates.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('company_history:primary'))",
    );
    for (const record of records) {
      const latest = await client.query(
        `SELECT data = $4::jsonb AS identical FROM company_history
        WHERE portfolio_id='primary' AND ticker=$1 AND kind=$2 AND record_key=$3 ORDER BY revision DESC LIMIT 1`,
        [record.ticker, record.kind, record.recordKey, JSON.stringify(record)],
      );
      if (latest.rows[0]?.identical) continue;
      await client.query(
        `INSERT INTO company_history(ticker,kind,record_key,record_date,data)
        VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [
          record.ticker,
          record.kind,
          record.recordKey,
          record.date,
          JSON.stringify(record),
        ],
      );
      written++;
    }
    await client.query('COMMIT');
    return { written, unchanged: records.length - written };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getCompanyHistory(
  input: z.input<typeof companyHistoryFilters>,
) {
  const filters = companyHistoryFilters.parse(input);
  if (filters.from && filters.to && filters.from > filters.to)
    throw new Error('from must precede to');
  const sql = await db();
  const result = await sql.query(
    `WITH versions AS (
    SELECT *, row_number() OVER (PARTITION BY kind,record_key ORDER BY revision DESC) AS version_rank
    FROM company_history WHERE portfolio_id='primary' AND ticker=$1
  ) SELECT data, revision::text, created_at FROM versions
    WHERE ($2::text IS NULL OR kind=$2) AND ($3::date IS NULL OR record_date >= $3)
      AND ($4::date IS NULL OR record_date <= $4) AND ($5 OR version_rank=1)
    ORDER BY record_date DESC,revision DESC LIMIT $6 OFFSET $7`,
    [
      filters.ticker,
      filters.kind ?? null,
      filters.from ?? null,
      filters.to ?? null,
      filters.includeRevisions,
      filters.limit + 1,
      filters.offset,
    ],
  );
  return {
    ticker: filters.ticker,
    records: result.rows
      .slice(0, filters.limit)
      .map((row) => ({
        ...row.data,
        revision: row.revision,
        importedAt: row.created_at,
      })),
    nextOffset:
      result.rows.length > filters.limit
        ? filters.offset + filters.limit
        : null,
  };
}
