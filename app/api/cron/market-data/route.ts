import { createHash, timingSafeEqual } from 'node:crypto';

import { refreshCurrentMarketPrices } from '@/lib/scheduled-market-refresh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(value: string, expected: string) {
  const left = createHash('sha256').update(value).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  const supplied = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!cronSecret || !supplied || !sameSecret(supplied, cronSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return Response.json(await refreshCurrentMarketPrices());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Scheduled market refresh failed',
      },
      { status: 502 },
    );
  }
}
