import { isAuthenticated } from '@/lib/auth';
import { listManagedStocks } from '@/lib/managed-stocks';
import { listWatchlist } from '@/lib/portfolio-research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await isAuthenticated(request.headers.get('cookie')))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [stocks, watchlist] = await Promise.all([
      listManagedStocks(true),
      listWatchlist(true),
    ]);
    return Response.json({ stocks, watchlist });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Managed stocks are temporarily unavailable',
      },
      { status: 503 },
    );
  }
}
