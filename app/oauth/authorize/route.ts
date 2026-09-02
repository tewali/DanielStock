import { isPasswordConfigured, matchesPassword } from '@/lib/auth';
import {
  clientAllowsRedirect,
  getOAuthClient,
  issueAuthorizationCode,
  mcpResource,
  oauthIssuer,
  parseScopes,
} from '@/lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuthorizationRequest = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes: string[];
  resource: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pageResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'x-frame-options': 'DENY',
    },
  });
}

function renderConsent(input: AuthorizationRequest, error?: string) {
  const scopeDescription = input.scopes.includes('stocks:write')
    ? 'Aktien lesen, hinzufügen, entfernen und Analysen aktualisieren'
    : 'Aktien und Analysen lesen';
  const hidden = [
    ['client_id', input.clientId],
    ['redirect_uri', input.redirectUri],
    ['code_challenge', input.codeChallenge],
    ['code_challenge_method', 'S256'],
    ['response_type', 'code'],
    ['state', input.state],
    ['scope', input.scopes.join(' ')],
    ['resource', input.resource],
  ]
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`)
    .join('');
  const isLoopbackCallback = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//i.test(
    input.redirectUri,
  );
  const callbackLabel = isLoopbackCallback
    ? 'Lokaler Rücksprung zu Codex auf diesem Gerät'
    : 'Rücksprungadresse des Clients';

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DanielStock verbinden</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:#edeFEA;color:#17211e;font:14px/1.5 system-ui,sans-serif}.card{width:min(440px,100%);background:#fff;border:1px solid #c9d0c9;border-radius:8px;box-shadow:0 24px 80px rgba(23,33,30,.18);overflow:hidden}.head{padding:24px;border-bottom:1px solid #e3e7e1}.icon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#e4e9f4;color:#27407f;font-size:21px;margin-bottom:14px}h1{font-size:21px;margin:0 0 6px}p{margin:0;color:#5f6c68}.body{padding:22px 24px}.client{padding:12px;background:#f5f7f4;border:1px solid #e3e7e1;border-radius:5px;margin-bottom:18px}.client strong{display:block;color:#17211e}.callback-label{display:block;margin-top:5px;color:#5f6c68;font-size:12px}.callback-url{display:block;overflow-wrap:anywhere;color:#394641;font-size:12px}.scope{margin:14px 0 18px;padding-left:22px;color:#394641}label{display:grid;gap:7px;font-weight:600}input[type=password]{width:100%;height:42px;border:1px solid #bfc7c0;border-radius:4px;padding:0 12px;font:inherit}.error{color:#98392d;margin:0 0 12px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}button{height:42px;border-radius:4px;border:1px solid #bfc7c0;background:#fff;font-weight:650;cursor:pointer}.approve{border-color:#27407f;background:#27407f;color:#fff}.fine{font-size:12px;margin-top:16px}
</style></head><body><main class="card"><div class="head"><div class="icon">✓</div><h1>DanielStock verbinden</h1><p>Ein MCP-Client bittet um Zugriff auf dein Portfolio.</p></div><form method="post" action="/oauth/authorize" class="body">${hidden}<div class="client"><strong>${escapeHtml(input.clientName)}</strong><span class="callback-label">${callbackLabel}</span><code class="callback-url">${escapeHtml(input.redirectUri)}</code></div><p>Nach der Freigabe darf dieser Client:</p><ul class="scope"><li>${scopeDescription}</li><li>Marktpreise ausschließlich über Yahoo Finance aktualisieren</li></ul>${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}<label for="password">Dashboard-Passwort<input id="password" name="password" type="password" autocomplete="current-password" required></label><div class="actions"><button name="decision" value="deny" type="submit">Ablehnen</button><button class="approve" name="decision" value="approve" type="submit">Verbinden</button></div><p class="fine">Die Freigabe kann durch Löschen der OAuth-Tokens in PostgreSQL widerrufen werden.</p></form></main></body></html>`;
}

async function validateAuthorization(
  request: Request,
  values: URLSearchParams | FormData,
): Promise<AuthorizationRequest | string> {
  const get = (name: string) => {
    const value = values.get(name);
    return typeof value === 'string' ? value : '';
  };
  const clientId = get('client_id');
  const redirectUri = get('redirect_uri');
  const responseType = get('response_type');
  const codeChallenge = get('code_challenge');
  const method = get('code_challenge_method');
  const scopes = parseScopes(get('scope') || null);
  const resource = get('resource') || mcpResource(request);
  const client = clientId ? await getOAuthClient(clientId) : null;

  if (!client) return 'Unbekannter OAuth-Client.';
  if (!clientAllowsRedirect(client, redirectUri)) return 'Die Callback-Adresse ist nicht registriert.';
  if (responseType !== 'code') return 'Nur der Authorization-Code-Flow wird unterstützt.';
  if (method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) {
    return 'PKCE mit S256 ist erforderlich.';
  }
  if (!scopes) return 'Der angeforderte Berechtigungsumfang ist ungültig.';
  if (resource !== mcpResource(request)) return 'Die angeforderte Ressource ist ungültig.';
  return {
    clientId,
    clientName: client.client_name,
    redirectUri,
    codeChallenge,
    state: get('state'),
    scopes,
    resource,
  };
}

export async function GET(request: Request) {
  try {
    const input = await validateAuthorization(request, new URL(request.url).searchParams);
    if (typeof input === 'string') return pageResponse(`<h1>OAuth-Anfrage ungültig</h1><p>${escapeHtml(input)}</p>`, 400);
    return pageResponse(renderConsent(input));
  } catch (error) {
    return pageResponse(`<h1>OAuth nicht verfügbar</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Unbekannter Fehler')}</p>`, 503);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const input = await validateAuthorization(request, form);
    if (typeof input === 'string') return pageResponse(`<h1>OAuth-Anfrage ungültig</h1><p>${escapeHtml(input)}</p>`, 400);

    const redirect = new URL(input.redirectUri);
    const decision = form.get('decision');
    if (decision !== 'approve') {
      redirect.searchParams.set('error', 'access_denied');
      if (input.state) redirect.searchParams.set('state', input.state);
      return Response.redirect(redirect, 303);
    }
    const password = form.get('password');
    if (!isPasswordConfigured() || typeof password !== 'string' || !matchesPassword(password)) {
      return pageResponse(renderConsent(input, 'Das Dashboard-Passwort ist nicht korrekt.'), 401);
    }

    const code = await issueAuthorizationCode({
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      scopes: input.scopes,
      resource: input.resource,
    });
    redirect.searchParams.set('code', code);
    if (input.state) redirect.searchParams.set('state', input.state);
    redirect.searchParams.set('iss', oauthIssuer(request));
    return Response.redirect(redirect, 303);
  } catch (error) {
    return pageResponse(`<h1>OAuth nicht verfügbar</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Unbekannter Fehler')}</p>`, 503);
  }
}
