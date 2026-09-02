import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
} from '@/lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', pragma: 'no-cache' },
  });
}

function formString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  const form = await request.formData();
  const grantType = formString(form, 'grant_type');
  const clientId = formString(form, 'client_id');
  const resource = formString(form, 'resource') || undefined;
  if (!clientId) {
    return tokenResponse({ error: 'invalid_client' }, 401);
  }

  try {
    if (grantType === 'authorization_code') {
      const token = await exchangeAuthorizationCode({
        code: formString(form, 'code'),
        clientId,
        redirectUri: formString(form, 'redirect_uri'),
        codeVerifier: formString(form, 'code_verifier'),
        resource,
      });
      return token
        ? tokenResponse(token)
        : tokenResponse({ error: 'invalid_grant' }, 400);
    }

    if (grantType === 'refresh_token') {
      const token = await exchangeRefreshToken({
        refreshToken: formString(form, 'refresh_token'),
        clientId,
        resource,
      });
      return token
        ? tokenResponse(token)
        : tokenResponse({ error: 'invalid_grant' }, 400);
    }

    return tokenResponse({ error: 'unsupported_grant_type' }, 400);
  } catch (error) {
    return tokenResponse(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Token exchange failed',
      },
      500,
    );
  }
}
