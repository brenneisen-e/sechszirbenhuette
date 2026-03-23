import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

interface LegacyGuest {
  id: number;
  guest_name: string;
  booking_number: string | null;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages: string | null;
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
  other_notes: string | null;
  cleaning_cash: number;
  is_private: number;
}

function getAdminPassword(env: Env): string {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD || '';
}

// Query to find legacy guests: those without any bookings AND with booking-relevant data
const LEGACY_GUEST_QUERY = `
  SELECT g.*
  FROM guests g
  LEFT JOIN bookings b ON g.id = b.guest_id
  WHERE b.id IS NULL
    AND (g.arrival_date IS NOT NULL OR g.departure_date IS NOT NULL OR g.rental_price > 0)
  ORDER BY g.arrival_date DESC
`;

// GET - Preview legacy guests that would be migrated
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const { results } = await db.prepare(LEGACY_GUEST_QUERY).all<LegacyGuest>();

    const guests = (results || []).map(g => ({
      id: g.id,
      guest_name: g.guest_name,
      arrival_date: g.arrival_date,
      departure_date: g.departure_date,
      platform: g.platform,
      rental_price: g.rental_price,
      status: g.status,
    }));

    return NextResponse.json({ count: guests.length, guests });
  } catch (error) {
    console.error('Error previewing legacy guests:', error);
    const message = error instanceof Error ? error.message : 'Fehler beim Laden';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Execute migration: create bookings from legacy guest data, then clear legacy fields
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const { results: legacyGuests } = await db.prepare(LEGACY_GUEST_QUERY).all<LegacyGuest>();

    if (!legacyGuests || legacyGuests.length === 0) {
      return NextResponse.json({ success: true, migrated: 0, details: [] });
    }

    const details: Array<{ guest_id: number; guest_name: string; status: 'migrated' | 'failed'; error?: string }> = [];

    for (const guest of legacyGuests) {
      try {
        // 1. Create booking entry from guest data
        await db.prepare(`
          INSERT INTO bookings (
            guest_id, booking_number, platform, arrival_date, departure_date,
            adults, children, children_ages, pets, rental_price,
            deposit_amount, deposit_paid, final_payment, final_payment_paid,
            electricity_flat, additional_payment, security_deposit,
            additional_costs, final_cleaning, first_contact_date,
            offer_sent, contract_sent, welcome_guide_sent, admin_briefed,
            status, notes, cleaning_cash, is_private
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          guest.id,
          guest.booking_number || null,
          guest.platform || null,
          guest.arrival_date || null,
          guest.departure_date || null,
          guest.adults || 2,
          guest.children || 0,
          guest.children_ages || null,
          guest.pets || null,
          guest.rental_price || 0,
          guest.deposit_amount || 0,
          guest.deposit_paid || 0,
          guest.final_payment || 0,
          guest.final_payment_paid || 0,
          guest.electricity_flat || 0,
          guest.additional_payment || 0,
          guest.security_deposit || 0,
          guest.additional_costs || null,
          guest.final_cleaning || null,
          guest.first_contact_date || null,
          guest.offer_sent || 0,
          guest.contract_sent || 0,
          guest.welcome_guide_sent || 0,
          guest.admin_briefed || 0,
          guest.status || 'active',
          guest.other_notes || null,
          guest.cleaning_cash || 0,
          guest.is_private || 0
        ).run();

        // 2. Clear legacy booking fields on the guest record
        await db.prepare(`
          UPDATE guests SET
            arrival_date = NULL,
            departure_date = NULL,
            booking_number = NULL,
            first_contact_date = NULL,
            additional_costs = NULL,
            final_cleaning = NULL,
            other_notes = NULL,
            rental_price = 0,
            deposit_amount = 0,
            deposit_paid = 0,
            final_payment = 0,
            final_payment_paid = 0,
            electricity_flat = 0,
            additional_payment = 0,
            security_deposit = 0,
            cleaning_cash = 0,
            offer_sent = 0,
            contract_sent = 0,
            welcome_guide_sent = 0,
            admin_briefed = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(guest.id).run();

        details.push({ guest_id: guest.id, guest_name: guest.guest_name, status: 'migrated' });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler';
        details.push({ guest_id: guest.id, guest_name: guest.guest_name, status: 'failed', error: errorMsg });
      }
    }

    const migratedCount = details.filter(d => d.status === 'migrated').length;

    return NextResponse.json({ success: true, migrated: migratedCount, total: legacyGuests.length, details });
  } catch (error) {
    console.error('Error migrating legacy guests:', error);
    const message = error instanceof Error ? error.message : 'Fehler bei der Migration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
