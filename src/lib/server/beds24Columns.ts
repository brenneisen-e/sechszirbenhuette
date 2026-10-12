// Spalten, die der Beds24-Webhook und das Beds24-Cockpit in `bookings`
// beschreiben. Der Webhook läuft unabhängig vom Admin Center, das die
// Auto-Migration anstößt — er darf nicht ausfallen, nur weil die Migration
// noch nicht gelaufen ist. Deshalb werden die Spalten hier bei Bedarf
// nachgezogen. Jedes Statement einzeln, ein Fehler bedeutet: Spalte existiert.

import { ensureCoreTables } from '@/lib/server/coreTables';

export const BEDS24_BOOKING_COLUMNS: Array<[column: string, type: string]> = [
  // Von der Übernahme mitgeschrieben, im ursprünglichen Schema nicht enthalten
  ['children_ages', 'TEXT'],
  ['kurtaxe_cash', 'REAL DEFAULT 0'],
  ['beds24_booking_id', 'TEXT DEFAULT NULL'],
  ['expected_checkin_time', 'TEXT DEFAULT NULL'],
  ['late_checkin_requested', 'INTEGER DEFAULT 0'],
  ['checkin_time_source', 'TEXT DEFAULT NULL'],
];

interface RunnableDb {
  prepare(query: string): {
    run(): Promise<unknown>;
    all<T>(): Promise<{ results?: T[] }>;
    first<T>(): Promise<T | null>;
  };
}

let verified = false;

export async function ensureBeds24BookingColumns(db: RunnableDb): Promise<void> {
  // Pro Worker-Instanz genügt ein Durchlauf; danach sind die Spalten sicher da.
  if (verified) return;
  // Ohne Kerntabellen laufen die Spalten-Ergänzungen ins Leere
  await ensureCoreTables(db);
  for (const [column, type] of BEDS24_BOOKING_COLUMNS) {
    try {
      await db.prepare(`ALTER TABLE bookings ADD COLUMN ${column} ${type}`).run();
    } catch {
      /* Spalte existiert bereits */
    }
  }
  verified = true;
}
