import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { runBookingCutoff } from '@/lib/server/bookingCutoff';

interface Env {
  DB: D1Database;
}

// Täglicher Buchungsschluss (lib/server/bookingCutoff.ts), aufgerufen vom
// geplanten GitHub-Workflow .github/workflows/buchungsschluss.yml. Liegt
// bewusst nicht unter /api/admin (Admin-Login in src/middleware.ts).
//
// Bewusst ohne Anmeldung: Der Aufruf kann nur das auslösen, was die
// Einstellung im Admin Center ohnehin vorgibt — den heutigen Tag sperren, und
// das höchstens einmal pro Tag. Weitere Aufrufe am selben Tag kosten nur einen
// Datenbankzugriff und erreichen Beds24 nicht.
async function handle() {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    if (!env.DB) return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    const { result } = await runBookingCutoff(env.DB);
    return NextResponse.json({ result }, { status: result === 'error' ? 502 : 200 });
  } catch {
    return NextResponse.json({ result: 'error' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
