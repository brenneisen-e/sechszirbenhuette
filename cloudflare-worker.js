// Einstieg für Cloudflare Pages (wird beim `npm run pages:build` zu
// `.open-next/assets/_worker.js`). Zentrale Schranke für alle Admin-APIs:
// Jede Route unter /api/admin braucht eine gültige Admin-Session — geprüft
// hier, bevor Next.js den Request überhaupt sieht. Neue Routen sind damit
// automatisch geschützt.
//
// Früher lag die Schranke in src/middleware.ts. Next.js 16 erlaubt dafür nur
// noch Node (proxy.ts), was OpenNext auf Cloudflare als experimentell führt.
//
// Ausnahmen:
// - /api/admin/auth — der Login selbst
// - /api/admin/media/file/… — liefert Bilder aus R2 für die öffentliche Website
//
// Gleiche Session-Prüfung wie isAdminAuthenticated in
// src/lib/server/adminAuth.ts (Cookie, SHA-256-Hash in admin_auth_sessions).

import openNext from './opennext-worker.js';

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './opennext-worker.js';

const ADMIN_SESSION_COOKIE = 'szh_admin_session';

function normalizePath(pathname) {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Kaputte Kodierung — dann so prüfen, wie sie ist
  }
  return path.replace(/\/{2,}/g, '/').toLowerCase();
}

function isAdminApi(path) {
  return path === '/api/admin' || path.startsWith('/api/admin/');
}

function isPublic(path) {
  return path === '/api/admin/auth' || path.startsWith('/api/admin/media/file/');
}

function readCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    if (rawKey?.trim() === name) return rest.join('=').trim() || null;
  }
  return null;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hasAdminSession(request, env) {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!token || !env.DB) return false;
  try {
    const row = await env.DB.prepare(
      `SELECT id FROM admin_auth_sessions
        WHERE token_hash = ? AND expires_at > datetime('now')
        LIMIT 1`,
    )
      .bind(await sha256Hex(token))
      .first();
    return !!row;
  } catch {
    // Tabelle fehlt noch (erster Start) — dann ist niemand angemeldet
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const path = normalizePath(new URL(request.url).pathname);
    if (isAdminApi(path) && !isPublic(path) && !(await hasAdminSession(request, env))) {
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }
    return openNext.fetch(request, env, ctx);
  },
};
