import { isAuthenticated } from '@/lib/auth';
import {
  companyHistoryFilters,
  getCompanyHistory,
} from '@/lib/company-history';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  if (!(await isAuthenticated(request.headers.get('cookie'))))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ticker } = await params;
  const search = new URL(request.url).searchParams;
  const parsed = companyHistoryFilters.safeParse({
    ticker,
    kind: search.get('kind') || undefined,
    offset: Number(search.get('offset') || 0),
    limit: 30,
  });
  if (!parsed.success)
    return Response.json({ error: 'Invalid filters' }, { status: 400 });
  try {
    return Response.json(await getCompanyHistory(parsed.data));
  } catch {
    return Response.json(
      { error: 'Historie konnte nicht geladen werden' },
      { status: 503 },
    );
  }
}
