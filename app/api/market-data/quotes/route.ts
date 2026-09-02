import { z } from 'zod';

import { isAuthenticated } from '@/lib/auth';
import { refreshQuotes } from '@/lib/market-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const symbol = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.^=-]{1,24}$/);
const requestSchema = z.object({ symbols: z.array(symbol).min(1).max(100) });

export async function POST(request: Request) {
  if (!(await isAuthenticated(request.headers.get('cookie')))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid symbols', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await refreshQuotes(parsed.data.symbols);
    return Response.json({ ...result, source: 'Yahoo Finance' });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Market data is temporarily unavailable',
      },
      { status: 502 },
    );
  }
}
