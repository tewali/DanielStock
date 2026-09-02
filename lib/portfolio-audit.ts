import { database } from '@/lib/database';
import { ensureManagedStocksSchema } from '@/lib/managed-stocks';
import { ensurePortfolioLedgerSchema } from '@/lib/portfolio-ledger';
import { ensurePortfolioResearchSchema } from '@/lib/portfolio-research';
import { ensurePortfolioSettingsSchema } from '@/lib/portfolio-settings';

const PORTFOLIO_ID = 'primary';

export async function listChangeHistory(filters?: {
  ticker?: string;
  entityType?: 'stock' | 'transaction' | 'settings' | 'watchlist' | 'research';
  limit?: number;
}) {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for change history');
  await Promise.all([
    ensureManagedStocksSchema(sql),
    ensurePortfolioLedgerSchema(sql),
    ensurePortfolioResearchSchema(sql),
    ensurePortfolioSettingsSchema(sql),
  ]);
  const ticker = filters?.ticker?.toUpperCase() ?? null;
  const entityType = filters?.entityType ?? null;
  const limit = Math.min(filters?.limit ?? 100, 500);
  const result = await sql.query<{
    event_type: string;
    event_id: string;
    ticker: string | null;
    action: string;
    details: unknown;
    created_at: Date | string;
  }>(
    `SELECT * FROM (
       SELECT 'stock'::text AS event_type, id::text AS event_id, ticker,
              action, changes AS details, created_at
       FROM managed_stock_events
       UNION ALL
       SELECT 'transaction', id::text,
              COALESCE(after_state->>'ticker', before_state->>'ticker'), action,
              jsonb_build_object('transactionId', transaction_id,
                'before', before_state, 'after', after_state), created_at
       FROM portfolio_transaction_events WHERE portfolio_id = $1
       UNION ALL
       SELECT 'settings', id::text, NULL, 'update', changes, created_at
       FROM portfolio_state_events WHERE portfolio_id = $1
       UNION ALL
       SELECT 'watchlist', id::text, ticker, action, changes, created_at
       FROM portfolio_watchlist_events WHERE portfolio_id = $1
       UNION ALL
       SELECT 'research', id::text, ticker, 'add',
              jsonb_build_object('kind', note_kind, 'content', content,
                'source', source, 'researchDate', research_date), created_at
       FROM portfolio_research_notes WHERE portfolio_id = $1
     ) events
     WHERE ($2::text IS NULL OR ticker = $2)
       AND ($3::text IS NULL OR event_type = $3)
     ORDER BY created_at DESC
     LIMIT $4`,
    [PORTFOLIO_ID, ticker, entityType, limit],
  );
  return result.rows.map((row) => ({
    entityType: row.event_type,
    id: row.event_id,
    ticker: row.ticker,
    action: row.action,
    details: row.details,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
