import { isAuthenticated } from '@/lib/auth';
import { getPriceHistory } from '@/lib/market-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_SYMBOL = /^[A-Z0-9.^=-]{1,24}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  if (!(await isAuthenticated(request.headers.get('cookie')))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { symbol } = await params;
  const ticker = decodeURIComponent(symbol).trim().toUpperCase();
  if (!VALID_SYMBOL.test(ticker)) {
    return Response.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    return Response.json(await getPriceHistory(ticker));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Historical data is temporarily unavailable',
      },
      { status: 502 },
    );
  }
}
