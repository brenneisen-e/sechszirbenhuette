import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * ============================================================================
 * ADMIN-AUTHENTIFIZIERUNG (übernommen von der Natberger Hütte)
 * ============================================================================
 *
 * Das Admin Center hat einen eigenen Login mit Admin-Passwort. Die Prüfung
 * passiert zentral in cloudflare-worker.js für jede Route unter /api/admin —
 * sie ist die einzige Schranke, das Admin Center hängt nicht an Cloudflare
 * Zero Trust. Deshalb gilt:
 *
 * - Sessions liegen serverseitig in D1. Im Cookie steht nur ein Zufallstoken,
 *   in der Datenbank ausschließlich dessen SHA-256-Hash. Ein geratenes oder
 *   selbst gesetztes Cookie kommt damit nicht durch.
 * - Das Passwort wird als PBKDF2-Hash gespeichert (settings.admin_code_hash),
 *   nie im Klartext. Notfallzugang: Cloudflare-Secret ADMIN_PASSWORD.
 * - Vergleiche laufen in konstanter Zeit, Fehlversuche werden pro IP gebremst.
 *
 * Die Tabelle heißt admin_auth_sessions: Die ältere admin_sessions der
 * Sechszirbenhütte hat ein anderes Schema und speichert Tokens im Klartext.
 */

export const ADMIN_SESSION_COOKIE = 'szh_admin_session';

/** Gültigkeitsdauer einer Admin-Session. */
export const ADMIN_SESSION_TTL_DAYS = 30;

/** PBKDF2-Runden — muss zu scripts/set-admin-password.mjs passen. */
const PBKDF2_ITERATIONS = 150_000;

/** Speicherort des Passwort-Hashes in der settings-Tabelle. */
export const KEY_ADMIN_CODE_HASH = 'admin_code_hash';

export async function getAuthDb(): Promise<D1Database | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return (ctx.env as { DB?: D1Database }).DB ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// TABELLEN
// ============================================================================

let tablesVerified = false;

/**
 * Legt die Auth-Tabellen an, falls sie fehlen. Bewusst nicht nur über die
 * Auto-Migration: die sitzt selbst hinter dem Login.
 */
export async function ensureAuthTables(db: D1Database): Promise<void> {
  if (tablesVerified) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  tablesVerified = true;
}

// ============================================================================
// KRYPTO-HELFER (Web Crypto — läuft im Workers-Runtime)
// ============================================================================

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Vergleich in konstanter Zeit — verrät nicht, ab welchem Byte es abweicht. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Zeitkonstanter Vergleich zweier Strings (für das Notfall-Secret). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Erzeugt den Speicherwert für ein Passwort: `pbkdf2$<runden>$<salt>$<hash>`. */
export async function hashAdminPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

/** Prüft ein Passwort gegen den gespeicherten PBKDF2-Wert. */
export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, rounds, saltText, hashText] = stored.split('$');
  if (scheme !== 'pbkdf2' || !rounds || !saltText || !hashText) return false;
  const iterations = parseInt(rounds, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const derived = await pbkdf2(password, fromBase64(saltText), iterations);
    return timingSafeEqual(derived, fromBase64(hashText));
  } catch {
    return false;
  }
}

// ============================================================================
// SESSIONS
// ============================================================================

/** Cookie aus dem Request lesen — funktioniert für NextRequest und Request. */
function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    if (rawKey?.trim() === name) return rest.join('=').trim() || null;
  }
  return null;
}

/**
 * Neue Session anlegen. Gibt das Klartext-Token zurück — nur dieses kommt ins
 * Cookie, gespeichert wird ausschließlich der Hash.
 */
export async function createAdminSession(db: D1Database): Promise<string> {
  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO admin_auth_sessions (token_hash, expires_at)
       VALUES (?, datetime('now', ?))`,
    )
    .bind(await sha256Hex(token), `+${ADMIN_SESSION_TTL_DAYS} days`)
    .run();
  // Abgelaufene Sessions bei der Gelegenheit aufräumen
  await db.prepare("DELETE FROM admin_auth_sessions WHERE expires_at <= datetime('now')").run();
  return token;
}

export async function deleteAdminSession(db: D1Database, token: string): Promise<void> {
  await db
    .prepare('DELETE FROM admin_auth_sessions WHERE token_hash = ?')
    .bind(await sha256Hex(token))
    .run();
}

/** Prüft, ob der Request eine gültige Admin-Session mitbringt. */
export async function isAdminAuthenticated(request: Request): Promise<boolean> {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!token) return false;

  const db = await getAuthDb();
  if (!db) return false;

  try {
    const row = await db
      .prepare(
        `SELECT id FROM admin_auth_sessions
          WHERE token_hash = ? AND expires_at > datetime('now')
          LIMIT 1`,
      )
      .bind(await sha256Hex(token))
      .first<{ id: number }>();
    return !!row;
  } catch {
    // Tabelle fehlt noch (erster Start) — dann ist niemand angemeldet
    return false;
  }
}

/** Token der aktuellen Session, z. B. zum Abmelden. */
export function getAdminSessionToken(request: Request): string | null {
  return readCookie(request, ADMIN_SESSION_COOKIE);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(Date.now() + ADMIN_SESSION_TTL_DAYS * 86400_000),
  };
}
