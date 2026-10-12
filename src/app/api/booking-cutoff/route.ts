import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { runBookingCutoff } from '@/lib/server/bookingCutoff';
import { runBookingHorizon } from '@/lib/server/bookingHorizon';

interface Env {
  DB: D1Database;
}

// Täglicher Buchungsschluss (lib/server/bookingCutoff.ts) und „Buchbar bis“
// (lib/server/bookingHorizon.ts), aufgerufen vom
// geplanten GitHub-Workflow .github/workflows/buchungsschluss.yml. Liegt
// bewusst nicht unter /api/admin (Admin-Login in src/middleware.ts).
//
// Bewusst ohne Anmeldung: Der Aufruf kann nur das auslösen, was die
// Einstellung im Admin Center ohnehin vorgibt — den heutigen Tag bzw. die Tage
// nach dem „Buchbar bis“-Datum sperren, und das höchstens einmal pro Tag.
// Weitere Aufrufe am selben Tag kosten nur einen Datenbankzugriff und
// erreichen Beds24 nicht.
async function handle() {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    if (!env.DB) return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    const { result } = await runBookingCutoff(env.DB);
    const horizon = await runBookingHorizon(env.DB).catch(() => ({ result: 'error' as const }));
    const failed = result === 'error' || horizon.result === 'error';
    return NextResponse.json({ result, horizon: horizon.result }, { status: failed ? 502 : 200 });
  } catch {
    return NextResponse.json({ result: 'error' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
