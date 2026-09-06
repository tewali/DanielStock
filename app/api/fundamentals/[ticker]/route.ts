import { isAuthenticated } from '@/lib/auth';
import { getFundamentalHistory } from '@/lib/portfolio-fundamentals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TICKER = /^[A-Z0-9.^=-]{1,24}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  if (!(await isAuthenticated(request.headers.get('cookie')))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker).trim().toUpperCase();
  if (!VALID_TICKER.test(ticker)) {
    return Response.json({ error: 'Invalid ticker' }, { status: 400 });
  }

  const url = new URL(request.url);
  const periodType = url.searchParams.get('periodType') || 'quarterly';
  if (!['quarterly', 'annual', 'ttm', 'all'].includes(periodType)) {
    return Response.json({ error: 'Invalid periodType' }, { status: 400 });
  }
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') || 40), 1),
    200,
  );

  try {
    return Response.json(
      await getFundamentalHistory(ticker, {
        periodType: periodType as 'quarterly' | 'annual' | 'ttm' | 'all',
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
        limit,
      }),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fundamentals are temporarily unavailable',
      },
      { status: 503 },
    );
  }
}
