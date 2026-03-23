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

interface BankPaymentRecord {
  id: number;
  guest_id: number | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  is_unknown_booking: number;
  is_cash: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest_name?: string;
  booking_number?: string;
  arrival_date?: string;
}

// Helper function to ensure table exists
async function ensureTableExists(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      amount REAL NOT NULL DEFAULT 0,
      payment_date TEXT NOT NULL,
      notes TEXT,
      is_unknown_booking INTEGER NOT NULL DEFAULT 0,
      is_cash INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL
    )
  `).run();

  // Create index
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(payment_date)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_bank_transactions_guest ON bank_transactions(guest_id)').run();

  // Add is_cash column if it doesn't exist (for existing tables)
  try {
    await db.prepare('ALTER TABLE bank_transactions ADD COLUMN is_cash INTEGER NOT NULL DEFAULT 0').run();
  } catch {
    // Column likely already exists
  }
}

// GET - Fetch bank transactions (optionally filtered)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured.',
        payments: []
      }, { status: 500 });
    }

    // Ensure table exists first
    await ensureTableExists(env.DB);

    const year = searchParams.get('year');
    const guestId = searchParams.get('guestId');

    let query = `
      SELECT
        rp.*,
        g.guest_name,
        g.booking_number,
        g.arrival_date
      FROM bank_transactions rp
      LEFT JOIN guests g ON rp.guest_id = g.id
    `;
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (year) {
      conditions.push("strftime('%Y', rp.payment_date) = ?");
      params.push(year);
    }

    if (guestId) {
      conditions.push('rp.guest_id = ?');
      params.push(parseInt(guestId));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY rp.payment_date DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const { results } = await stmt.all<BankPaymentRecord>();

    return NextResponse.json({ payments: results || [] });
  } catch (error) {
    console.error('GET /api/admin/bank-transactions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, payments: [] }, { status: 500 });
  }
}

// POST - Create new payment
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as {
      guest_id: number | null;
      amount: number;
      payment_date: string;
      notes?: string;
      is_unknown_booking?: boolean;
      is_cash?: boolean;
    };

    const { guest_id, amount, payment_date, notes, is_unknown_booking, is_cash } = body;

    if (!amount || !payment_date) {
      return NextResponse.json({ error: 'amount and payment_date are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO bank_transactions (guest_id, amount, payment_date, notes, is_unknown_booking, is_cash) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      guest_id || null,
      amount,
      payment_date,
      notes || null,
      is_unknown_booking ? 1 : 0,
      is_cash ? 1 : 0
    ).run();

    return NextResponse.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('POST /api/admin/bank-transactions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update payment (assign to booking)
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as {
      id: number;
      guest_id?: number | null;
      amount?: number;
      payment_date?: string;
      notes?: string;
      is_unknown_booking?: boolean;
      is_cash?: boolean;
    };

    const { id, guest_id, amount, payment_date, notes, is_unknown_booking, is_cash } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (guest_id !== undefined) {
      updates.push('guest_id = ?');
      params.push(guest_id);
      // If assigning to a guest, clear the unknown flag
      if (guest_id !== null) {
        updates.push('is_unknown_booking = 0');
      }
    }

    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }

    if (payment_date !== undefined) {
      updates.push('payment_date = ?');
      params.push(payment_date);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (is_unknown_booking !== undefined) {
      updates.push('is_unknown_booking = ?');
      params.push(is_unknown_booking ? 1 : 0);
    }

    if (is_cash !== undefined) {
      updates.push('is_cash = ?');
      params.push(is_cash ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await env.DB.prepare(
      `UPDATE bank_transactions SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/bank-transactions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete payment
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM bank_transactions WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/bank-transactions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
