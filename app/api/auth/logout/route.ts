import { clearSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        'set-cookie': clearSessionCookie(),
        'cache-control': 'no-store',
      },
    },
  );
}
