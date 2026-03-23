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

interface BookingPosition {
  id: number;
  booking_id: number;
  name: string;
  category: string;
  type: string;
  amount: number;
  paid_by: string;
  paid: number;
  affects_mieterlos: number;
  affects_gewinn: number;
  show_separate: number;
  auto_calculate: number;
  calc_rule: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Check if table exists
async function tableExists(db: D1Database): Promise<boolean> {
  const result = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='booking_positions'"
  ).first();
  return !!result;
}

// GET - Fetch positions for a booking
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const exists = await tableExists(env.DB);
    if (!exists) {
      return NextResponse.json({ positions: [], tableExists: false });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (bookingId) {
      const { results } = await env.DB.prepare(
        'SELECT * FROM booking_positions WHERE booking_id = ? ORDER BY sort_order ASC, id ASC'
      ).bind(parseInt(bookingId)).all<BookingPosition>();
      return NextResponse.json({ positions: results || [], tableExists: true });
    }

    // If no booking_id, return all positions (for migration/admin purposes)
    const { results } = await env.DB.prepare(
      'SELECT * FROM booking_positions ORDER BY booking_id, sort_order ASC, id ASC'
    ).all<BookingPosition>();

    return NextResponse.json({ positions: results || [], tableExists: true });
  } catch (error) {
    console.error('GET /api/admin/booking-positions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create position(s) for a booking
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
      positions?: Array<Partial<BookingPosition>>;
      position?: Partial<BookingPosition>;
    };

    const positions = body.positions || (body.position ? [body.position] : []);

    if (positions.length === 0) {
      return NextResponse.json({ error: 'No positions provided' }, { status: 400 });
    }

    const insertedIds: number[] = [];

    for (const pos of positions) {
      if (!pos.booking_id || !pos.name || !pos.type) {
        continue;
      }

      const result = await env.DB.prepare(
        `INSERT INTO booking_positions (booking_id, name, category, type, amount, paid_by, paid, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, sort_order, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        pos.booking_id,
        pos.name,
        pos.category || 'custom',
        pos.type,
        pos.amount || 0,
        pos.paid_by || 'guest_platform',
        pos.paid || 0,
        pos.affects_mieterlos || 0,
        pos.affects_gewinn ?? 1,
        pos.show_separate || 0,
        pos.auto_calculate || 0,
        pos.calc_rule || null,
        pos.sort_order || 0,
        pos.notes || null
      ).run();

      if (result.meta.last_row_id) {
        insertedIds.push(result.meta.last_row_id as number);
      }
    }

    return NextResponse.json({ success: true, insertedIds });
  } catch (error) {
    console.error('POST /api/admin/booking-positions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a position
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

    const body = await request.json() as Partial<BookingPosition> & { id: number };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      category: 'category',
      type: 'type',
      amount: 'amount',
      paid_by: 'paid_by',
      paid: 'paid',
      affects_mieterlos: 'affects_mieterlos',
      affects_gewinn: 'affects_gewinn',
      show_separate: 'show_separate',
      auto_calculate: 'auto_calculate',
      calc_rule: 'calc_rule',
      sort_order: 'sort_order',
      notes: 'notes',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in body) {
        fields.push(`${dbField} = ?`);
        values.push((body as Record<string, string | number | null>)[key] ?? null);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(body.id);

    await env.DB.prepare(
      `UPDATE booking_positions SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/booking-positions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a position
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
    const bookingId = searchParams.get('booking_id');

    if (id) {
      await env.DB.prepare('DELETE FROM booking_positions WHERE id = ?').bind(parseInt(id)).run();
    } else if (bookingId) {
      await env.DB.prepare('DELETE FROM booking_positions WHERE booking_id = ?').bind(parseInt(bookingId)).run();
    } else {
      return NextResponse.json({ error: 'id or booking_id parameter is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/booking-positions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
