import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  deleteAdminSession,
  ensureAuthTables,
  getAdminSessionToken,
  getAuthDb,
  hashAdminPassword,
  isAdminAuthenticated,
  KEY_ADMIN_CODE_HASH,
  sessionCookieOptions,
  timingSafeEqualString,
  verifyAdminPassword,
} from '@/lib/server/adminAuth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * ============================================================================
 * ADMIN-LOGIN mit Passwort (wie bei der Natberger Hütte)
 * ============================================================================
 *
 * Diese Route ist als einzige unter /api/admin ohne Anmeldung erreichbar
 * (Ausnahme in src/proxy.ts) — sonst käme niemand zum Login.
 *
 * Woher das Passwort kommt:
 *  - `settings.admin_code_hash` — der reguläre Weg. Gesetzt im Admin Center
 *    (Tab System) oder von aussen mit `npm run set-admin-password` (schreibt
 *    den PBKDF2-Hash direkt nach D1, ohne Deployment).
 *  - `env.ADMIN_PASSWORD` — Notfallzugang als Cloudflare-Secret. Greift erst
 *    ab dem Deployment, das nach dem Setzen gebaut wurde.
 */

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

// Fehlversuche pro IP, bevor 15 Minuten Pause erzwungen wird
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 10;

async function getEnvPassword(): Promise<string> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as Env;
    return (env.ADMIN_PASSWORD || env.ADMIN_PWD || '').trim();
  } catch {
    return '';
  }
}

async function isRateLimited(db: D1Database, ip: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM admin_login_attempts
        WHERE ip = ? AND created_at > datetime('now', ?)`,
    )
    .bind(ip, `-${ATTEMPT_WINDOW_MINUTES} minutes`)
    .first<{ cnt: number }>();
  return (row?.cnt || 0) >= MAX_ATTEMPTS;
}

async function recordFailedAttempt(db: D1Database, ip: string): Promise<void> {
  await db.prepare('INSERT INTO admin_login_attempts (ip) VALUES (?)').bind(ip).run();
  await db
    .prepare("DELETE FROM admin_login_attempts WHERE created_at <= datetime('now', '-1 day')")
    .run();
}

async function getStoredHash(db: D1Database): Promise<string> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .bind(KEY_ADMIN_CODE_HASH)
    .first<{ value: string }>();
  return row?.value || '';
}

// GET — Status für den Login-Screen (bewusst ohne Anmeldung erreichbar)
export async function GET(request: NextRequest) {
  const db = await getAuthDb();
  if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });
  await ensureAuthTables(db);

  const storedHash = await getStoredHash(db);
  const envPassword = await getEnvPassword();
  return NextResponse.json({
    authenticated: await isAdminAuthenticated(request),
    // Kein Passwort hinterlegt: Ersteinrichtung nötig (Login sonst unmöglich)
    setupRequired: !storedHash && !envPassword,
    hasStoredPassword: !!storedHash,
  });
}

// POST — Login, Logout, Passwort ändern, alle Sessions beenden
export async function POST(request: NextRequest) {
  const db = await getAuthDb();
  if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });
  await ensureAuthTables(db);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || '');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (action === 'logout') {
    const token = getAdminSessionToken(request);
    if (token) await deleteAdminSession(db, token);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }

  if (action === 'login') {
    if (await isRateLimited(db, ip)) {
      return NextResponse.json(
        { error: `Zu viele Fehlversuche. Bitte ${ATTEMPT_WINDOW_MINUTES} Minuten warten.` },
        { status: 429 },
      );
    }

    const password = String(body.password || '').trim();
    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 });
    }

    const storedHash = await getStoredHash(db);
    let ok = storedHash ? await verifyAdminPassword(password, storedHash) : false;
    // Notfallzugang über das Cloudflare-Secret — gilt auch neben einem
    // gespeicherten Passwort, damit ein vergessenes Passwort nicht aussperrt.
    const envPassword = await getEnvPassword();
    if (!ok && envPassword) ok = timingSafeEqualString(password, envPassword);

    if (!ok) {
      await recordFailedAttempt(db, ip);
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
    }

    await db.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').bind(ip).run();
    const token = await createAdminSession(db);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  }

  // Ab hier nur für Angemeldete
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  if (action === 'set_password') {
    const password = String(body.password || '').trim();
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` },
        { status: 400 },
      );
    }
    await db
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      )
      .bind(KEY_ADMIN_CODE_HASH, await hashAdminPassword(password))
      .run();
    return NextResponse.json({ success: true });
  }

  // Alle anderen Sessions beenden (z. B. nach Geräteverlust)
  if (action === 'logout_everywhere') {
    await db.prepare('DELETE FROM admin_auth_sessions').run();
    // Die aktuelle Session neu anlegen, damit man sich nicht selbst aussperrt
    const fresh = await createAdminSession(db);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, fresh, sessionCookieOptions());
    return response;
  }

  return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
}
