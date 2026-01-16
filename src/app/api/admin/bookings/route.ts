import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

interface Booking {
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
  welcome_guide_sent: number;
  admin_briefed: number;
  status: string;
  notes: string | null;
  cleaning_cash: number;
  utilities_cash: number;
  created_at: string;
  updated_at: string;
}

function getAdminPassword(env: Env): string {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD || '';
}

// GET - List bookings for a guest
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id');
    const bookingId = searchParams.get('id');

    if (bookingId) {
      // Get single booking
      const booking = await db.prepare(
        'SELECT * FROM bookings WHERE id = ?'
      ).bind(bookingId).first<Booking>();

      if (!booking) {
        return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 });
      }

      return NextResponse.json({ booking });
    }

    if (guestId) {
      // Get bookings for a specific guest
      const result = await db.prepare(
        'SELECT * FROM bookings WHERE guest_id = ? ORDER BY arrival_date DESC'
      ).bind(guestId).all<Booking>();

      return NextResponse.json({ bookings: result.results || [] });
    }

    // Get all bookings with guest_name via JOIN
    const result = await db.prepare(`
      SELECT b.*, g.guest_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      ORDER BY b.arrival_date DESC
    `).all<Booking & { guest_name?: string }>();

    return NextResponse.json({ bookings: result.results || [] });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Buchungen';
    // If table doesn't exist, return empty array instead of error
    if (message.includes('no such table')) {
      return NextResponse.json({ bookings: [], tableNotFound: true });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await request.json() as Partial<Booking>;

    if (!data.guest_id) {
      return NextResponse.json({ error: 'guest_id ist erforderlich' }, { status: 400 });
    }

    const result = await db.prepare(`
      INSERT INTO bookings (
        guest_id, booking_number, platform, arrival_date, departure_date,
        adults, children, pets, rental_price, deposit_amount, deposit_paid,
        final_payment, final_payment_paid, electricity_flat, additional_payment,
        security_deposit, additional_costs, final_cleaning, first_contact_date,
        offer_sent, contract_sent, welcome_guide_sent, admin_briefed, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.guest_id,
      data.booking_number || null,
      data.platform || null,
      data.arrival_date || null,
      data.departure_date || null,
      data.adults || 2,
      data.children || 0,
      data.pets || null,
      data.rental_price || 0,
      data.deposit_amount || 0,
      data.deposit_paid || 0,
      data.final_payment || 0,
      data.final_payment_paid || 0,
      data.electricity_flat || 0,
      data.additional_payment || 0,
      data.security_deposit || 0,
      data.additional_costs || null,
      data.final_cleaning || null,
      data.first_contact_date || null,
      data.offer_sent || 0,
      data.contract_sent || 0,
      data.welcome_guide_sent || 0,
      data.admin_briefed || 0,
      data.status || 'active',
      data.notes || null
    ).run();

    // Fetch the created booking
    const booking = await db.prepare(
      'SELECT * FROM bookings WHERE id = ?'
    ).bind(result.meta.last_row_id).first<Booking>();

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Buchung' }, { status: 500 });
  }
}

// PUT - Update a booking
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await request.json() as Partial<Booking> & { id: number };

    if (!data.id) {
      return NextResponse.json({ error: 'Buchungs-ID ist erforderlich' }, { status: 400 });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    const fields = [
      'booking_number', 'platform', 'arrival_date', 'departure_date',
      'adults', 'children', 'pets', 'rental_price', 'deposit_amount', 'deposit_paid',
      'final_payment', 'final_payment_paid', 'electricity_flat', 'additional_payment',
      'security_deposit', 'additional_costs', 'final_cleaning', 'first_contact_date',
      'offer_sent', 'contract_sent', 'welcome_guide_sent', 'admin_briefed', 'status', 'notes',
      'cleaning_cash', 'utilities_cash'
    ];

    for (const field of fields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        values.push((data as Record<string, string | number | null>)[field] ?? null);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(data.id);

    await db.prepare(`
      UPDATE bookings SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    // Fetch updated booking
    const booking = await db.prepare(
      'SELECT * FROM bookings WHERE id = ?'
    ).bind(data.id).first<Booking>();

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Buchung' }, { status: 500 });
  }
}

// DELETE - Delete a booking
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Buchungs-ID ist erforderlich' }, { status: 400 });
    }

    await db.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Buchung' }, { status: 500 });
  }
}
