import { createHash, randomBytes } from 'node:crypto';

import type { Pool } from 'pg';

import { database } from '@/lib/database';

export const OAUTH_SCOPES = ['stocks:read', 'stocks:write'] as const;
const ACCESS_TOKEN_SECONDS = 60 * 60;
const REFRESH_TOKEN_SECONDS = 60 * 60 * 24 * 30;
const AUTHORIZATION_CODE_SECONDS = 10 * 60;

type OAuthClientRow = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  created_at: Date;
};

type AuthorizationCodeRow = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scopes: string[];
  resource: string;
};

type OAuthTokenRow = {
  client_id: string;
  scopes: string[];
  resource: string;
  expires_at: Date;
};

function requiredDatabase() {
  const sql = database();
  if (!sql) throw new Error('DATABASE_URL is required for OAuth');
  return sql;
}

export async function ensureOAuthSchema(sql: Pool) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id text PRIMARY KEY,
      client_name text NOT NULL,
      redirect_uris jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
      code_hash text PRIMARY KEY,
      client_id text NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
      redirect_uri text NOT NULL,
      code_challenge text NOT NULL,
      scopes text[] NOT NULL,
      resource text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      token_hash text PRIMARY KEY,
      token_kind text NOT NULL CHECK (token_kind IN ('access', 'refresh')),
      client_id text NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
      scopes text[] NOT NULL,
      resource text NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS oauth_tokens_client_kind_idx
      ON oauth_tokens (client_id, token_kind, expires_at DESC);
  `);
}

export function oauthIssuer(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    return `${forwardedProto || 'https'}://${forwardedHost.split(',')[0].trim()}`;
  }
  return new URL(request.url).origin;
}

export function mcpResource(request: Request) {
  return `${oauthIssuer(request)}/api/mcp`;
}

export function authorizationServerMetadata(request: Request) {
  const issuer = oauthIssuer(request);
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...OAUTH_SCOPES],
    authorization_response_iss_parameter_supported: true,
  };
}

export function protectedResourceMetadata(request: Request) {
  return {
    resource: mcpResource(request),
    authorization_servers: [oauthIssuer(request)],
    scopes_supported: [...OAUTH_SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: `${oauthIssuer(request)}/`,
  };
}

function opaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function isLoopback(url: URL) {
  return url.protocol === 'http:' &&
    (url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === 'localhost');
}

export function validRedirectUri(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || isLoopback(url);
  } catch {
    return false;
  }
}

function redirectMatches(registered: string, requested: string) {
  if (registered === requested) return true;
  try {
    const a = new URL(registered);
    const b = new URL(requested);
    return isLoopback(a) && isLoopback(b) &&
      a.protocol === b.protocol &&
      a.hostname === b.hostname &&
      a.pathname === b.pathname &&
      a.search === b.search;
  } catch {
    return false;
  }
}

export async function registerOAuthClient(input: {
  clientName: string;
  redirectUris: string[];
}) {
  const sql = requiredDatabase();
  await ensureOAuthSchema(sql);
  const clientId = `ds_${opaqueToken(24)}`;
  const result = await sql.query<OAuthClientRow>(
    `INSERT INTO oauth_clients (client_id, client_name, redirect_uris)
     VALUES ($1, $2, $3::jsonb)
     RETURNING *`,
    [clientId, input.clientName, JSON.stringify(input.redirectUris)],
  );
  return result.rows[0];
}

export async function getOAuthClient(clientId: string) {
  const sql = requiredDatabase();
  await ensureOAuthSchema(sql);
  const result = await sql.query<OAuthClientRow>(
    'SELECT * FROM oauth_clients WHERE client_id = $1',
    [clientId],
  );
  return result.rows[0] ?? null;
}

export function clientAllowsRedirect(client: OAuthClientRow, redirectUri: string) {
  return client.redirect_uris.some((registered) => redirectMatches(registered, redirectUri));
}

export function parseScopes(value: string | null) {
  const scopes = value?.split(/\s+/).filter(Boolean) ?? [...OAUTH_SCOPES];
  if (!scopes.length || scopes.some((scope) => !OAUTH_SCOPES.includes(scope as never))) {
    return null;
  }
  return [...new Set(scopes)];
}

export async function issueAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  resource: string;
}) {
  const sql = requiredDatabase();
  await ensureOAuthSchema(sql);
  const code = opaqueToken();
  await sql.query(
    `INSERT INTO oauth_authorization_codes (
       code_hash, client_id, redirect_uri, code_challenge, scopes, resource, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 * interval '1 second'))`,
    [
      tokenHash(code),
      input.clientId,
      input.redirectUri,
      input.codeChallenge,
      input.scopes,
      input.resource,
      AUTHORIZATION_CODE_SECONDS,
    ],
  );
  return code;
}

async function consumeAuthorizationCode(code: string) {
  const sql = requiredDatabase();
  await ensureOAuthSchema(sql);
  const result = await sql.query<AuthorizationCodeRow>(
    `UPDATE oauth_authorization_codes
     SET used_at = now()
     WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING client_id, redirect_uri, code_challenge, scopes, resource`,
    [tokenHash(code)],
  );
  return result.rows[0] ?? null;
}

function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

async function saveTokenPair(input: {
  clientId: string;
  scopes: string[];
  resource: string;
}) {
  const sql = requiredDatabase();
  const accessToken = `dsa_${opaqueToken()}`;
  const refreshToken = `dsr_${opaqueToken()}`;
  await sql.query(
    `INSERT INTO oauth_tokens (
       token_hash, token_kind, client_id, scopes, resource, expires_at
     ) VALUES
       ($1, 'access', $3, $4, $5, now() + ($6 * interval '1 second')),
       ($2, 'refresh', $3, $4, $5, now() + ($7 * interval '1 second'))`,
    [
      tokenHash(accessToken),
      tokenHash(refreshToken),
      input.clientId,
      input.scopes,
      input.resource,
      ACCESS_TOKEN_SECONDS,
      REFRESH_TOKEN_SECONDS,
    ],
  );
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_SECONDS,
    refresh_token: refreshToken,
    scope: input.scopes.join(' '),
  };
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource?: string;
}) {
  const record = await consumeAuthorizationCode(input.code);
  if (!record ||
      record.client_id !== input.clientId ||
      record.redirect_uri !== input.redirectUri ||
      pkceChallenge(input.codeVerifier) !== record.code_challenge ||
      (input.resource && input.resource !== record.resource)) {
    return null;
  }
  return saveTokenPair({
    clientId: record.client_id,
    scopes: record.scopes,
    resource: record.resource,
  });
}

export async function exchangeRefreshToken(input: {
  refreshToken: string;
  clientId: string;
  resource?: string;
}) {
  const sql = requiredDatabase();
  await ensureOAuthSchema(sql);
  const result = await sql.query<OAuthTokenRow>(
    `UPDATE oauth_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND token_kind = 'refresh' AND client_id = $2
       AND revoked_at IS NULL AND expires_at > now()
     RETURNING client_id, scopes, resource, expires_at`,
    [tokenHash(input.refreshToken), input.clientId],
  );
  const record = result.rows[0];
  if (!record || (input.resource && input.resource !== record.resource)) return null;
  return saveTokenPair({
    clientId: record.client_id,
    scopes: record.scopes,
    resource: record.resource,
  });
}

export async function verifyOAuthAccessToken(token: string, resource: string) {
  const sql = requiredDatabase();
  await ensureOAuthSchema(sql);
  const result = await sql.query<OAuthTokenRow>(
    `SELECT client_id, scopes, resource, expires_at
     FROM oauth_tokens
     WHERE token_hash = $1 AND token_kind = 'access'
       AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash(token)],
  );
  const record = result.rows[0];
  if (!record || record.resource !== resource) return null;
  return {
    token,
    clientId: record.client_id,
    scopes: record.scopes,
    expiresAt: Math.floor(record.expires_at.getTime() / 1000),
    resource: new URL(record.resource),
  };
}
