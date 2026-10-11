// Übernahme und Abgleich von Beds24-Buchungen aus dem Cockpit.
//
// Läuft serverseitig über /api/admin/beds24 statt über die Gäste-API: Gast
// wiedererkennen, fehlende Kontaktdaten ergänzen und Buchung anlegen gehören
// zusammen und sollen dieselben Regeln nutzen wie der Webhook
// (lib/server/guestMatch.ts). Von Hand gepflegte Daten werden nie
// überschrieben, nur Lücken gefüllt.

import { ensureBeds24BookingColumns } from '@/lib/server/beds24Columns';
import { findExistingGuest, type MatchReason } from '@/lib/server/guestMatch';

export interface ImportGuestInput {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  /** 2-Buchstaben-Länderkürzel */
  nationality?: string | null;
}

export interface ImportBookingInput {
  beds24_booking_id: string;
  booking_number: string;
  platform: string;
  arrival_date: string;
  departure_date: string;
  adults: number;
  children: number;
  children_ages?: string | null;
  pets?: string | null;
  rental_price: number;
  additional_costs?: string | null;
  kurtaxe_cash?: number;
  expected_checkin_time?: string | null;
  late_checkin_requested?: number;
  checkin_time_source?: string | null;
}

interface GuestRow {
  id: number;
  guest_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clean(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().slice(0, max);
  return text || null;
}

/** Fehlende Kontaktdaten und Nationalität am Gast ergänzen — nie überschreiben. */
export async function backfillGuest(
  db: D1Database,
  guestId: number,
  data: { email?: string | null; phone?: string | null; nationality?: string | null },
): Promise<string[]> {
  const guest = await db
    .prepare('SELECT id, guest_name, email, phone, nationality FROM guests WHERE id = ?')
    .bind(guestId)
    .first<GuestRow>();
  if (!guest) return [];

  const email = clean(data.email, 200);
  const phone = clean(data.phone, 50);
  const nationality = clean(data.nationality, 2)?.toUpperCase() || null;

  const added: string[] = [];
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (email && !guest.email?.trim()) {
    sets.push('email = ?');
    values.push(email);
    added.push('email');
  }
  if (phone && !guest.phone?.trim()) {
    sets.push('phone = ?');
    values.push(phone);
    added.push('phone');
  }
  if (nationality && /^[A-Z]{2}$/.test(nationality) && !guest.nationality?.trim()) {
    sets.push('nationality = ?');
    values.push(nationality);
    added.push('nationality');
  }
  if (sets.length === 0) return [];

  await db
    .prepare(`UPDATE guests SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(...values, guestId)
    .run();
  return added;
}

export type ImportResult =
  | {
      ok: true;
      guestId: number;
      guestName: string;
      bookingId: number;
      /** Gründe, falls ein bestehender Gast wiedererkannt wurde */
      matched: MatchReason[];
      /** Am Gast ergänzte Felder (email, phone, nationality) */
      added: string[];
    }
  | { ok: false; error: string; status: number };

/**
 * Beds24-Buchung in die Gästedatenbank übernehmen.
 * `guestId` = bestehender Gast oder 'new' (wird über guestMatch wiedererkannt
 * oder aus den Buchungsdaten angelegt).
 */
export async function importBeds24Booking(
  db: D1Database,
  guestId: number | 'new',
  guest: ImportGuestInput,
  booking: ImportBookingInput,
): Promise<ImportResult> {
  if (!DATE_RE.test(booking.arrival_date) || !DATE_RE.test(booking.departure_date)) {
    return { ok: false, error: 'Ungültiger Zeitraum', status: 400 };
  }
  if (booking.departure_date <= booking.arrival_date) {
    return { ok: false, error: 'Abreise liegt nicht nach der Anreise', status: 400 };
  }
  const beds24Id = clean(booking.beds24_booking_id, 50);
  const bookingNumber = clean(booking.booking_number, 100) || beds24Id;
  if (!bookingNumber) return { ok: false, error: 'Buchungsnummer fehlt', status: 400 };

  await ensureBeds24BookingColumns(db);

  // Dubletten-Schutz: dieselbe Buchung nie zweimal anlegen
  const duplicate = await db
    .prepare(
      `SELECT id FROM bookings
        WHERE COALESCE(status, '') <> 'cancelled'
          AND (booking_number = ? OR booking_number = ? OR beds24_booking_id = ?)
        LIMIT 1`,
    )
    .bind(bookingNumber, beds24Id || bookingNumber, beds24Id || bookingNumber)
    .first<{ id: number }>();
  if (duplicate) {
    return { ok: false, error: 'Diese Buchung ist bereits in der Gästedatenbank', status: 409 };
  }

  let resolvedId: number;
  let guestName = clean(guest.name, 200) || `Buchung #${bookingNumber}`;
  let matched: MatchReason[] = [];

  if (guestId === 'new') {
    const match = await findExistingGuest(db, {
      name: guestName,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
    });
    if (match) {
      resolvedId = match.guest.id;
      guestName = match.guest.guest_name;
      matched = match.reasons;
    } else {
      const inserted = await db
        .prepare(
          `INSERT INTO guests (guest_name, email, phone, address, nationality, platform, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        )
        .bind(
          guestName,
          clean(guest.email, 200),
          clean(guest.phone, 50),
          clean(guest.address, 300),
          clean(guest.nationality, 2)?.toUpperCase() || null,
          clean(booking.platform, 50),
        )
        .run();
      resolvedId = Number(inserted.meta?.last_row_id);
      if (!resolvedId)
        return { ok: false, error: 'Gast konnte nicht angelegt werden', status: 500 };
    }
  } else {
    const existing = await db
      .prepare('SELECT id, guest_name FROM guests WHERE id = ?')
      .bind(guestId)
      .first<{ id: number; guest_name: string }>();
    if (!existing) return { ok: false, error: 'Gast nicht gefunden', status: 404 };
    resolvedId = existing.id;
    guestName = existing.guest_name;
  }

  // Bei neu angelegten Gästen stehen die Daten schon im INSERT — dann
  // ergänzt der Abgleich nichts mehr.
  const added = await backfillGuest(db, resolvedId, guest);

  const result = await db
    .prepare(
      `INSERT INTO bookings (guest_id, booking_number, platform, arrival_date, departure_date,
        adults, children, children_ages, pets, rental_price, additional_costs, kurtaxe_cash,
        status, beds24_booking_id, expected_checkin_time, late_checkin_requested,
        checkin_time_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    )
    .bind(
      resolvedId,
      bookingNumber,
      clean(booking.platform, 50),
      booking.arrival_date,
      booking.departure_date,
      Math.max(0, Math.round(Number(booking.adults) || 0)) || 2,
      Math.max(0, Math.round(Number(booking.children) || 0)),
      clean(booking.children_ages, 100),
      clean(booking.pets, 100),
      Number(booking.rental_price) || 0,
      clean(booking.additional_costs, 5000),
      booking.kurtaxe_cash ? 1 : 0,
      beds24Id,
      clean(booking.expected_checkin_time, 50),
      booking.late_checkin_requested ? 1 : 0,
      clean(booking.checkin_time_source, 20),
    )
    .run();
  const bookingId = Number(result.meta?.last_row_id);

  return { ok: true, guestId: resolvedId, guestName, bookingId, matched, added };
}

export interface SyncFinanceInput {
  additional_costs: string;
  rental_price: number;
  kurtaxe_cash: number;
  children_ages?: string | null;
  pets?: string | null;
}

/**
 * Bereits übernommene Buchung mit Beds24 abgleichen: Lücken am Gast füllen
 * und — falls übergeben — die Finanzwerte der Buchung aktualisieren.
 * Kinderalter und Haustier werden nur gesetzt, wenn noch nichts eingetragen ist.
 */
export async function syncBeds24Booking(
  db: D1Database,
  bookingId: number,
  guest: { email?: string | null; phone?: string | null; nationality?: string | null },
  finance: SyncFinanceInput | null,
  beds24Id: string | null,
): Promise<{ ok: boolean; added: string[]; financeUpdated: boolean; error?: string }> {
  await ensureBeds24BookingColumns(db);
  const booking = await db
    .prepare('SELECT id, guest_id, children_ages, pets FROM bookings WHERE id = ?')
    .bind(bookingId)
    .first<{ id: number; guest_id: number; children_ages: string | null; pets: string | null }>();
  if (!booking) return { ok: false, added: [], financeUpdated: false, error: 'Buchung fehlt' };

  const added = booking.guest_id ? await backfillGuest(db, booking.guest_id, guest) : [];

  const id = clean(beds24Id, 50);
  if (id) {
    await db
      .prepare(
        `UPDATE bookings SET beds24_booking_id = ?
          WHERE id = ? AND COALESCE(beds24_booking_id, '') = ''`,
      )
      .bind(id, bookingId)
      .run();
  }

  if (!finance) return { ok: true, added, financeUpdated: false };

  const sets = ['additional_costs = ?', 'rental_price = ?', 'kurtaxe_cash = ?'];
  const values: (string | number)[] = [
    String(finance.additional_costs).slice(0, 5000),
    Number(finance.rental_price) || 0,
    finance.kurtaxe_cash ? 1 : 0,
  ];
  const ages = clean(finance.children_ages, 100);
  if (ages && !booking.children_ages?.trim()) {
    sets.push('children_ages = ?');
    values.push(ages);
  }
  const pets = clean(finance.pets, 100);
  if (pets && !booking.pets?.trim()) {
    sets.push('pets = ?');
    values.push(pets);
  }
  await db
    .prepare(`UPDATE bookings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(...values, bookingId)
    .run();
  return { ok: true, added, financeUpdated: true };
}
