import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface KurtaxeRate {
  id: number;
  valid_from: string;
  valid_to: string | null;
  rate_per_person_per_day: number;
  min_age: number;
  created_at: string;
  updated_at: string;
}

// Ensure kurtaxe_rates table exists
async function ensureTable(db: D1Database) {
  const exists = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='kurtaxe_rates'"
  ).first();
  return !!exists;
}

// Validate that saving a rate would not create gaps between periods.
// Returns an array of warning strings (empty = no gaps detected).
async function detectGaps(
  db: D1Database,
  newFrom: string,
  newTo: string | null,
  excludeId?: number
): Promise<string[]> {
  const { results } = await db.prepare(
    'SELECT id, valid_from, valid_to FROM kurtaxe_rates ORDER BY valid_from ASC'
  ).all<{ id: number; valid_from: string; valid_to: string | null }>();

  if (!results || results.length === 0) return [];

  // Build the full list including the new/updated rate
  type RateRow = { id: number; valid_from: string; valid_to: string | null };
  const allRates = (results as RateRow[] || [])
    .filter((r: RateRow) => r.id !== excludeId)
    .map((r: RateRow) => ({ from: r.valid_from, to: r.valid_to }));
  allRates.push({ from: newFrom, to: newTo });
  allRates.sort((a: { from: string }, b: { from: string }) => a.from.localeCompare(b.from));

  const warnings: string[] = [];
  for (let i = 0; i < allRates.length - 1; i++) {
    const currentTo = allRates[i].to;
    const nextFrom = allRates[i + 1].from;

    if (!currentTo) continue; // open-ended period — no gap possible

    // Check if there's a gap: next period should start at most 1 day after current ends
    const currentEnd = new Date(currentTo);
    const nextStart = new Date(nextFrom);
    const diffDays = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 1) {
      warnings.push(
        `Luecke erkannt: ${currentTo} bis ${nextFrom} (${Math.floor(diffDays - 1)} Tag(e) ohne Kurtaxe-Satz)`
      );
    }
  }

  return warnings;
}

// GET - Fetch all kurtaxe rates
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const tableReady = await ensureTable(env.DB);
    if (!tableReady) {
      // Return rates from settings as fallback
      return NextResponse.json({ rates: [], tableExists: false });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM kurtaxe_rates ORDER BY valid_from ASC'
    ).all<KurtaxeRate>();

    return NextResponse.json({ rates: results || [], tableExists: true });
  } catch (error) {
    console.error('GET /api/admin/kurtaxe-rates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new kurtaxe rate
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword || adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as {
      valid_from: string;
      valid_to?: string | null;
      rate_per_person_per_day: number;
      min_age?: number;
    };

    if (!body.valid_from || body.rate_per_person_per_day === undefined) {
      return NextResponse.json({ error: 'valid_from and rate_per_person_per_day are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO kurtaxe_rates (valid_from, valid_to, rate_per_person_per_day, min_age)
       VALUES (?, ?, ?, ?)`
    ).bind(
      body.valid_from,
      body.valid_to || null,
      body.rate_per_person_per_day,
      body.min_age ?? 16
    ).run();

    // Detect gaps after insert
    const gapWarnings = await detectGaps(env.DB, body.valid_from, body.valid_to || null);

    return NextResponse.json({ success: true, id: result.meta.last_row_id, gapWarnings });
  } catch (error) {
    console.error('POST /api/admin/kurtaxe-rates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a kurtaxe rate
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword || adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as {
      id: number;
      valid_from: string;
      valid_to?: string | null;
      rate_per_person_per_day: number;
      min_age?: number;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await env.DB.prepare(
      `UPDATE kurtaxe_rates
       SET valid_from = ?, valid_to = ?, rate_per_person_per_day = ?, min_age = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.valid_from,
      body.valid_to || null,
      body.rate_per_person_per_day,
      body.min_age ?? 16,
      body.id
    ).run();

    // Detect gaps after update
    const gapWarnings = await detectGaps(env.DB, body.valid_from, body.valid_to || null, body.id);

    return NextResponse.json({ success: true, gapWarnings });
  } catch (error) {
    console.error('PUT /api/admin/kurtaxe-rates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a kurtaxe rate
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword || adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM kurtaxe_rates WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/kurtaxe-rates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
