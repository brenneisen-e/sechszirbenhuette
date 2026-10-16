import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import type { HutData, PriceRules } from '@/lib/pricing/dynamicPricing';
import { callPartner, getPartnerConnection, type PartnerResult } from '@/lib/server/partner';
import {
  applyOwnEntries,
  getOwnPriceData,
  listRoomOptions,
  type Outcome,
  restoreOwnSnapshot,
  saveOwnRules,
  setOwnRoom,
} from '@/lib/server/priceOverview';

interface Env {
  DB: D1Database;
}

// Preisübersicht beider Hütten (src/components/admin/PriceOverview.tsx).
// Auth: Admin-Session, geprüft in src/middleware.ts. Eigene Hütte direkt über
// Beds24 (nur die gewählte Unterkunft), die Natberger Hütte über ihr eigenes
// Admin Center (/api/partner) — dort gelten deren Regeln.

type HutTarget = 'own' | 'partner';

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

function fromPartner<T>(result: PartnerResult<{ data?: T }>): HutResponse<T> {
  return result.data?.data !== undefined
    ? { data: result.data.data }
    : { error: result.error || 'Keine Antwort', needsRoom: result.needsRoom === true };
}

function respond<T>(hut: HutResponse<T>) {
  if (hut.data !== undefined) return NextResponse.json({ success: true, data: hut.data });
  return NextResponse.json({ error: hut.error, needsRoom: hut.needsRoom }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      hut?: HutTarget;
      months?: number;
      entries?: unknown;
      label?: string;
      snapshotId?: number;
      rules?: PriceRules;
      roomId?: number;
    };
    const target: HutTarget = body.hut === 'partner' ? 'partner' : 'own';
    const label = String(body.label || 'Änderung').slice(0, 120);

    if (body.action === 'load') {
      const months = Math.min(Math.max(Number(body.months) || 12, 1), 18);
      const conn = await getPartnerConnection(db);
      const [own, partner] = await Promise.all([
        getOwnPriceData(db, months),
        conn ? callPartner<{ data?: HutData }>(db, 'priceData', { months }) : Promise.resolve(null),
      ]);
      return NextResponse.json({
        success: true,
        own: fromOutcome(own),
        partner: partner ? fromPartner(partner) : null,
        partnerName: conn?.name ?? null,
      });
    }

    if (body.action === 'rooms') {
      return respond(fromOutcome(await listRoomOptions(db)));
    }

    if (body.action === 'setRoom') {
      return respond(fromOutcome(await setOwnRoom(db, Number(body.roomId))));
    }

    if (body.action === 'apply') {
      if (target === 'partner') {
        return respond(
          fromPartner(await callPartner(db, 'applyPrices', { entries: body.entries, label })),
        );
      }
      return respond(fromOutcome(await applyOwnEntries(db, body.entries, label)));
    }

    if (body.action === 'restore') {
      const snapshotId = Number(body.snapshotId);
      if (target === 'partner') {
        return respond(fromPartner(await callPartner(db, 'restorePrices', { snapshotId })));
      }
      return respond(fromOutcome(await restoreOwnSnapshot(db, snapshotId)));
    }

    if (body.action === 'saveRules') {
      if (target === 'partner') {
        return respond(fromPartner(await callPartner(db, 'saveRules', { rules: body.rules })));
      }
      return respond(fromOutcome(await saveOwnRules(db, body.rules)));
    }

    return NextResponse.json({ error: `Unbekannte Aktion: ${body.action}` }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/price-overview error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
