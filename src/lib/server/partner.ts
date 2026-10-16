// Verbindung zwischen den Admin Centern der Sechszirbenhütte und der
// Natberger Hütte („Partner“). Gegenstück: lib/server/partner.ts im Repo
// natbergerhuette — beide Dateien müssen dasselbe Protokoll sprechen.
//
// - Beide Seiten speichern die Adresse der anderen und denselben geheimen
//   Schlüssel in der settings-Tabelle. Der Schlüssel verlässt den Server nur
//   einmal: im Kopplungscode, den der Admin ins andere Admin Center einfügt.
// - Aufrufe von Server zu Server gehen an /api/partner und sind mit
//   HMAC-SHA256 über Zeitstempel, Einmalwert und Body signiert. Jeder
//   Einmalwert gilt genau einmal (Tabelle partner_nonces), Zeitstempel
//   höchstens fünf Minuten alt.
// - Wechsel ins andere Admin Center: signiertes Ticket (60 s, einmalig). Das
//   Ziel meldet nur an, wenn es das selbst erlaubt (partner_sso_allowed) —
//   sonst landet man dort auf der normalen Anmeldung.

import { getSetting, setSetting } from '@/lib/server/beds24';

/** Kennung und Name dieser Hütte im Partner-Protokoll */
export const HUT_KEY = 'szh';
export const HUT_NAME = 'Sechszirbenhütte';

const KEY_URL = 'partner_url';
const KEY_SECRET = 'partner_secret';
const KEY_NAME = 'partner_name';
const KEY_HUT = 'partner_hut';
const KEY_PENDING_SECRET = 'partner_pending_secret';
const KEY_PENDING_EXPIRES = 'partner_pending_expires';
export const KEY_SSO_ALLOWED = 'partner_sso_allowed';

const CODE_PREFIX = 'HUETTE1.';
const MAX_CLOCK_SKEW_S = 300;
const TICKET_TTL_S = 60;
const INVITE_TTL_MS = 15 * 60_000;

export interface PartnerConnection {
  url: string;
  secret: string;
  name: string;
  hut: string;
}

// ============================================================================
// Hilfsfunktionen
// ============================================================================

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function encodeJson(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson(value: string): unknown {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(value)));
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomSecret(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function deleteSettings(db: D1Database, keys: string[]) {
  for (const key of keys) {
    await db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
  }
}

/** Nur https-Adressen (lokal auch http://localhost), ohne Pfad */
export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function ensureNonceTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS partner_nonces (
        nonce TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL
      )`,
    )
    .run();
}

/** Einmalwert verbrauchen — false, wenn er schon einmal benutzt wurde */
async function consumeNonce(db: D1Database, nonce: string): Promise<boolean> {
  await ensureNonceTable(db);
  await db.prepare("DELETE FROM partner_nonces WHERE expires_at <= datetime('now')").run();
  const result = await db
    .prepare(
      "INSERT OR IGNORE INTO partner_nonces (nonce, expires_at) VALUES (?, datetime('now', '+15 minutes'))",
    )
    .bind(nonce)
    .run();
  return (result.meta?.changes ?? 0) === 1;
}

// ============================================================================
// Verbindung lesen, koppeln, trennen
// ============================================================================

export async function getPartnerConnection(db: D1Database): Promise<PartnerConnection | null> {
  const [url, secret, name, hut] = await Promise.all([
    getSetting(db, KEY_URL),
    getSetting(db, KEY_SECRET),
    getSetting(db, KEY_NAME),
    getSetting(db, KEY_HUT),
  ]);
  if (!url || !secret) return null;
  return { url, secret, name: name || 'Partner-Hütte', hut: hut || '' };
}

export async function isSsoAllowed(db: D1Database): Promise<boolean> {
  return (await getSetting(db, KEY_SSO_ALLOWED)) === '1';
}

export async function setSsoAllowed(db: D1Database, allowed: boolean) {
  await setSetting(db, KEY_SSO_ALLOWED, allowed ? '1' : '0');
}

export async function hasPendingInvite(db: D1Database): Promise<boolean> {
  const expires = Number(await getSetting(db, KEY_PENDING_EXPIRES));
  return Number.isFinite(expires) && expires > Date.now();
}

/**
 * Kopplungscode erzeugen: enthält Adresse, Namen und den neuen Schlüssel.
 * Gilt 15 Minuten und nur für eine Kopplung.
 */
export async function createInvite(
  db: D1Database,
  origin: string,
): Promise<{ code: string; expiresAt: number }> {
  const secret = randomSecret();
  const expiresAt = Date.now() + INVITE_TTL_MS;
  await setSetting(db, KEY_PENDING_SECRET, secret);
  await setSetting(db, KEY_PENDING_EXPIRES, String(expiresAt));
  const code = CODE_PREFIX + encodeJson({ u: origin, s: secret, n: HUT_NAME, h: HUT_KEY });
  return { code, expiresAt };
}

export async function storeConnection(db: D1Database, conn: PartnerConnection) {
  await setSetting(db, KEY_URL, conn.url);
  await setSetting(db, KEY_SECRET, conn.secret);
  await setSetting(db, KEY_NAME, conn.name.slice(0, 80));
  await setSetting(db, KEY_HUT, conn.hut.slice(0, 40));
  await deleteSettings(db, [KEY_PENDING_SECRET, KEY_PENDING_EXPIRES]);
}

export async function clearConnection(db: D1Database) {
  await deleteSettings(db, [
    KEY_URL,
    KEY_SECRET,
    KEY_NAME,
    KEY_HUT,
    KEY_PENDING_SECRET,
    KEY_PENDING_EXPIRES,
  ]);
}

/**
 * Kopplungscode des anderen Admin Centers einlösen: dort die eigene Adresse
 * hinterlegen (signiert mit dem Schlüssel aus dem Code), dann hier speichern.
 */
export async function acceptInvite(
  db: D1Database,
  code: string,
  ownOrigin: string,
): Promise<{ name?: string; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return { error: 'Das ist kein Kopplungscode' };
  let data: { u?: unknown; s?: unknown; n?: unknown; h?: unknown };
  try {
    data = decodeJson(trimmed.slice(CODE_PREFIX.length)) as typeof data;
  } catch {
    return { error: 'Kopplungscode unvollständig — bitte komplett kopieren' };
  }
  const url = normalizeOrigin(String(data.u ?? ''));
  const secret = String(data.s ?? '');
  const hut = String(data.h ?? '');
  if (!url || secret.length < 32) return { error: 'Kopplungscode ungültig' };
  if (hut === HUT_KEY || url === ownOrigin) {
    return { error: 'Der Code stammt aus diesem Admin Center — bitte im anderen einfügen' };
  }

  const conn: PartnerConnection = { url, secret, name: String(data.n ?? ''), hut };
  const result = await signedFetch<{ name?: string; hut?: string }>(conn, {
    action: 'pair',
    url: ownOrigin,
    name: HUT_NAME,
    hut: HUT_KEY,
  });
  if (result.error) return { error: result.error };
  await storeConnection(db, {
    ...conn,
    name: result.data?.name || conn.name || 'Partner-Hütte',
    hut: result.data?.hut || hut,
  });
  return { name: result.data?.name || conn.name };
}

// ============================================================================
// Signierte Aufrufe
// ============================================================================

export interface PartnerResult<T> {
  data?: T;
  error?: string;
  status?: number;
  /** Zusatzangaben der Fehlerantwort, z. B. needsRoom */
  needsRoom?: boolean;
}

async function signedFetch<T>(
  conn: PartnerConnection,
  payload: Record<string, unknown>,
): Promise<PartnerResult<T>> {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const signature = await hmac(conn.secret, `${timestamp}.${nonce}.${body}`);
  let res: Response;
  try {
    res = await fetch(`${conn.url}/api/partner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Partner-Timestamp': timestamp,
        'X-Partner-Nonce': nonce,
        'X-Partner-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return { error: `${conn.name || 'Partner'} nicht erreichbar`, status: 502 };
  }
  const text = await res.text();
  let data: (T & { error?: string; needsRoom?: boolean }) | undefined;
  try {
    data = text ? (JSON.parse(text) as T & { error?: string; needsRoom?: boolean }) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    return {
      error: data?.error || `${conn.name || 'Partner'} antwortete mit HTTP ${res.status}`,
      status: res.status,
      needsRoom: data?.needsRoom === true,
    };
  }
  return { data };
}

/** Aktion beim verbundenen Admin Center ausführen */
export async function callPartner<T>(
  db: D1Database,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<PartnerResult<T>> {
  const conn = await getPartnerConnection(db);
  if (!conn) return { error: 'Kein Admin Center verbunden', status: 400 };
  return signedFetch<T>(conn, { ...payload, action });
}

/**
 * Eingehenden Aufruf prüfen. Die Kopplung selbst ('pair') ist mit dem
 * Schlüssel aus dem noch offenen Kopplungscode signiert, alles andere mit
 * dem Schlüssel der bestehenden Verbindung.
 */
export async function verifyPartnerRequest(
  db: D1Database,
  request: Request,
): Promise<{ body?: Record<string, unknown>; error?: string; status: number }> {
  const timestamp = request.headers.get('X-Partner-Timestamp') || '';
  const nonce = request.headers.get('X-Partner-Nonce') || '';
  const signature = request.headers.get('X-Partner-Signature') || '';
  const raw = await request.text();
  if (!timestamp || !nonce || !signature || raw.length > 400_000) {
    return { error: 'Ungültige Anfrage', status: 400 };
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_CLOCK_SKEW_S) {
    return { error: 'Anfrage abgelaufen', status: 401 };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { error: 'Ungültige Anfrage', status: 400 };
  }

  let secret: string | null = null;
  if (body.action === 'pair') {
    if (await hasPendingInvite(db)) secret = await getSetting(db, KEY_PENDING_SECRET);
    if (!secret) return { error: 'Kein offener Kopplungscode — bitte neu erzeugen', status: 401 };
  } else {
    secret = (await getPartnerConnection(db))?.secret ?? null;
    if (!secret) return { error: 'Nicht (mehr) verbunden', status: 401 };
  }

  const expected = await hmac(secret, `${timestamp}.${nonce}.${raw}`);
  if (!safeEqual(expected, signature)) return { error: 'Signatur ungültig', status: 401 };
  if (!(await consumeNonce(db, nonce)))
    return { error: 'Anfrage bereits verarbeitet', status: 401 };
  return { body, status: 200 };
}

/** Zweite Hälfte der Kopplung: Adresse des anderen Admin Centers übernehmen */
export async function completePairing(
  db: D1Database,
  body: Record<string, unknown>,
): Promise<{ error?: string }> {
  const url = normalizeOrigin(String(body.url ?? ''));
  const secret = await getSetting(db, KEY_PENDING_SECRET);
  if (!url || !secret) return { error: 'Kopplung unvollständig' };
  await storeConnection(db, {
    url,
    secret,
    name: String(body.name ?? '') || 'Partner-Hütte',
    hut: String(body.hut ?? ''),
  });
  return {};
}

// ============================================================================
// Wechsel ins andere Admin Center
// ============================================================================

/** Adresse, die mit einem einmaligen Ticket ins andere Admin Center wechselt */
export async function createSwitchUrl(db: D1Database, tab?: string): Promise<string | null> {
  const conn = await getPartnerConnection(db);
  if (!conn) return null;
  const payload = encodeJson({
    ts: Math.floor(Date.now() / 1000),
    nonce: crypto.randomUUID(),
    tab: tab && /^[a-z0-9-]{1,30}$/.test(tab) ? tab : undefined,
  });
  const signature = await hmac(conn.secret, `switch.${payload}`);
  return `${conn.url}/api/partner?ticket=${payload}.${signature}`;
}

/** Ticket prüfen und verbrauchen; liefert den gewünschten Tab */
export async function verifySwitchTicket(
  db: D1Database,
  ticket: string,
): Promise<{ ok: boolean; tab?: string }> {
  const conn = await getPartnerConnection(db);
  const [payload, signature] = ticket.split('.');
  if (!conn || !payload || !signature) return { ok: false };
  const expected = await hmac(conn.secret, `switch.${payload}`);
  if (!safeEqual(expected, signature)) return { ok: false };
  let data: { ts?: unknown; nonce?: unknown; tab?: unknown };
  try {
    data = decodeJson(payload) as typeof data;
  } catch {
    return { ok: false };
  }
  const age = Date.now() / 1000 - Number(data.ts);
  if (!Number.isFinite(age) || age < -MAX_CLOCK_SKEW_S || age > TICKET_TTL_S) return { ok: false };
  if (!(await consumeNonce(db, `switch:${String(data.nonce)}`))) return { ok: false };
  const tab = typeof data.tab === 'string' ? data.tab : undefined;
  return { ok: true, tab };
}
