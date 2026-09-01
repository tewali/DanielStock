import { Pool } from 'pg';
import { z } from 'zod';

import { isAuthenticated } from '@/lib/auth';

export const runtime = 'nodejs';

const stateSchema = z.object({
  growth: z.record(z.string(), z.number()),
  prices: z.record(z.string(), z.number()),
  mos: z.record(z.string(), z.number()),
  shock: z.number().min(-40).max(40),
  priority: z.enum(['abstand', 'qualitaet', 'konfidenz']),
  quoteMeta: z.object({ at: z.string(), n: z.number() }).nullable(),
  params: z.record(z.string(), z.number()),
});

let pool: Pool | null = null;

function database(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool ??= new Pool({ connectionString: url, max: 5 });
  return pool;
}

async function ensureSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS portfolio_state (
      id text PRIMARY KEY,
      state jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function authorized(request: Request) {
  return isAuthenticated(request.headers.get('cookie'));
}

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return unauthorized();
  const sql = database();
  if (!sql)
    return Response.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );

  await ensureSchema(sql);
  const result = await sql.query<{ state: unknown; updated_at: Date }>(
    "SELECT state, updated_at FROM portfolio_state WHERE id = 'primary' LIMIT 1",
  );
  const row = result.rows[0];
  return Response.json({
    state: row?.state ?? null,
    updatedAt: row?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  if (!(await authorized(request))) return unauthorized();
  const sql = database();
  if (!sql)
    return Response.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );

  const parsed = z
    .object({ state: stateSchema })
    .safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid portfolio state', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await ensureSchema(sql);
  const encoded = JSON.stringify(parsed.data.state);
  const result = await sql.query<{ updated_at: Date }>(
    `
    INSERT INTO portfolio_state (id, state, updated_at)
    VALUES ('primary', $1::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()
    RETURNING updated_at
  `,
    [encoded],
  );
  return Response.json({ ok: true, updatedAt: result.rows[0]?.updated_at });
}

export async function DELETE(request: Request) {
  if (!(await authorized(request))) return unauthorized();
  const sql = database();
  if (!sql)
    return Response.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );

  await ensureSchema(sql);
  await sql.query("DELETE FROM portfolio_state WHERE id = 'primary'");
  return Response.json({ ok: true });
}
