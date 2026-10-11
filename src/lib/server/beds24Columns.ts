// Spalten, die der Beds24-Webhook und das Beds24-Cockpit in `bookings`
// beschreiben. Der Webhook läuft unabhängig vom Admin Center, das die
// Auto-Migration anstößt — er darf nicht ausfallen, nur weil die Migration
// noch nicht gelaufen ist. Deshalb werden die Spalten hier bei Bedarf
// nachgezogen. Jedes Statement einzeln, ein Fehler bedeutet: Spalte existiert.

export const BEDS24_BOOKING_COLUMNS: Array<[column: string, type: string]> = [
  ['beds24_booking_id', 'TEXT DEFAULT NULL'],
  ['expected_checkin_time', 'TEXT DEFAULT NULL'],
  ['late_checkin_requested', 'INTEGER DEFAULT 0'],
  ['checkin_time_source', 'TEXT DEFAULT NULL'],
];

interface RunnableDb {
  prepare(query: string): { run(): Promise<unknown> };
}

let verified = false;

export async function ensureBeds24BookingColumns(db: RunnableDb): Promise<void> {
  // Pro Worker-Instanz genügt ein Durchlauf; danach sind die Spalten sicher da.
  if (verified) return;
  for (const [column, type] of BEDS24_BOOKING_COLUMNS) {
    try {
      await db.prepare(`ALTER TABLE bookings ADD COLUMN ${column} ${type}`).run();
    } catch {
      /* Spalte existiert bereits */
    }
  }
  verified = true;
}
