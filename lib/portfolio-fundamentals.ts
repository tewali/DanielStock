import { createHash, randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import { database } from '@/lib/database';

const PORTFOLIO_ID = 'primary';
const IMPORT_TTL_MINUTES = 30;
const PERIOD_TYPES = ['quarterly', 'annual', 'ttm'] as const;
const SCENARIOS = ['base', 'bull', 'bear', 'custom'] as const;

export const FUNDAMENTAL_METRICS = [
  'revenue',
  'grossProfit',
  'operatingIncome',
  'netIncome',
  'dilutedEps',
  'operatingCashFlow',
  'capex',
  'freeCashFlow',
  'grossMargin',
  'operatingMargin',
  'netMargin',
  'fcfMargin',
  'nopat',
  'investedCapital',
  'roic',
  'cash',
  'totalDebt',
  'netDebt',
  'dilutedShares',
  'sharesOutstanding',
  'stockBasedCompensation',
  'buybacks',
  'dividendsPaid',
] as const;

export type FundamentalMetric = (typeof FUNDAMENTAL_METRICS)[number];
export type PeriodType = (typeof PERIOD_TYPES)[number];
export type Scenario = (typeof SCENARIOS)[number];
type MetricOrigins = Partial<
  Record<FundamentalMetric, 'reported' | 'manual' | 'derived'>
>;

export type FundamentalPeriod = {
  id: string;
  ticker: string;
  periodEnd: string;
  periodType: PeriodType;
  fiscalYear: number;
  fiscalQuarter: number | null;
  currency: string;
  factBasis: 'reported' | 'manual';
  sourceName: string;
  sourceUrl: string | null;
  notes: string | null;
  metrics: Partial<Record<FundamentalMetric, number>>;
  metricOrigins: MetricOrigins;
  importedAt: string;
};

export type FundamentalAssumptionInput = {
  ticker: string;
  metric: FundamentalMetric;
  periodEnd: string;
  scenario: Scenario;
  value: number;
  currency?: string | null;
  note?: string | null;
};

const snakeToMetric: Record<string, FundamentalMetric> = {
  revenue: 'revenue',
  gross_profit: 'grossProfit',
  operating_income: 'operatingIncome',
  net_income: 'netIncome',
  diluted_eps: 'dilutedEps',
  operating_cash_flow: 'operatingCashFlow',
  capex: 'capex',
  free_cash_flow: 'freeCashFlow',
  gross_margin: 'grossMargin',
  operating_margin: 'operatingMargin',
  net_margin: 'netMargin',
  fcf_margin: 'fcfMargin',
  nopat: 'nopat',
  invested_capital: 'investedCapital',
  roic: 'roic',
  cash: 'cash',
  total_debt: 'totalDebt',
  net_debt: 'netDebt',
  diluted_shares: 'dilutedShares',
  shares_outstanding: 'sharesOutstanding',
  stock_based_compensation: 'stockBasedCompensation',
  buybacks: 'buybacks',
  dividends_paid: 'dividendsPaid',
};

const metricToColumn = Object.fromEntries(
  Object.entries(snakeToMetric).map(([column, metric]) => [metric, column]),
) as Record<FundamentalMetric, string>;

function requiredDatabase() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for fundamentals');
  return sql;
}

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function dateOnly(value: string | Date) {
  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2)
    throw new Error('CSV must contain a header and at least one data row');
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? '']),
      ),
    );
}

function numeric(value: string, field: string, row: number, errors: string[]) {
  if (!value) return undefined;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const result = Number(normalized);
  if (!Number.isFinite(result))
    errors.push(`Row ${row}: ${field} must be numeric`);
  return Number.isFinite(result) ? result : undefined;
}

function normalizeImportRow(raw: Record<string, string>, rowNumber: number) {
  const errors: string[] = [];
  const ticker = (raw.ticker || '').trim().toUpperCase();
  const periodEnd = (raw.period_end || '').trim();
  const periodType = (raw.period_type || '').trim().toLowerCase() as PeriodType;
  const currency = (raw.currency || '').trim().toUpperCase();
  const fiscalYear = Number(raw.fiscal_year || periodEnd.slice(0, 4));
  const fiscalQuarter = raw.fiscal_quarter ? Number(raw.fiscal_quarter) : null;
  const factBasis = raw.fact_basis === 'manual' ? 'manual' : 'reported';
  if (!/^[A-Z0-9.^=-]{1,24}$/.test(ticker))
    errors.push(`Row ${rowNumber}: invalid ticker`);
  if (!validDate(periodEnd))
    errors.push(`Row ${rowNumber}: period_end must be YYYY-MM-DD`);
  if (!PERIOD_TYPES.includes(periodType))
    errors.push(
      `Row ${rowNumber}: period_type must be quarterly, annual, or ttm`,
    );
  if (raw.fact_basis && !['reported', 'manual'].includes(raw.fact_basis))
    errors.push(`Row ${rowNumber}: fact_basis must be reported or manual`);
  if (!/^[A-Z]{3}$/.test(currency))
    errors.push(`Row ${rowNumber}: currency must be a three-letter code`);
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 2200)
    errors.push(`Row ${rowNumber}: invalid fiscal_year`);
  if (
    fiscalQuarter !== null &&
    (!Number.isInteger(fiscalQuarter) || fiscalQuarter < 1 || fiscalQuarter > 4)
  )
    errors.push(`Row ${rowNumber}: fiscal_quarter must be 1-4`);
  if (periodType === 'quarterly' && fiscalQuarter === null)
    errors.push(`Row ${rowNumber}: quarterly periods require fiscal_quarter`);

  const metrics: Partial<Record<FundamentalMetric, number>> = {};
  const metricOrigins: MetricOrigins = {};
  for (const [column, metric] of Object.entries(snakeToMetric)) {
    const value = numeric(raw[column], column, rowNumber, errors);
    if (value !== undefined) {
      metrics[metric] = value;
      metricOrigins[metric] = factBasis;
    }
  }
  for (const metric of [
    'grossMargin',
    'operatingMargin',
    'netMargin',
    'fcfMargin',
    'roic',
  ] as FundamentalMetric[]) {
    const value = metrics[metric];
    if (value !== undefined && Math.abs(value) > 10)
      errors.push(
        `Row ${rowNumber}: ${metricToColumn[metric]} must be a decimal ratio, not a percentage`,
      );
  }
  const derive = (metric: FundamentalMetric, value: number | undefined) => {
    if (
      metrics[metric] === undefined &&
      value !== undefined &&
      Number.isFinite(value)
    ) {
      metrics[metric] = value;
      metricOrigins[metric] = 'derived';
    }
  };
  if (metrics.operatingCashFlow !== undefined && metrics.capex !== undefined)
    derive('freeCashFlow', metrics.operatingCashFlow - Math.abs(metrics.capex));
  if (metrics.revenue) {
    derive(
      'grossMargin',
      metrics.grossProfit === undefined
        ? undefined
        : metrics.grossProfit / metrics.revenue,
    );
    derive(
      'operatingMargin',
      metrics.operatingIncome === undefined
        ? undefined
        : metrics.operatingIncome / metrics.revenue,
    );
    derive(
      'netMargin',
      metrics.netIncome === undefined
        ? undefined
        : metrics.netIncome / metrics.revenue,
    );
    derive(
      'fcfMargin',
      metrics.freeCashFlow === undefined
        ? undefined
        : metrics.freeCashFlow / metrics.revenue,
    );
  }
  if (metrics.totalDebt !== undefined && metrics.cash !== undefined)
    derive('netDebt', metrics.totalDebt - metrics.cash);
  if (metrics.nopat !== undefined && metrics.investedCapital)
    derive('roic', metrics.nopat / metrics.investedCapital);
  if (Object.keys(metrics).length === 0)
    errors.push(`Row ${rowNumber}: provide at least one fundamental metric`);

  return {
    row: {
      ticker,
      periodEnd,
      periodType,
      currency,
      fiscalYear,
      fiscalQuarter,
      factBasis,
      sourceUrl: raw.source_url?.trim() || null,
      notes: raw.notes?.trim() || null,
      metrics,
      metricOrigins,
    },
    errors,
  };
}

export async function ensureFundamentalsSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS fundamental_filings (id uuid PRIMARY KEY, portfolio_id text NOT NULL DEFAULT 'primary', source_name text NOT NULL, source_url text, content_hash text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(), UNIQUE (portfolio_id, content_hash));
    CREATE TABLE IF NOT EXISTS fundamental_periods (id uuid PRIMARY KEY, filing_id uuid NOT NULL REFERENCES fundamental_filings(id), portfolio_id text NOT NULL DEFAULT 'primary', ticker text NOT NULL, period_end date NOT NULL, period_type text NOT NULL CHECK (period_type IN ('quarterly','annual','ttm')), fiscal_year integer NOT NULL, fiscal_quarter integer CHECK (fiscal_quarter BETWEEN 1 AND 4), currency text NOT NULL, fact_basis text NOT NULL CHECK (fact_basis IN ('reported','manual')), source_url text, notes text, revenue double precision, gross_profit double precision, operating_income double precision, net_income double precision, diluted_eps double precision, operating_cash_flow double precision, capex double precision, free_cash_flow double precision, gross_margin double precision, operating_margin double precision, net_margin double precision, fcf_margin double precision, nopat double precision, invested_capital double precision, roic double precision, cash double precision, total_debt double precision, net_debt double precision, diluted_shares double precision, shares_outstanding double precision, stock_based_compensation double precision, buybacks double precision, dividends_paid double precision, metric_origins jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS fundamental_assumptions (id uuid PRIMARY KEY, portfolio_id text NOT NULL DEFAULT 'primary', ticker text NOT NULL, metric text NOT NULL, period_end date NOT NULL, scenario text NOT NULL CHECK (scenario IN ('base','bull','bear','custom')), value double precision NOT NULL, currency text, note text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (portfolio_id,ticker,metric,period_end,scenario));
    CREATE TABLE IF NOT EXISTS fundamental_import_previews (id uuid PRIMARY KEY, portfolio_id text NOT NULL DEFAULT 'primary', source_name text NOT NULL, source_url text, content_hash text NOT NULL, rows jsonb NOT NULL, errors jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, committed_at timestamptz);
    CREATE INDEX IF NOT EXISTS fundamental_periods_history_idx ON fundamental_periods (portfolio_id,ticker,period_type,period_end DESC,created_at DESC);
    CREATE INDEX IF NOT EXISTS fundamental_assumptions_history_idx ON fundamental_assumptions (portfolio_id,ticker,period_end,scenario);
  `);
}

export async function previewFundamentalsImport(
  csv: string,
  sourceName: string,
  sourceUrl?: string | null,
) {
  if (Buffer.byteLength(csv, 'utf8') > 2_000_000)
    throw new Error('CSV is limited to 2 MB');
  const parsed = parseCsv(csv);
  if (parsed.length > 2_000) throw new Error('CSV is limited to 2,000 rows');
  const normalized = parsed.map((row, index) =>
    normalizeImportRow(row, index + 2),
  );
  const rows = normalized
    .filter((entry) => entry.errors.length === 0)
    .map((entry) => entry.row);
  const errors = normalized.flatMap((entry) => entry.errors);
  const id = randomUUID();
  const contentHash = createHash('sha256').update(csv.trim()).digest('hex');
  const sql = requiredDatabase();
  await ensureFundamentalsSchema(sql);
  await sql.query(
    `INSERT INTO fundamental_import_previews (id,portfolio_id,source_name,source_url,content_hash,rows,errors,expires_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now()+($8 || ' minutes')::interval)`,
    [
      id,
      PORTFOLIO_ID,
      sourceName.trim(),
      sourceUrl?.trim() || null,
      contentHash,
      JSON.stringify(rows),
      JSON.stringify(errors),
      IMPORT_TTL_MINUTES,
    ],
  );
  return {
    previewId: id,
    validRows: rows.length,
    invalidRows: parsed.length - rows.length,
    errors,
    expiresInMinutes: IMPORT_TTL_MINUTES,
    columns: [
      'ticker',
      'period_end',
      'period_type',
      'currency',
      'fiscal_year',
      'fiscal_quarter',
      'fact_basis',
      'source_url',
      'notes',
      ...Object.keys(snakeToMetric),
    ],
  };
}

export async function commitFundamentalsImport(previewId: string) {
  const sql = requiredDatabase();
  await ensureFundamentalsSchema(sql);
  const client = await sql.connect();
  try {
    await client.query('BEGIN');
    const previewResult = await client.query(
      `SELECT * FROM fundamental_import_previews WHERE id=$1 AND portfolio_id=$2 FOR UPDATE`,
      [previewId, PORTFOLIO_ID],
    );
    const preview = previewResult.rows[0];
    if (!preview) throw new Error('Import preview not found');
    if (preview.committed_at)
      throw new Error('Import preview has already been committed');
    if (new Date(preview.expires_at) < new Date())
      throw new Error('Import preview has expired');
    if (preview.errors.length)
      throw new Error(
        'Import contains invalid rows; correct the CSV and preview it again',
      );
    const filingId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO fundamental_filings (id,portfolio_id,source_name,source_url,content_hash) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (portfolio_id,content_hash) DO NOTHING RETURNING id`,
      [
        filingId,
        PORTFOLIO_ID,
        preview.source_name,
        preview.source_url,
        preview.content_hash,
      ],
    );
    if (!inserted.rowCount) {
      await client.query(
        `UPDATE fundamental_import_previews SET committed_at=now() WHERE id=$1`,
        [previewId],
      );
      await client.query('COMMIT');
      return { importedRows: 0, duplicate: true };
    }
    for (const row of preview.rows as Array<
      ReturnType<typeof normalizeImportRow>['row']
    >) {
      const metricColumns = FUNDAMENTAL_METRICS.map(
        (metric) => metricToColumn[metric],
      );
      const values = FUNDAMENTAL_METRICS.map(
        (metric) => row.metrics[metric] ?? null,
      );
      const placeholders = values.map((_, index) => `$${13 + index}`).join(',');
      await client.query(
        `INSERT INTO fundamental_periods (id,filing_id,portfolio_id,ticker,period_end,period_type,fiscal_year,fiscal_quarter,currency,fact_basis,source_url,notes,${metricColumns.join(',')},metric_origins) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,${placeholders},$${13 + values.length}::jsonb)`,
        [
          randomUUID(),
          filingId,
          PORTFOLIO_ID,
          row.ticker,
          row.periodEnd,
          row.periodType,
          row.fiscalYear,
          row.fiscalQuarter,
          row.currency,
          row.factBasis,
          row.sourceUrl,
          row.notes,
          ...values,
          JSON.stringify(row.metricOrigins),
        ],
      );
    }
    await client.query(
      `UPDATE fundamental_import_previews SET committed_at=now() WHERE id=$1`,
      [previewId],
    );
    await client.query('COMMIT');
    return { importedRows: preview.rows.length, duplicate: false, filingId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function rowToPeriod(row: Record<string, unknown>): FundamentalPeriod {
  const metrics: Partial<Record<FundamentalMetric, number>> = {};
  for (const metric of FUNDAMENTAL_METRICS) {
    const value = row[metricToColumn[metric]];
    if (typeof value === 'number') metrics[metric] = value;
  }
  return {
    id: String(row.id),
    ticker: String(row.ticker),
    periodEnd: dateOnly(row.period_end as string | Date),
    periodType: row.period_type as PeriodType,
    fiscalYear: Number(row.fiscal_year),
    fiscalQuarter:
      row.fiscal_quarter === null ? null : Number(row.fiscal_quarter),
    currency: String(row.currency),
    factBasis: row.fact_basis as 'reported' | 'manual',
    sourceName: String(row.source_name),
    sourceUrl:
      typeof row.resolved_source_url === 'string'
        ? row.resolved_source_url
        : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    metrics,
    metricOrigins: (row.metric_origins || {}) as MetricOrigins,
    importedAt: new Date(row.imported_at as string | Date).toISOString(),
  };
}

export async function getFundamentalHistory(
  ticker: string,
  options: {
    periodType?: PeriodType | 'all';
    from?: string;
    to?: string;
    limit?: number;
  } = {},
) {
  const sql = requiredDatabase();
  await ensureFundamentalsSchema(sql);
  const normalizedTicker = ticker.trim().toUpperCase();
  const values: unknown[] = [PORTFOLIO_ID, normalizedTicker];
  const where = ['period.portfolio_id=$1', 'period.ticker=$2'];
  if (options.periodType && options.periodType !== 'all') {
    values.push(options.periodType);
    where.push(`period.period_type=$${values.length}`);
  }
  if (options.from) {
    values.push(options.from);
    where.push(`period.period_end >= $${values.length}`);
  }
  if (options.to) {
    values.push(options.to);
    where.push(`period.period_end <= $${values.length}`);
  }
  values.push(Math.min(Math.max(options.limit ?? 40, 1), 200));
  const result = await sql.query(
    `SELECT DISTINCT ON (period.ticker,period.period_end,period.period_type) period.*, filing.source_name, COALESCE(period.source_url,filing.source_url) AS resolved_source_url, filing.imported_at FROM fundamental_periods period JOIN fundamental_filings filing ON filing.id=period.filing_id WHERE ${where.join(' AND ')} ORDER BY period.ticker,period.period_end DESC,period.period_type,period.created_at DESC LIMIT $${values.length}`,
    values,
  );
  const periods = result.rows
    .map(rowToPeriod)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const assumptions = await listFundamentalAssumptions(normalizedTicker);
  return {
    ticker: normalizedTicker,
    periods,
    assumptions,
    metricDefinitions: Object.fromEntries(
      FUNDAMENTAL_METRICS.map((metric) => [
        metric,
        {
          type: [
            'grossMargin',
            'operatingMargin',
            'netMargin',
            'fcfMargin',
            'roic',
          ].includes(metric)
            ? 'ratio'
            : metric === 'dilutedEps'
              ? 'perShare'
              : 'amount',
        },
      ]),
    ),
  };
}

export async function listFundamentalAssumptions(ticker: string) {
  const sql = requiredDatabase();
  await ensureFundamentalsSchema(sql);
  const result = await sql.query(
    `SELECT id,ticker,metric,period_end,scenario,value,currency,note,created_at,updated_at FROM fundamental_assumptions WHERE portfolio_id=$1 AND ticker=$2 ORDER BY period_end,metric,scenario`,
    [PORTFOLIO_ID, ticker.trim().toUpperCase()],
  );
  return result.rows.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    metric: row.metric,
    periodEnd: dateOnly(row.period_end),
    scenario: row.scenario,
    value: row.value,
    currency: row.currency,
    note: row.note,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function upsertFundamentalAssumptions(
  inputs: FundamentalAssumptionInput[],
) {
  const sql = requiredDatabase();
  await ensureFundamentalsSchema(sql);
  const saved = [];
  for (const input of inputs) {
    if (!validDate(input.periodEnd))
      throw new Error('Assumption periodEnd must be YYYY-MM-DD');
    const result = await sql.query(
      `INSERT INTO fundamental_assumptions (id,portfolio_id,ticker,metric,period_end,scenario,value,currency,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (portfolio_id,ticker,metric,period_end,scenario) DO UPDATE SET value=EXCLUDED.value,currency=EXCLUDED.currency,note=EXCLUDED.note,updated_at=now() RETURNING id`,
      [
        randomUUID(),
        PORTFOLIO_ID,
        input.ticker.trim().toUpperCase(),
        input.metric,
        input.periodEnd,
        input.scenario,
        input.value,
        input.currency?.trim().toUpperCase() || null,
        input.note?.trim() || null,
      ],
    );
    saved.push(result.rows[0].id);
  }
  return { saved: saved.length, ids: saved };
}

export async function deleteFundamentalAssumptions(
  ticker: string,
  filters: {
    metric?: FundamentalMetric;
    scenario?: Scenario;
    from?: string;
  } = {},
) {
  const sql = requiredDatabase();
  await ensureFundamentalsSchema(sql);
  const values: unknown[] = [PORTFOLIO_ID, ticker.trim().toUpperCase()];
  const where = ['portfolio_id=$1', 'ticker=$2'];
  if (filters.metric) {
    values.push(filters.metric);
    where.push(`metric=$${values.length}`);
  }
  if (filters.scenario) {
    values.push(filters.scenario);
    where.push(`scenario=$${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    where.push(`period_end >= $${values.length}`);
  }
  const result = await sql.query(
    `DELETE FROM fundamental_assumptions WHERE ${where.join(' AND ')}`,
    values,
  );
  return { deleted: result.rowCount ?? 0 };
}
