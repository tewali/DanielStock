import { database } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'cache-control': 'no-store' };

export async function GET() {
  const sql = database();
  if (!sql) {
    return Response.json(
      { status: 'unhealthy', database: 'not-configured' },
      { status: 503, headers },
    );
  }

  try {
    await sql.query('SELECT 1');
    return Response.json(
      { status: 'healthy', database: 'connected' },
      { headers },
    );
  } catch {
    return Response.json(
      { status: 'unhealthy', database: 'unavailable' },
      { status: 503, headers },
    );
  }
}
