import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  ensureAuthTables,
  sessionCookieOptions,
} from '@/lib/server/adminAuth';
import {
  clearConnection,
  completePairing,
  getPartnerConnection,
  HUT_KEY,
  HUT_NAME,
  isSsoAllowed,
  verifyPartnerRequest,
  verifySwitchTicket,
} from '@/lib/server/partner';
import {
  applyOwnEntries,
  getOwnPriceData,
  type Outcome,
  restoreOwnSnapshot,
  saveOwnRules,
} from '@/lib/server/priceOverview';

interface Env {
  DB: D1Database;
}

// Schnittstelle für das verbundene Admin Center der Natberger Hütte
// (lib/server/partner.ts). Liegt bewusst nicht unter /api/admin (Admin-Login
// in src/middleware.ts): Aufrufer ist der andere Server, nicht der Browser.
// Jede Anfrage ist mit dem gemeinsamen Schlüssel signiert und wird nur
// einmal angenommen.

async function getDb(): Promise<D1Database | null> {
  try {
    const ctx = await getCloudflareContext();
    return (ctx as { env: Env }).env?.DB ?? null;
  } catch {
    return null;
  }
}

function reply<T>(outcome: Outcome<T>) {
  if (outcome.data !== undefined) return NextResponse.json({ success: true, data: outcome.data });
  return NextResponse.json(
    { error: outcome.error || 'Fehler', needsRoom: outcome.needsRoom === true },
    { status: outcome.status || 500 },
  );
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

  try {
    const verified = await verifyPartnerRequest(db, request);
    if (!verified.body) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }
    const body = verified.body;
    const conn = await getPartnerConnection(db);
    const via = conn?.name || 'Partner';

    switch (body.action) {
      case 'pair': {
        const result = await completePairing(db, body);
        if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ success: true, name: HUT_NAME, hut: HUT_KEY });
      }
      case 'ping':
        return NextResponse.json({ success: true, name: HUT_NAME, hut: HUT_KEY });
      case 'unpair':
        await clearConnection(db);
        return NextResponse.json({ success: true });
      case 'priceData':
        return reply(await getOwnPriceData(db, Number(body.months) || 12));
      case 'applyPrices':
        return reply(
          await applyOwnEntries(db, body.entries, `${String(body.label || 'Änderung')} (${via})`),
        );
      case 'restorePrices':
        return reply(await restoreOwnSnapshot(db, Number(body.snapshotId)));
      case 'saveRules':
        return reply(await saveOwnRules(db, body.rules));
      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/partner error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

// Wechsel aus dem anderen Admin Center: Ticket prüfen und — nur wenn das hier
// erlaubt ist — direkt anmelden. Sonst normale Anmeldung.
export async function GET(request: NextRequest) {
  const target = new URL('/admin', request.url);
  const db = await getDb();
  const ticket = request.nextUrl.searchParams.get('ticket') || '';
  if (!db || !ticket) return NextResponse.redirect(target);

  try {
    const verified = await verifySwitchTicket(db, ticket);
    if (verified.tab) target.searchParams.set('tab', verified.tab);
    if (!verified.ok || !(await isSsoAllowed(db))) return NextResponse.redirect(target);

    await ensureAuthTables(db);
    const token = await createAdminSession(db);
    const response = NextResponse.redirect(target);
    response.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('GET /api/partner error:', error);
    return NextResponse.redirect(target);
  }
}
