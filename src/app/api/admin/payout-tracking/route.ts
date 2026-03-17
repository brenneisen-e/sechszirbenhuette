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

interface PayoutTracking {
  id: number;
  booking_id: number;
  expected_date: string | null;
  expected_amount: number | null;
  received: number;
  received_date: string | null;
  payment_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Check if table exists
async function tableExists(db: D1Database): Promise<boolean> {
  const result = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='payout_tracking'"
  ).first();
  return !!result;
}

// GET - Fetch payout tracking entries
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const exists = await tableExists(env.DB);
    if (!exists) {
      return NextResponse.json({ payouts: [], tableExists: false });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const year = searchParams.get('year');

    if (bookingId) {
      const { results } = await env.DB.prepare(
        'SELECT * FROM payout_tracking WHERE booking_id = ? ORDER BY expected_date ASC'
      ).bind(parseInt(bookingId)).all<PayoutTracking>();
      return NextResponse.json({ payouts: results || [], tableExists: true });
    }

    if (year) {
      const { results } = await env.DB.prepare(
        `SELECT pt.*, b.platform, g.guest_name, b.arrival_date, b.departure_date
         FROM payout_tracking pt
         JOIN bookings b ON pt.booking_id = b.id
         JOIN guests g ON b.guest_id = g.id
         WHERE pt.expected_date LIKE ?
         ORDER BY pt.expected_date ASC`
      ).bind(`${year}%`).all();
      return NextResponse.json({ payouts: results || [], tableExists: true });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM payout_tracking ORDER BY expected_date ASC'
    ).all<PayoutTracking>();

    return NextResponse.json({ payouts: results || [], tableExists: true });
  } catch (error) {
    console.error('GET /api/admin/payout-tracking error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create payout tracking entry
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

    const body = await request.json() as Partial<PayoutTracking>;

    if (!body.booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO payout_tracking (booking_id, expected_date, expected_amount, received, received_date, payment_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.booking_id,
      body.expected_date || null,
      body.expected_amount || null,
      body.received || 0,
      body.received_date || null,
      body.payment_type || 'payout',
      body.notes || null
    ).run();

    return NextResponse.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('POST /api/admin/payout-tracking error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update payout tracking entry (e.g., mark as received)
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

    const body = await request.json() as Partial<PayoutTracking> & { id: number };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.received !== undefined) {
      fields.push('received = ?');
      values.push(body.received);
    }
    if (body.received_date !== undefined) {
      fields.push('received_date = ?');
      values.push(body.received_date);
    }
    if (body.expected_date !== undefined) {
      fields.push('expected_date = ?');
      values.push(body.expected_date);
    }
    if (body.expected_amount !== undefined) {
      fields.push('expected_amount = ?');
      values.push(body.expected_amount);
    }
    if (body.notes !== undefined) {
      fields.push('notes = ?');
      values.push(body.notes);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(body.id);

    await env.DB.prepare(
      `UPDATE payout_tracking SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/payout-tracking error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete payout tracking entry
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

    await env.DB.prepare('DELETE FROM payout_tracking WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/payout-tracking error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
