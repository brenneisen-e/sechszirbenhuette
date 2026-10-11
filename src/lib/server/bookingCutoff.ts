// Buchungsschluss: Buchungen nur bis zum Vortag der Anreise annehmen.
//
// Weder Beds24 noch die API bieten einen Vorlauf, der verlässlich an
// Booking.com, Feratel und FeWo-direkt durchgereicht wird. Deshalb sperrt die
// App bei aktiver Einstellung jeden Tag kurz nach Mitternacht (Wiener Zeit)
// den neuen Tag bei Beds24 (Verfügbarkeit 0) — Beds24 gibt die Sperre an alle
// verbundenen Portale weiter.
//
// Ausgelöst wird der Lauf von einem geplanten GitHub-Workflow
// (.github/workflows/buchungsschluss.yml) über /api/booking-cutoff und als
// Rückfall beim Öffnen des Beds24-Tabs. Pro Tag läuft er höchstens einmal
// erfolgreich: Wird der Tag danach im Cockpit von Hand freigegeben, bleibt er frei.

import { writeAppLog } from '@/lib/server/appLog';
import {
  fetchBeds24Availability,
  getSetting,
  setBeds24Availability,
  setSetting,
} from '@/lib/server/beds24';

export type BookingCutoffMode = 'same_day' | 'day_before';

const KEY_MODE = 'booking_cutoff_mode';
/** Tag (YYYY-MM-DD), für den der Lauf zuletzt abgeschlossen wurde */
const KEY_LAST_RUN = 'booking_cutoff_last_run';
/** Tag, den der Lauf selbst gesperrt hat — nur den gibt das Abschalten frei */
const KEY_CLOSED_DAY = 'booking_cutoff_closed_day';

export function todayVienna(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Vienna' });
}

export async function getBookingCutoffMode(db: D1Database): Promise<BookingCutoffMode> {
  try {
    return (await getSetting(db, KEY_MODE)) === 'day_before' ? 'day_before' : 'same_day';
  } catch {
    return 'same_day';
  }
}

export interface BookingCutoffStatus {
  mode: BookingCutoffMode;
  today: string;
  lastRun: string | null;
  closedDay: string | null;
}

export async function getBookingCutoffStatus(db: D1Database): Promise<BookingCutoffStatus> {
  return {
    mode: await getBookingCutoffMode(db),
    today: todayVienna(),
    lastRun: await getSetting(db, KEY_LAST_RUN).catch(() => null),
    closedDay: await getSetting(db, KEY_CLOSED_DAY).catch(() => null),
  };
}

async function nightIsBooked(db: D1Database, night: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM bookings
        WHERE status != 'cancelled' AND arrival_date <= ? AND departure_date > ?
        LIMIT 1`,
    )
    .bind(night, night)
    .first<{ id: number }>();
  return !!row;
}

export type BookingCutoffResult =
  | 'disabled'
  | 'already_done'
  | 'booked'
  | 'already_closed'
  | 'closed'
  | 'error';

/**
 * Den heutigen Tag sperren, falls die Einstellung „bis Vortag“ aktiv ist.
 * Mehrfache Aufrufe am selben Tag kosten nur einen Datenbankzugriff.
 */
export async function runBookingCutoff(
  db: D1Database,
  options: { force?: boolean } = {},
): Promise<{ result: BookingCutoffResult; error?: string }> {
  if ((await getBookingCutoffMode(db)) !== 'day_before') return { result: 'disabled' };

  const today = todayVienna();
  if (!options.force && (await getSetting(db, KEY_LAST_RUN)) === today) {
    return { result: 'already_done' };
  }

  // Heute Nacht ist schon jemand da — dann gibt es nichts zu sperren
  if (await nightIsBooked(db, today)) {
    await setSetting(db, KEY_LAST_RUN, today);
    return { result: 'booked' };
  }

  const { availability, error } = await fetchBeds24Availability(db, today, today);
  if (!availability) {
    await writeAppLog(db, 'error', 'buchungsschluss', 'run', 'Beds24 nicht erreichbar', error);
    return { result: 'error', error };
  }
  if (availability.closedNights.includes(today)) {
    await setSetting(db, KEY_LAST_RUN, today);
    return { result: 'already_closed' };
  }

  const set = await setBeds24Availability(db, availability.roomId, [
    { from: today, to: today, numAvail: 0 },
  ]);
  if (!set.success) {
    // Nicht als erledigt vermerken — der nächste Lauf versucht es erneut
    await writeAppLog(
      db,
      'error',
      'buchungsschluss',
      'run',
      `Sperre für ${today} von Beds24 abgelehnt`,
      set.error,
    );
    return { result: 'error', error: set.error };
  }

  await setSetting(db, KEY_LAST_RUN, today);
  await setSetting(db, KEY_CLOSED_DAY, today);
  await writeAppLog(
    db,
    'info',
    'buchungsschluss',
    'run',
    `${today} bei Beds24 gesperrt (Buchungen nur bis zum Vortag)`,
  );
  return { result: 'closed' };
}

/**
 * Einstellung ändern. Beim Einschalten wird der heutige Tag sofort gesperrt;
 * beim Abschalten gibt die App den heutigen Tag wieder frei, falls sie ihn
 * selbst gesperrt hat und keine Buchung darin liegt.
 */
export async function setBookingCutoffMode(
  db: D1Database,
  mode: BookingCutoffMode,
): Promise<{ result: BookingCutoffResult | 'reopened' | 'saved'; error?: string }> {
  await setSetting(db, KEY_MODE, mode);
  await writeAppLog(
    db,
    'info',
    'buchungsschluss',
    'mode',
    mode === 'day_before'
      ? 'Buchungsschluss auf „bis zum Vortag“ gestellt'
      : 'Buchungsschluss auf „bis zum Anreisetag“ gestellt',
  );

  if (mode === 'day_before') return runBookingCutoff(db, { force: true });

  const today = todayVienna();
  if ((await getSetting(db, KEY_CLOSED_DAY)) !== today || (await nightIsBooked(db, today))) {
    return { result: 'saved' };
  }
  const { availability, error } = await fetchBeds24Availability(db, today, today);
  if (!availability) return { result: 'error', error };
  const set = await setBeds24Availability(db, availability.roomId, [
    { from: today, to: today, numAvail: 1 },
  ]);
  if (!set.success) return { result: 'error', error: set.error };
  await setSetting(db, KEY_CLOSED_DAY, '');
  await writeAppLog(db, 'info', 'buchungsschluss', 'mode', `${today} wieder freigegeben`);
  return { result: 'reopened' };
}
