import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

interface RentalPrice {
  id: number;
  name: string;
  date_from: string;
  date_to: string;
  price_per_night: number;
  nebenkosten_pro_person: number;
  mindestaufenthalt: number;
  aktiv: number;
  created_at: string;
  updated_at: string;
}

// GET - Fetch all rental prices
export async function GET() {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    // Check if table exists
    const exists = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='rental_prices'"
    ).first();

    if (!exists) {
      return NextResponse.json({ prices: [], tableExists: false });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM rental_prices ORDER BY date_from ASC'
    ).all<RentalPrice>();

    return NextResponse.json({ prices: results || [], tableExists: true });
  } catch (error) {
    console.error('GET /api/admin/rental-prices error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new rental price period
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as {
      name: string;
      date_from: string;
      date_to: string;
      price_per_night: number;
      nebenkosten_pro_person?: number;
      mindestaufenthalt?: number;
      aktiv?: boolean;
    };

    if (!body.name || !body.date_from || !body.date_to || body.price_per_night === undefined) {
      return NextResponse.json({ error: 'name, date_from, date_to, and price_per_night are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO rental_prices (name, date_from, date_to, price_per_night, nebenkosten_pro_person, mindestaufenthalt, aktiv)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.name,
      body.date_from,
      body.date_to,
      body.price_per_night,
      body.nebenkosten_pro_person ?? 0,
      body.mindestaufenthalt ?? 3,
      body.aktiv !== false ? 1 : 0
    ).run();

    return NextResponse.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('POST /api/admin/rental-prices error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a rental price period
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as {
      id: number;
      name: string;
      date_from: string;
      date_to: string;
      price_per_night: number;
      nebenkosten_pro_person?: number;
      mindestaufenthalt?: number;
      aktiv?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await env.DB.prepare(
      `UPDATE rental_prices
       SET name = ?, date_from = ?, date_to = ?, price_per_night = ?, nebenkosten_pro_person = ?, mindestaufenthalt = ?, aktiv = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.name,
      body.date_from,
      body.date_to,
      body.price_per_night,
      body.nebenkosten_pro_person ?? 0,
      body.mindestaufenthalt ?? 3,
      body.aktiv !== false ? 1 : 0,
      body.id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/rental-prices error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a rental price period
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM rental_prices WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/rental-prices error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
