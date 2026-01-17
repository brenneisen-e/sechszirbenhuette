import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { last_row_id?: number } }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface CloudflareEnv {
  DB: D1Database;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

interface BookingRecord {
  id: number;
  guest_id: number;
  booking_number: string | null;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  pets: string | null;
  rental_price: number;
  deposit_amount: number;
  deposit_paid: number;
  final_payment: number;
  final_payment_paid: number;
  electricity_flat: number;
  additional_payment: number;
  security_deposit: number;
  additional_costs: string | null;
  final_cleaning: string | null;
  first_contact_date: string | null;
  offer_sent: number;
  contract_sent: number;
  deposit_received: number;
  balance_received: number;
  welcome_guide_sent: number;
  utilities_cash: number;
  cleaning_cash: number;
  no_nebenkosten: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// GET - Fetch all bookings or by guest_id
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Database not available', bookings: [] }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id');

    let query = 'SELECT * FROM bookings';
    const params: number[] = [];

    if (guestId) {
      query += ' WHERE guest_id = ?';
      params.push(parseInt(guestId));
    }

    query += ' ORDER BY arrival_date DESC, created_at DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const { results } = await stmt.all<BookingRecord>();

    return NextResponse.json({ bookings: results || [] });
  } catch (error) {
    console.error('GET /api/admin/bookings error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings', bookings: [] }, { status: 500 });
  }
}

// POST - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as Partial<BookingRecord>;

    if (!body.guest_id) {
      return NextResponse.json({ error: 'guest_id is required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      'INSERT INTO bookings (guest_id, booking_number, platform, arrival_date, departure_date, adults, children, pets, rental_price, deposit_amount, deposit_paid, final_payment, final_payment_paid, electricity_flat, additional_payment, security_deposit, additional_costs, final_cleaning, first_contact_date, offer_sent, contract_sent, deposit_received, balance_received, welcome_guide_sent, utilities_cash, cleaning_cash, no_nebenkosten, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(
      body.guest_id,
      body.booking_number || null,
      body.platform || null,
      body.arrival_date || null,
      body.departure_date || null,
      body.adults || 2,
      body.children || 0,
      body.pets || null,
      body.rental_price || 0,
      body.deposit_amount || 0,
      body.deposit_paid || 0,
      body.final_payment || 0,
      body.final_payment_paid || 0,
      body.electricity_flat || 0,
      body.additional_payment || 0,
      body.security_deposit || 0,
      body.additional_costs || null,
      body.final_cleaning || null,
      body.first_contact_date || null,
      body.offer_sent || 0,
      body.contract_sent || 0,
      body.deposit_received || 0,
      body.balance_received || 0,
      body.welcome_guide_sent || 0,
      body.utilities_cash || 0,
      body.cleaning_cash || 0,
      body.no_nebenkosten || 0,
      body.status || 'confirmed',
      body.notes || null
    ).run();

    const bookingId = result.meta?.last_row_id;

    return NextResponse.json({ success: true, id: bookingId });
  } catch (error) {
    console.error('POST /api/admin/bookings error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

// PUT - Update a booking
export async function PUT(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as Partial<BookingRecord> & { id: number };

    if (!body.id) {
      return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const fields = [
      'booking_number', 'platform', 'arrival_date', 'departure_date',
      'adults', 'children', 'pets', 'rental_price', 'deposit_amount',
      'deposit_paid', 'final_payment', 'final_payment_paid', 'electricity_flat',
      'additional_payment', 'security_deposit', 'additional_costs', 'final_cleaning',
      'first_contact_date', 'offer_sent', 'contract_sent', 'deposit_received',
      'balance_received', 'welcome_guide_sent', 'utilities_cash', 'cleaning_cash',
      'no_nebenkosten', 'status', 'notes'
    ];

    for (const field of fields) {
      if (field in body) {
        updates.push(field + ' = ?');
        params.push((body as Record<string, unknown>)[field] as string | number | null);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    params.push(body.id);

    await env.DB.prepare(
      'UPDATE bookings SET ' + updates.join(', ') + ' WHERE id = ?'
    ).bind(...params).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/bookings error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

// DELETE - Delete a booking
export async function DELETE(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/bookings error:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
