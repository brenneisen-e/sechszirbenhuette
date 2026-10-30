import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
  acceptInvite,
  callPartner,
  clearConnection,
  createInvite,
  createSwitchUrl,
  getPartnerConnection,
  hasPendingInvite,
  HUT_KEY,
  HUT_NAME,
  isSsoAllowed,
  setSsoAllowed,
} from '@/lib/server/partner';

interface Env {
  DB: D1Database;
}

// Verbindung zum Admin Center der Natberger Hütte verwalten
// (lib/server/partner.ts): koppeln, prüfen, trennen, direkt wechseln.
// Auth: Admin-Session, geprüft in cloudflare-worker.js. Der geheime Schlüssel
// geht nur beim Erzeugen des Kopplungscodes an den Browser — danach nie wieder.

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      code?: string;
      allowed?: boolean;
      tab?: string;
    };
    const origin = new URL(request.url).origin;

    if (body.action === 'status') {
      const conn = await getPartnerConnection(db);
      return NextResponse.json({
        success: true,
        own: { name: HUT_NAME, hut: HUT_KEY },
        partner: conn ? { name: conn.name, url: conn.url, hut: conn.hut } : null,
        ssoAllowed: await isSsoAllowed(db),
        pendingInvite: await hasPendingInvite(db),
      });
    }

    if (body.action === 'createInvite') {
      const invite = await createInvite(db, origin);
      return NextResponse.json({ success: true, ...invite });
    }

    if (body.action === 'acceptInvite') {
      const result = await acceptInvite(db, String(body.code || ''), origin);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, name: result.name });
    }

    if (body.action === 'test') {
      const result = await callPartner<{ name?: string }>(db, 'ping');
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 502 });
      }
      return NextResponse.json({ success: true, name: result.data?.name });
    }

    if (body.action === 'unpair') {
      // Die andere Seite möglichst mit trennen — ist sie nicht erreichbar,
      // verwirft sie die Verbindung spätestens bei der nächsten Anfrage
      await callPartner(db, 'unpair').catch(() => undefined);
      await clearConnection(db);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'setSso') {
      await setSsoAllowed(db, body.allowed === true);
      return NextResponse.json({ success: true, ssoAllowed: body.allowed === true });
    }

    if (body.action === 'switchUrl') {
      const url = await createSwitchUrl(db, body.tab);
      if (!url) return NextResponse.json({ error: 'Kein Admin Center verbunden' }, { status: 400 });
      return NextResponse.json({ success: true, url });
    }

    return NextResponse.json({ error: `Unbekannte Aktion: ${body.action}` }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/partner error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
