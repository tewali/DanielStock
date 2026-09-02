import { z } from 'zod';

import { registerOAuthClient, validRedirectUri } from '@/lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registrationSchema = z
  .object({
    client_name: z.string().trim().min(1).max(200).optional(),
    redirect_uris: z.array(z.string()).min(1).max(10),
    token_endpoint_auth_method: z.literal('none').optional(),
    grant_types: z.array(z.string()).optional(),
    response_types: z.array(z.string()).optional(),
  })
  .loose();

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success ||
        parsed.data.redirect_uris.some((uri) => !validRedirectUri(uri)) ||
        parsed.data.grant_types?.some((grant) => !['authorization_code', 'refresh_token'].includes(grant)) ||
        parsed.data.response_types?.some((type) => type !== 'code')) {
      return Response.json(
        { error: 'invalid_client_metadata', error_description: 'Unsupported or invalid client metadata' },
        { status: 400 },
      );
    }

    const client = await registerOAuthClient({
      clientName: parsed.data.client_name || 'MCP Client',
      redirectUris: parsed.data.redirect_uris,
    });
    return Response.json(
      {
        client_id: client.client_id,
        client_id_issued_at: Math.floor(client.created_at.getTime() / 1000),
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 },
    );
  }
}
