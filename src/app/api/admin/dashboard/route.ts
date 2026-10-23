import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { isAdminAuthenticated } from '@/lib/server/adminAuth';
import type { DashboardData, PlatformConfig } from '@/lib/dashboard/hutDashboard';
import { getOwnDashboardData, saveOwnPlatformConfig } from '@/lib/server/hutDashboard';
import { callPartner, getPartnerConnection, type PartnerResult } from '@/lib/server/partner';
import type { Outcome } from '@/lib/server/priceOverview';

interface Env {
  DB: D1Database;
}

// Tab „Übersicht“ (src/components/admin/HutDashboard.tsx): Preise je Plattform
// und Belegung. Eigene Hütte direkt aus Beds24, die Partner-Hütte über ihr
// eigenes Admin Center (/api/partner, Aktion dashboardData — dort ohne
// Gastnamen).

interface HutResponse<T> {
  data?: T;
  error?: string;
  needsRoom?: boolean;
}

function fromOutcome<T>(outcome: Outcome<T>): HutResponse<T> {
  return outcome.data !== undefined
    ? { data: outcome.data }
    : { error: outcome.error || 'Fehler', needsRoom: outcome.needsRoom === true };
}

function fromPartner<T>(result: PartnerResult<{ data?: T }>, partnerName: string): HutResponse<T> {
  if (result.data?.data !== undefined) return { data: result.data.data };
  // Ältere Version des anderen Admin Centers kennt die Übersicht noch nicht
  if (result.error === 'Unbekannte Aktion') {
    return {
      error: `Das Admin Center der ${partnerName} hat die Übersicht noch nicht — bitte dort die neue Version ausrollen`,
    };
  }
  return { error: result.error || 'Keine Antwort', needsRoom: result.needsRoom === true };
}

function respond<T>(hut: HutResponse<T>) {
  if (hut.data !== undefined) return NextResponse.json({ success: true, data: hut.data });
  return NextResponse.json({ error: hut.error, needsRoom: hut.needsRoom }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      hut?: 'own' | 'partner';
      from?: string;
      to?: string;
      partner?: boolean;
      config?: PlatformConfig;
    };

    if (body.action === 'load') {
      const conn = body.partner === true ? await getPartnerConnection(db) : null;
      const [own, partner] = await Promise.all([
        getOwnDashboardData(db, body.from, body.to, { names: true }),
        conn
          ? callPartner<{ data?: DashboardData }>(db, 'dashboardData', {
              from: body.from,
              to: body.to,
            })
          : Promise.resolve(null),
      ]);
      return NextResponse.json({
        success: true,
        own: fromOutcome(own),
        partner: partner && conn ? fromPartner(partner, conn.name) : null,
        partnerName: conn?.name ?? null,
      });
    }

    if (body.action === 'saveConfig') {
      if (body.hut === 'partner') {
        const conn = await getPartnerConnection(db);
        if (!conn) {
          return NextResponse.json({ error: 'Kein Admin Center verbunden' }, { status: 400 });
        }
        return respond(
          fromPartner(
            await callPartner<{ data?: PlatformConfig }>(db, 'savePlatformConfig', {
              config: body.config,
            }),
            conn.name,
          ),
        );
      }
      return respond(fromOutcome(await saveOwnPlatformConfig(db, body.config)));
    }

    return NextResponse.json({ error: `Unbekannte Aktion: ${body.action}` }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/dashboard error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
