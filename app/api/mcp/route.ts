import { timingSafeEqual } from 'node:crypto';

import { createMcpHandler } from '@modelcontextprotocol/server';

import { createPortfolioMcpServer } from '@/lib/portfolio-mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(() => createPortfolioMcpServer(), {
  responseMode: 'json',
});

function sameSecret(candidate: string, expected: string) {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return (
    candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes)
  );
}

function authorize(request: Request) {
  const expected = process.env.MCP_API_KEY;
  if (!expected) {
    return Response.json(
      { error: 'MCP_API_KEY is not configured' },
      { status: 503 },
    );
  }

  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, candidate] = authorization.split(' ', 2);
  if (scheme.toLowerCase() !== 'bearer' || !sameSecret(candidate ?? '', expected)) {
    return Response.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer realm="DanielStock MCP"' },
      },
    );
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid Origin' }, { status: 403 });
  }

  return null;
}

async function serve(request: Request) {
  return authorize(request) ?? handler.fetch(request);
}

export const GET = serve;
export const POST = serve;
export const DELETE = serve;
