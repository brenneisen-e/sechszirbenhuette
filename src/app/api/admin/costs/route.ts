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

interface CostRecord {
  id: number;
  guest_id: number;
  booking_id: number | null;
  cost_type: string;
  cost_category: string | null;
  amount: number;
  description: string | null;
  created_at: string;
}

// Cost types and their categories
// Nebenkosten -> Wasser, Strom
// Reinigung -> 100€, 125€
// Kurtaxe -> calculated per night per adult

// GET - Get costs for a guest
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const { searchParams } = new URL(request.url);

    if (!env?.DB) {
      console.error('DB not found in env. Available keys:', Object.keys(env || {}));
      return NextResponse.json({ error: 'DB not configured', costs: [] }, { status: 500 });
    }

    const guestId = searchParams.get('guest_id');
    const bookingId = searchParams.get('booking_id');

    let query = 'SELECT * FROM guest_costs';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (guestId) {
      conditions.push('guest_id = ?');
      params.push(parseInt(guestId));
    }

    if (bookingId) {
      conditions.push('booking_id = ?');
      params.push(parseInt(bookingId));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const { results } = await env.DB.prepare(query).bind(...params).all<CostRecord>();

    return NextResponse.json({ costs: results || [] });
  } catch (error) {
    console.error('GET /api/admin/costs error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('no such table')) {
      return NextResponse.json({ costs: [], tableNotFound: true });
    }
    return NextResponse.json({ error: message, costs: [] }, { status: 500 });
  }
}

// POST - Create a new cost entry
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

    const body = await request.json() as {
      guest_id: number;
      booking_id?: number;
      cost_type: string;
      cost_category?: string;
      amount: number;
      description?: string;
    };

    const { guest_id, booking_id, cost_type, cost_category, amount, description } = body;

    if (!guest_id || !cost_type || amount === undefined) {
      return NextResponse.json({ error: 'guest_id, cost_type, and amount are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(`
      INSERT INTO guest_costs (guest_id, booking_id, cost_type, cost_category, amount, description)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      guest_id,
      booking_id || null,
      cost_type,
      cost_category || null,
      amount,
      description || null
    ).first<CostRecord>();

    return NextResponse.json({ cost: result });
  } catch (error) {
    console.error('POST /api/admin/costs error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a cost entry
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

    const body = await request.json() as {
      id: number;
      cost_type?: string;
      cost_category?: string;
      amount?: number;
      description?: string;
    };

    const { id, cost_type, cost_category, amount, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Cost ID required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (cost_type !== undefined) {
      updates.push('cost_type = ?');
      values.push(cost_type);
    }

    if (cost_category !== undefined) {
      updates.push('cost_category = ?');
      values.push(cost_category || null);
    }

    if (amount !== undefined) {
      updates.push('amount = ?');
      values.push(amount);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE guest_costs SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<CostRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    return NextResponse.json({ cost: result });
  } catch (error) {
    console.error('PUT /api/admin/costs error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a cost entry
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Cost ID required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM guest_costs WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/costs error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
