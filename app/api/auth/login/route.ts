import { z } from 'zod';

import { createSessionCookie, isPasswordConfigured, matchesPassword } from '@/lib/auth';

export const runtime = 'edge';

const loginSchema = z.object({ password: z.string().min(1).max(256) });

export async function POST(request: Request) {
  if (!isPasswordConfigured()) {
    return Response.json({ error: 'Dashboard password is not configured' }, { status: 503 });
  }

  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success || !matchesPassword(parsed.data.password)) {
    return Response.json({ error: 'Invalid password' }, { status: 401 });
  }

  return Response.json(
    { ok: true },
    { headers: { 'set-cookie': await createSessionCookie(), 'cache-control': 'no-store' } },
  );
}
