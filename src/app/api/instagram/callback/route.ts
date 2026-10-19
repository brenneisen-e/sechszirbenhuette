import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { completeAuthorization } from '@/lib/server/instagram';

interface Env {
  DB: D1Database;
}

// Rücksprung der Instagram-Anmeldung, gestartet im Admin Center (Tab
// Instagram). Liegt bewusst außerhalb von /api/admin: Beim Sprung von
// instagram.com zurück schickt der Browser das Admin-Cookie nicht in jedem
// Fall mit. Geschützt durch den Einmalwert (state), den nur das Admin Center
// erzeugt und der 15 Minuten gilt. Danach zurück ins Admin Center.

function back(request: NextRequest, result: 'ok' | 'error', message: string, origin?: string) {
  const url = new URL('/admin', origin ?? request.url);
  url.searchParams.set('tab', 'instagram');
  url.searchParams.set('instagram', result);
  url.searchParams.set('message', message.slice(0, 300));
  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const denied = params.get('error_description') || params.get('error');
  if (denied) return back(request, 'error', `Instagram: ${denied}`);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return back(request, 'error', 'Antwort von Instagram unvollständig');
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    if (!db) return back(request, 'error', 'Datenbank nicht erreichbar');
    const { username, origin } = await completeAuthorization(db, code, state);
    return back(request, 'ok', `Verbunden mit @${username}`, origin);
  } catch (e) {
    return back(request, 'error', e instanceof Error ? e.message : 'Verbinden fehlgeschlagen');
  }
}
