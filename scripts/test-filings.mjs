// Run with DATABASE_URL pointing to a disposable PostgreSQL database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

if (!process.env.DATABASE_URL?.includes('/filings_test')) throw new Error('Use an isolated filings_test database');
function compile(path, replacements = {}) {
  let source = fs.readFileSync(path, 'utf8');
  for (const [name, replacement] of Object.entries(replacements)) source = source.replaceAll(`'${name}'`, `'${replacement}'`);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
}
const databaseUrl = compile('lib/database.ts', { pg: import.meta.resolve('pg') });
const fundamentalsUrl = compile('lib/portfolio-fundamentals.ts', { '@/lib/database': databaseUrl });
const filingsUrl = compile('lib/filings.ts', { '@/lib/database': databaseUrl, '@/lib/portfolio-fundamentals': fundamentalsUrl, zod: import.meta.resolve('zod') });
const { database } = await import(databaseUrl);
const { uploadFiling, listFilings, getFiling, upsertQuarterlyFinancials, filingUploadSchema, quarterlySchema } = await import(filingsUrl);
const { getFundamentalHistory } = await import(fundamentalsUrl);
try {
  const source = { ticker: 'TEST', fiscalYear: 2026, fiscalQuarter: 2, reportType: 'quarterly', periodStart: '2026-04-01', periodEnd: '2026-06-30', publishedAt: '2026-07-20', sourceName: 'Synthetic test report', sourceUrl: 'https://example.com/test', accountingStandard: 'IFRS', extractedText: 'Test revenue 1000. Operating cashflow 200. Capex 50.' };
  assert.equal(filingUploadSchema.safeParse({ ...source, periodEnd: '2026-02-30' }).success, false);
  assert.equal(filingUploadSchema.safeParse({ ...source, extractedText: undefined }).success, false);
  const first = await uploadFiling(source);
  const repeat = await uploadFiling(source);
  assert.equal(first.filingId, repeat.filingId);
  assert.equal((await listFilings({ ticker: 'TEST' })).filings.length, 1);
  const chunk = await getFiling({ filingId: first.filingId, content: 'text', limit: 10 });
  assert.equal(chunk.text_chunk, source.extractedText.slice(0,10));
  assert.equal(chunk.nextOffset, 10);
  const metrics = { revenue: 1000, operatingCashFlow: 200, capex: 50 };
  const rawFacts = Object.entries(metrics).map(([metric, value]) => ({ metric, originalValue: String(value), unit: 'EUR', locator: 'Page 1' }));
  const input = { filingId: first.filingId, currency: 'EUR', cashFlowBasis: 'standalone_period', metrics, rawFacts };
  assert.equal(quarterlySchema.safeParse({ ...input, metrics: { stockPrice: 100 } }).success, false);
  assert.equal(quarterlySchema.safeParse({ ...input, rawFacts: [] }).success, false);
  assert.equal((await upsertQuarterlyFinancials(input)).inserted, true);
  assert.equal((await upsertQuarterlyFinancials(input)).inserted, false);
  const history = await getFundamentalHistory('TEST');
  assert.equal(history.periods[0].filingId, first.filingId);
  assert.equal(history.periods[0].metrics.freeCashFlow, 150);
  assert.equal(history.periods[0].metricOrigins.freeCashFlow, 'derived');
  await upsertQuarterlyFinancials({ ...input, metrics: { ...metrics, revenue: 1100 }, rawFacts: rawFacts.map(f => f.metric === 'revenue' ? { ...f, originalValue: '1100' } : f) });
  assert.equal((await getFundamentalHistory('TEST')).periods[0].metrics.revenue, 1100);
  const doc = await getFiling({ filingId: first.filingId });
  assert.equal(doc.normalizedRevisions.length, 2);
  assert.equal(doc.normalizedRevisions[0].raw_facts.length, 3);
  const bytes = Buffer.from('%PDF-1.4\nSynthetic PDF test fixture\n%%EOF');
  const pdf = await uploadFiling({ ...source, pdfBase64: bytes.toString('base64') });
  const read = await getFiling({ filingId: pdf.filingId, content: 'pdf', limit: 64000 });
  assert.deepEqual(Buffer.from(read.pdfBase64, 'base64'), bytes);
  assert.equal(read.nextOffset, null);
  console.log('Filings integration passed: archive, deduplication, chunks, normalization, provenance, revisions and PDF byte roundtrip.');
} finally { await database().end(); }
