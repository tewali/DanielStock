const COOKIE_NAME = 'portfolio_session';
const SESSION_PAYLOAD = 'portfolio-cockpit-access-v1';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const STATIC_DASHBOARD_PASSWORD = 'DanielsDashboard';

function password() {
  if (process.env.DASHBOARD_PASSWORD) return process.env.DASHBOARD_PASSWORD;
  return process.env.NODE_ENV === 'development'
    ? STATIC_DASHBOARD_PASSWORD
    : '';
}

async function sessionToken() {
  const secret = password();
  if (!secret) return '';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(SESSION_PAYLOAD),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function cookieValue(cookieHeader: string | null) {
  if (!cookieHeader) return '';
  const prefix = `${COOKIE_NAME}=`;
  return (
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? ''
  );
}

export function isPasswordConfigured() {
  return password().length > 0;
}

export function matchesPassword(candidate: string) {
  const configured = password();
  return configured !== '' && candidate === configured;
}

export async function isAuthenticated(cookieHeader: string | null) {
  const expected = await sessionToken();
  return expected !== '' && cookieValue(cookieHeader) === expected;
}

export async function createSessionCookie() {
  const token = await sessionToken();
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
