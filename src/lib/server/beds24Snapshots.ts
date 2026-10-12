// Sicherungen des Beds24-Kalenders vor jeder Änderung aus dem Admin Center.
//
// Beds24 kennt kein Rückgängig: Wer Preise überschreibt, verliert die alten
// Werte. Deshalb liest der Server vor jedem Schreibvorgang den betroffenen
// Zeitraum und legt ihn hier ab. Wiederhergestellt werden nur Preis und
// Mindestaufenthalt — nie die Verfügbarkeit, sonst würden Nächte freigegeben,
// die inzwischen gebucht sind.

import { BEDS24_API, parseJsonSafe } from '@/lib/server/beds24';

const MAX_SNAPSHOTS = 30;

export interface CalendarRun {
  from: string;
  to: string;
  price1?: number;
  minStay?: number;
  numAvail?: number;
}

export interface SnapshotRow {
  id: number;
  created_at: string;
  room_id: number;
  label: string;
  date_from: string;
  date_to: string;
  data: string;
}

let tableVerified = false;

async function ensureTable(db: D1Database): Promise<void> {
  if (tableVerified) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS beds24_calendar_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        room_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        date_from TEXT NOT NULL,
        date_to TEXT NOT NULL,
        data TEXT NOT NULL
      )`,
    )
    .run();
  tableVerified = true;
}

/** Aktuelle Kalenderwerte eines Zimmers im Zeitraum lesen (Läufe wie Beds24 sie liefert). */
export async function readCalendarRuns(
  token: string,
  roomId: number,
  from: string,
  to: string,
): Promise<{ runs?: CalendarRun[]; error?: string }> {
  const res = await fetch(
    `${BEDS24_API}/inventory/rooms/calendar?roomId=${roomId}&startDate=${from}&endDate=${to}` +
      '&includePrices=true&includeMinStay=true&includeNumAvail=true',
    { headers: { token, Accept: 'application/json' } },
  );
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) return { error: `Beds24 antwortete mit HTTP ${res.status}` };

  const rows = (parsed.data as { data?: unknown })?.data;
  const runs: CalendarRun[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const list = (row as { calendar?: unknown }).calendar;
    for (const entry of Array.isArray(list) ? list : []) {
      const e = entry as CalendarRun;
      if (!e.from) continue;
      // Auf den angefragten Zeitraum zuschneiden
      const runFrom = e.from < from ? from : e.from;
      const runTo = (e.to || e.from) > to ? to : e.to || e.from;
      if (runTo < runFrom) continue;
      runs.push({
        from: runFrom,
        to: runTo,
        price1: typeof e.price1 === 'number' ? e.price1 : undefined,
        minStay: typeof e.minStay === 'number' ? e.minStay : undefined,
        numAvail: typeof e.numAvail === 'number' ? e.numAvail : undefined,
      });
    }
  }
  return { runs };
}

/**
 * Zeitraum vor einer Änderung sichern. Schlägt das Lesen fehl, wird die
 * Änderung abgebrochen — lieber nichts schreiben als ohne Sicherung.
 */
export async function saveSnapshot(
  db: D1Database,
  token: string,
  roomId: number,
  from: string,
  to: string,
  label: string,
): Promise<{ id?: number; error?: string }> {
  await ensureTable(db);
  const { runs, error } = await readCalendarRuns(token, roomId, from, to);
  if (!runs) return { error: `Sicherung fehlgeschlagen: ${error}` };

  const result = await db
    .prepare(
      `INSERT INTO beds24_calendar_snapshots (room_id, label, date_from, date_to, data)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(roomId, label.slice(0, 200), from, to, JSON.stringify(runs))
    .run();
  await db
    .prepare(
      `DELETE FROM beds24_calendar_snapshots WHERE id NOT IN
         (SELECT id FROM beds24_calendar_snapshots ORDER BY id DESC LIMIT ?)`,
    )
    .bind(MAX_SNAPSHOTS)
    .run();
  return { id: Number(result.meta?.last_row_id) || undefined };
}

export async function listSnapshots(db: D1Database, roomIds: number[]): Promise<SnapshotRow[]> {
  await ensureTable(db);
  if (roomIds.length === 0) return [];
  const result = await db
    .prepare(
      `SELECT id, created_at, room_id, label, date_from, date_to, data
         FROM beds24_calendar_snapshots
        WHERE room_id IN (${roomIds.map(() => '?').join(', ')})
        ORDER BY id DESC`,
    )
    .bind(...roomIds)
    .all<SnapshotRow>();
  return result.results || [];
}

export async function getSnapshot(db: D1Database, id: number): Promise<SnapshotRow | null> {
  await ensureTable(db);
  return db
    .prepare('SELECT * FROM beds24_calendar_snapshots WHERE id = ?')
    .bind(id)
    .first<SnapshotRow>();
}

/** Preis und Mindestaufenthalt einer Sicherung als Beds24-Kalendereinträge. */
export function restoreEntries(snapshot: SnapshotRow): Record<string, unknown>[] {
  let runs: CalendarRun[] = [];
  try {
    runs = JSON.parse(snapshot.data) as CalendarRun[];
  } catch {
    return [];
  }
  return runs
    .filter((r) => r.price1 !== undefined || r.minStay !== undefined)
    .map((r) => {
      const entry: Record<string, unknown> = { from: r.from, to: r.to };
      if (r.price1 !== undefined) entry.price1 = r.price1;
      if (r.minStay !== undefined) entry.minStay = r.minStay;
      return entry;
    });
}
