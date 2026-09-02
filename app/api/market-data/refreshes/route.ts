import { z } from 'zod';

import { isAuthenticated } from '@/lib/auth';
import {
  getMarketRefreshHistory,
  retryMarketRefresh,
} from '@/lib/scheduled-market-refresh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorized(request: Request) {
  return isAuthenticated(request.headers.get('cookie'));
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return Response.json(await getMarketRefreshHistory());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Refresh history is temporarily unavailable',
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = z
    .object({ runId: z.number().int().positive() })
    .safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: 'Invalid refresh run' }, { status: 400 });
  }
  try {
    return Response.json(await retryMarketRefresh(parsed.data.runId));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Refresh retry failed',
      },
      { status: 502 },
    );
  }
}
