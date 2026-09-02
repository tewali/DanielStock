import { Pool } from 'pg';

let pool: Pool | null = null;

export function database(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  pool ??= new Pool({ connectionString: url, max: 5 });
  return pool;
}
