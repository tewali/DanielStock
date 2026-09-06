import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { database } from '@/lib/database';
import {
  ensureFundamentalsSchema,
  FUNDAMENTAL_METRICS,
  metricToColumn,
  normalizeImportRow,
} from '@/lib/portfolio-fundamentals';

const ticker = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.^=-]{1,24}$/);
export const filingUploadSchema = z
  .object({
    ticker,
    fiscalYear: z.number().int().min(1900).max(2200),
    fiscalQuarter: z.number().int().min(1).max(4).optional(),
    reportType: z.enum(['quarterly', 'annual']),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    publishedAt: z.iso.date(),
    sourceName: z.string().trim().min(1).max(240),
    sourceUrl: z.url().refine((value) => /^https?:\/\//.test(value)),
    accountingStandard: z.enum(['US_GAAP', 'IFRS', 'other', 'unknown']),
    accessionNumber: z.string().max(240).optional(),
    extractedText: z.string().min(1).max(1_000_000).optional(),
    pdfBase64: z
      .string()
      .min(1)
      .max(7_000_000)
      .optional()
      .describe('Original PDF, base64 encoded, maximum decoded size 5 MB'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.periodStart > value.periodEnd)
      ctx.addIssue({ code: 'custom', message: 'Invalid reporting period' });
    if (value.reportType === 'quarterly' && !value.fiscalQuarter)
      ctx.addIssue({
        code: 'custom',
        message: 'Quarterly reports require fiscalQuarter',
      });
    if (!value.pdfBase64 && !value.extractedText)
      ctx.addIssue({
        code: 'custom',
        message:
          'Provide PDF bytes or extracted report text; a link alone is not an archived report',
      });
  });
export const quarterlySchema = z
  .object({
    filingId: z.uuid(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    cashFlowBasis: z
      .literal('standalone_period')
      .describe(
        'Quarterly cashflows must be standalone quarter values, not cumulative YTD',
      ),
    metrics: z.partialRecord(z.enum(FUNDAMENTAL_METRICS), z.number()),
    rawFacts: z
      .array(
        z
          .object({
            metric: z.enum(FUNDAMENTAL_METRICS),
            originalValue: z.string().min(1).max(240),
            unit: z.string().min(1).max(100),
            locator: z
              .string()
              .min(1)
              .max(500)
              .describe('Page, table, or XBRL concept'),
            transformation: z.string().max(1000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    notes: z.string().max(4000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = Object.keys(value.metrics);
    if (!keys.length)
      ctx.addIssue({ code: 'custom', message: 'Provide metrics' });
    for (const key of keys)
      if (!value.rawFacts.some((f) => f.metric === key))
        ctx.addIssue({
          code: 'custom',
          message: `Missing raw source fact for ${key}`,
        });
  });

export const filingsMigration = `
ALTER TABLE fundamental_filings ADD COLUMN IF NOT EXISTS report_metadata jsonb;
ALTER TABLE fundamental_filings ADD COLUMN IF NOT EXISTS document_pdf bytea;
ALTER TABLE fundamental_filings ADD COLUMN IF NOT EXISTS extracted_text text;
ALTER TABLE fundamental_periods ADD COLUMN IF NOT EXISTS raw_facts jsonb;
ALTER TABLE fundamental_periods ADD COLUMN IF NOT EXISTS normalization_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS fundamental_periods_normalization_idx ON fundamental_periods(filing_id,normalization_hash);
CREATE INDEX IF NOT EXISTS fundamental_filings_ticker_idx ON fundamental_filings((report_metadata->>'ticker'));
`;
async function db() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for filings');
  await ensureFundamentalsSchema(sql);
  await sql.query(filingsMigration);
  return sql;
}

export async function uploadFiling(input: z.input<typeof filingUploadSchema>) {
  const { pdfBase64, extractedText, ...metadata } =
    filingUploadSchema.parse(input);
  let pdf: Buffer | null = null;
  if (pdfBase64) {
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        pdfBase64,
      )
    )
      throw new Error('Invalid base64');
    pdf = Buffer.from(pdfBase64, 'base64');
    if (pdf.length > 5_000_000 || pdf.subarray(0, 5).toString() !== '%PDF-')
      throw new Error('Expected PDF up to 5 MB');
  }
  const hash = createHash('sha256')
    .update(JSON.stringify(metadata))
    .update(extractedText || '')
    .update(pdf || Buffer.alloc(0))
    .digest('hex');
  const sql = await db();
  const result = await sql.query(
    `INSERT INTO fundamental_filings(id,source_name,source_url,content_hash,report_metadata,document_pdf,extracted_text)
    VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7) ON CONFLICT (portfolio_id,content_hash) DO UPDATE SET content_hash=EXCLUDED.content_hash RETURNING id`,
    [
      randomUUID(),
      metadata.sourceName,
      metadata.sourceUrl,
      hash,
      JSON.stringify(metadata),
      pdf,
      extractedText ?? null,
    ],
  );
  return {
    filingId: result.rows[0].id,
    contentHash: hash,
    hasPdf: !!pdf,
    hasText: !!extractedText,
  };
}

export async function listFilings(input: {
  ticker: string;
  limit?: number;
  offset?: number;
}) {
  const sql = await db();
  const limit = input.limit ?? 50;
  const result = await sql.query(
    `SELECT id, report_metadata AS metadata, imported_at, document_pdf IS NOT NULL AS has_pdf,
    extracted_text IS NOT NULL AS has_text FROM fundamental_filings WHERE portfolio_id='primary' AND report_metadata->>'ticker'=$1
    ORDER BY report_metadata->>'periodEnd' DESC,imported_at DESC,id LIMIT $2 OFFSET $3`,
    [input.ticker, limit + 1, input.offset ?? 0],
  );
  return {
    filings: result.rows.slice(0, limit),
    nextOffset: result.rows.length > limit ? (input.offset ?? 0) + limit : null,
  };
}

export async function getFiling(input: {
  filingId: string;
  content?: 'text' | 'pdf' | 'metadata';
  offset?: number;
  limit?: number;
}) {
  const sql = await db();
  const offset = input.offset ?? 0,
    limit = input.limit ?? 16000;
  const result = await sql.query(
    `SELECT id,report_metadata AS metadata,content_hash,imported_at,
    octet_length(document_pdf) AS pdf_bytes,length(extracted_text) AS text_length,
    CASE WHEN $2='pdf' THEN substring(document_pdf FROM $3::int+1 FOR $4::int) END AS pdf_chunk,
    CASE WHEN $2='text' THEN substring(extracted_text FROM $3::int+1 FOR $4::int) END AS text_chunk
    FROM fundamental_filings WHERE id=$1 AND portfolio_id='primary' AND report_metadata IS NOT NULL`,
    [input.filingId, input.content ?? 'metadata', offset, limit],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Filing not found');
  const financials = await sql.query(
    `SELECT * FROM fundamental_periods WHERE filing_id=$1 AND portfolio_id='primary' ORDER BY created_at DESC LIMIT 20`,
    [input.filingId],
  );
  const { pdf_chunk, ...rest } = row;
  const length =
    input.content === 'pdf'
      ? row.pdf_bytes
      : input.content === 'text'
        ? row.text_length
        : 0;
  return {
    ...rest,
    pdfBase64: pdf_chunk?.toString('base64') ?? null,
    offset,
    nextOffset: offset + limit < length ? offset + limit : null,
    normalizedRevisions: financials.rows,
  };
}

export async function upsertQuarterlyFinancials(
  input: z.input<typeof quarterlySchema>,
) {
  const parsed = quarterlySchema.parse(input);
  const sql = await db();
  const filing = await sql.query(
    `SELECT report_metadata FROM fundamental_filings WHERE id=$1 AND portfolio_id='primary'`,
    [parsed.filingId],
  );
  const meta = filing.rows[0]?.report_metadata;
  if (!meta) throw new Error('Upload a filing first');
  const raw: Record<string, string> = {
    ticker: meta.ticker,
    period_end: meta.periodEnd,
    period_type: meta.reportType,
    fiscal_year: String(meta.fiscalYear),
    fiscal_quarter: meta.fiscalQuarter ? String(meta.fiscalQuarter) : '',
    currency: parsed.currency,
    source_url: meta.sourceUrl,
    notes: parsed.notes || '',
    fact_basis: 'reported',
  };
  for (const metric of FUNDAMENTAL_METRICS)
    if (parsed.metrics[metric] !== undefined)
      raw[metricToColumn[metric]] = String(parsed.metrics[metric]);
  const normalized = normalizeImportRow(raw, 1);
  if (normalized.errors.length) throw new Error(normalized.errors.join('; '));
  const row = normalized.row;
  const hash = createHash('sha256')
    .update(JSON.stringify({ raw, facts: parsed.rawFacts }))
    .digest('hex');
  const record: Record<string, unknown> = {
    id: randomUUID(),
    filing_id: parsed.filingId,
    portfolio_id: 'primary',
    ticker: row.ticker,
    period_end: row.periodEnd,
    period_type: row.periodType,
    fiscal_year: row.fiscalYear,
    fiscal_quarter: row.fiscalQuarter,
    currency: row.currency,
    fact_basis: row.factBasis,
    source_url: row.sourceUrl,
    notes: row.notes,
    metric_origins: row.metricOrigins,
    raw_facts: parsed.rawFacts,
    normalization_hash: hash,
    created_at: new Date().toISOString(),
  };
  for (const metric of FUNDAMENTAL_METRICS)
    record[metricToColumn[metric]] = row.metrics[metric] ?? null;
  const result = await sql.query(
    `INSERT INTO fundamental_periods SELECT * FROM jsonb_populate_record(NULL::fundamental_periods,$1::jsonb)
    ON CONFLICT (filing_id,normalization_hash) DO NOTHING RETURNING id`,
    [JSON.stringify(record)],
  );
  return {
    filingId: parsed.filingId,
    inserted: !!result.rowCount,
    metrics: row.metrics,
    metricOrigins: row.metricOrigins,
  };
}
