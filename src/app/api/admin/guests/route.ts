import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;  // Fallback for development
}

// Helper to get admin password from env (checks both secret and fallback)
function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface GuestRecord {
  id: number;
  booking_number: string | null;
  month: string | null;
  year: number | null;
  guest_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_returning_guest: number;
  is_private: number;
  no_nebenkosten: number;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages: string | null;
  nationality: string | null;
  pets: string | null;
  rental_price: number;
  net_rent: number | null;
  cleaning_cash: number;
  additional_costs: string | null;
  ancillary_costs_amount: number;  // Numeric NK value
  final_cleaning: string | null;
  final_cleaning_amount: number;   // Numeric ER value
  other_notes: string | null;
  first_contact_date: string | null;
  offer_sent: number;
  contract_sent: number;
  welcome_guide_sent: number;
  deposit_amount: number;
  deposit_paid: number;
  final_payment: number;
  final_payment_paid: number;
  electricity_flat: number;
  additional_payment: number;
  security_deposit: number;
  admin_briefed: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// GET - Fetch guests (optionally filtered)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

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
      return NextResponse.json({
        error: 'D1 Database binding not configured.',
        guests: []
      }, { status: 500 });
    }

    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    // Single guest lookup
    if (id) {
      const guest = await env.DB.prepare(
        'SELECT * FROM guests WHERE id = ?'
      ).bind(id).first<GuestRecord>();

      if (!guest) {
        return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
      }

      return NextResponse.json({ guest });
    }

    let query = 'SELECT * FROM guests';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (year) {
      conditions.push('year = ?');
      params.push(parseInt(year));
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(guest_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY arrival_date DESC, created_at DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const { results } = await stmt.all<GuestRecord>();

    return NextResponse.json({ guests: results || [] });
  } catch (error) {
    console.error('GET /api/admin/guests error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, guests: [] }, { status: 500 });
  }
}

// POST - Create new guest or bulk import
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      console.error('ADMIN_PASSWORD not found. Available keys:', Object.keys(env || {}));
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { guests?: Partial<GuestRecord>[]; [key: string]: unknown };

    // Bulk import
    if (Array.isArray(body.guests)) {
      const results = [];
      for (const guest of body.guests) {
        try {
          const result = await insertGuest(env.DB, guest);
          results.push({ success: true, guest: result });
        } catch (e) {
          results.push({ success: false, error: e instanceof Error ? e.message : 'Unknown error', guest_name: guest.guest_name });
        }
      }
      return NextResponse.json({ results, imported: results.filter(r => r.success).length });
    }

    // Single guest insert
    const result = await insertGuest(env.DB, body as Partial<GuestRecord>);
    return NextResponse.json({ guest: result }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/guests error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function insertGuest(db: D1Database, guest: Partial<GuestRecord>) {
  const result = await db.prepare(`
    INSERT INTO guests (
      booking_number, month, year, guest_name, address, phone, email,
      is_returning_guest, is_private, no_nebenkosten, platform, arrival_date, departure_date,
      adults, children, children_ages, nationality, pets, rental_price, net_rent, cleaning_cash,
      additional_costs, ancillary_costs_amount, final_cleaning, final_cleaning_amount,
      other_notes, first_contact_date, offer_sent, contract_sent, welcome_guide_sent,
      deposit_amount, deposit_paid, final_payment, final_payment_paid,
      electricity_flat, additional_payment, security_deposit, admin_briefed, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    guest.booking_number || null,
    guest.month || null,
    guest.year || null,
    guest.guest_name || 'Unbekannter Gast',
    guest.address || null,
    guest.phone || null,
    guest.email || null,
    guest.is_returning_guest ? 1 : 0,
    guest.is_private ? 1 : 0,
    guest.no_nebenkosten ? 1 : 0,
    guest.platform || null,
    guest.arrival_date || null,
    guest.departure_date || null,
    guest.adults || 0,
    guest.children || 0,
    guest.children_ages || null,
    guest.nationality || null,
    guest.pets || null,
    guest.rental_price || 0,
    guest.net_rent || null,
    guest.cleaning_cash ? 1 : 0,
    guest.additional_costs || null,
    guest.ancillary_costs_amount || 0,  // Numeric NK value
    guest.final_cleaning || null,
    guest.final_cleaning_amount || 0,   // Numeric ER value
    guest.other_notes || null,
    guest.first_contact_date || null,
    guest.offer_sent ? 1 : 0,
    guest.contract_sent ? 1 : 0,
    guest.welcome_guide_sent ? 1 : 0,
    guest.deposit_amount || 0,
    guest.deposit_paid ? 1 : 0,
    guest.final_payment || 0,
    guest.final_payment_paid ? 1 : 0,
    guest.electricity_flat || 0,
    guest.additional_payment || 0,
    guest.security_deposit || 0,
    guest.admin_briefed ? 1 : 0,
    guest.status || 'active'
  ).first<GuestRecord>();

  return result;
}

// PUT - Update guest
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      console.error('ADMIN_PASSWORD not found. Available keys:', Object.keys(env || {}));
      return NextResponse.json({
        error: 'ADMIN_PASSWORD is not configured',
        debug: { availableEnvKeys: Object.keys(env || {}) }
      }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as Partial<GuestRecord> & { id: number };
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    const fieldMap: Record<string, keyof Omit<GuestRecord, 'id' | 'created_at' | 'updated_at'>> = {
      booking_number: 'booking_number',
      month: 'month',
      year: 'year',
      guest_name: 'guest_name',
      address: 'address',
      phone: 'phone',
      email: 'email',
      is_returning_guest: 'is_returning_guest',
      is_private: 'is_private',
      no_nebenkosten: 'no_nebenkosten',
      platform: 'platform',
      arrival_date: 'arrival_date',
      departure_date: 'departure_date',
      adults: 'adults',
      children: 'children',
      children_ages: 'children_ages',
      nationality: 'nationality',
      pets: 'pets',
      rental_price: 'rental_price',
      net_rent: 'net_rent',
      cleaning_cash: 'cleaning_cash',
      additional_costs: 'additional_costs',
      ancillary_costs_amount: 'ancillary_costs_amount',
      final_cleaning: 'final_cleaning',
      final_cleaning_amount: 'final_cleaning_amount',
      other_notes: 'other_notes',
      first_contact_date: 'first_contact_date',
      offer_sent: 'offer_sent',
      contract_sent: 'contract_sent',
      welcome_guide_sent: 'welcome_guide_sent',
      deposit_amount: 'deposit_amount',
      deposit_paid: 'deposit_paid',
      final_payment: 'final_payment',
      final_payment_paid: 'final_payment_paid',
      electricity_flat: 'electricity_flat',
      additional_payment: 'additional_payment',
      security_deposit: 'security_deposit',
      admin_briefed: 'admin_briefed',
      status: 'status',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in updates) {
        updateFields.push(`${dbField} = ?`);
        const value = updates[key as keyof typeof updates];
        // Convert booleans to integers for SQLite
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value as string | number | null);
        }
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE guests SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<GuestRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    return NextResponse.json({ guest: result });
  } catch (error) {
    console.error('PUT /api/admin/guests error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete guest
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
    const guestId = searchParams.get('id');

    if (!guestId) {
      return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
    }

    // Check if guest exists
    const guest = await env.DB.prepare(
      'SELECT * FROM guests WHERE id = ?'
    ).bind(guestId).first<GuestRecord>();

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Delete guest
    await env.DB.prepare(
      'DELETE FROM guests WHERE id = ?'
    ).bind(guestId).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/guests error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
