import { timingSafeEqual } from 'node:crypto';

import { createMcpHandler, type AuthInfo } from '@modelcontextprotocol/server';

import { mcpResource, oauthIssuer, verifyOAuthAccessToken } from '@/lib/oauth';
import { createPortfolioMcpServer } from '@/lib/portfolio-mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(
  (context) => createPortfolioMcpServer(context.authInfo?.scopes ?? []),
  {
  responseMode: 'json',
  },
);

function sameSecret(candidate: string, expected: string) {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return (
    candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes)
  );
}

function challenge(request: Request, invalidToken = false) {
  const resourceMetadata = `${oauthIssuer(request)}/.well-known/oauth-protected-resource/api/mcp`;
  const details = invalidToken ? ', error="invalid_token"' : '';
  return Response.json(
    { error: invalidToken ? 'invalid_token' : 'Unauthorized' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer realm="DanielStock MCP", resource_metadata="${resourceMetadata}"${details}`,
      },
    },
  );
}

async function authorize(request: Request): Promise<AuthInfo | Response> {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, candidate] = authorization.split(' ', 2);
  if (scheme.toLowerCase() !== 'bearer' || !candidate) {
    return challenge(request);
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid Origin' }, { status: 403 });
  }

  const legacyKey = process.env.MCP_API_KEY;
  if (legacyKey && sameSecret(candidate, legacyKey)) {
    return {
      token: candidate,
      clientId: 'legacy-api-key',
      scopes: ['stocks:read', 'stocks:write'],
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
    };
  }

  try {
    return (await verifyOAuthAccessToken(candidate, mcpResource(request))) ?? challenge(request, true);
  } catch (error) {
    return Response.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'OAuth verification failed',
      },
      { status: 503 },
    );
  }
}

async function serve(request: Request) {
  const auth = await authorize(request);
  return auth instanceof Response
    ? auth
    : handler.fetch(request, { authInfo: auth });
}

export const GET = serve;
export const POST = serve;
export const DELETE = serve;
