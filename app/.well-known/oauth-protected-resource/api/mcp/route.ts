import { protectedResourceMetadata } from '../../../../../lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return Response.json(protectedResourceMetadata(request), {
    headers: {
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=300',
    },
  });
}
