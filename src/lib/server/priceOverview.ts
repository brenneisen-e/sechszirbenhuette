// Preisdaten der eigenen Hütte für die Preisübersicht beider Hütten.
// Gelesen und geschrieben vom eigenen Admin Center (/api/admin/price-overview)
// und vom verbundenen Admin Center der Natberger Hütte (/api/partner).
//
// Geschrieben werden nur Preis (price1) und Mindestaufenthalt, nie die
// Verfügbarkeit. Vor jedem Schreiben wird der ganze Zeitraum gesichert
// (lib/server/beds24Snapshots.ts) — ohne Sicherung wird nichts geschrieben.
//
// Das Beds24-Konto wird mit der Natberger Hütte geteilt: Alles ist auf die
// gewählte Unterkunft (settings.beds24_property_id) beschränkt, auch wenn
// der Aufruf aus dem Admin Center der Natberger Hütte kommt.

import {
  addDaysIso,
  type CalendarEntryInput,
  type HutData,
  type HutDay,
  type PriceRules,
  sanitizeRules,
} from '@/lib/pricing/dynamicPricing';
import {
  BEDS24_API,
  beds24ResultError,
  getBeds24AccessToken,
  getPropertyId,
  getSetting,
  KEY_ROOM_ID,
  parseJsonSafe,
  setSetting,
} from '@/lib/server/beds24';
import { getSnapshot, restoreEntries, saveSnapshot } from '@/lib/server/beds24Snapshots';
import { HUT_KEY, HUT_NAME } from '@/lib/server/partner';

const KEY_RULES = 'price_rules';
const KEY_LAST_SNAPSHOT = 'price_overview_last_snapshot';
const MAX_ENTRIES_PER_CALL = 200;
const MAX_ENTRIES = 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface RoomOption {
  id: number;
  name: string;
  propertyName: string;
  /** Beds24 führt für das Zimmer Preise */
  hasPrices: boolean;
}

export interface Outcome<T> {
  data?: T;
  error?: string;
  status?: number;
  /** Es ist noch kein Beds24-Zimmer für diese Hütte festgelegt */
  needsRoom?: boolean;
}

/** Heutiges Datum in Österreich (YYYY-MM-DD) */
export function viennaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Zimmer, für die Beds24 in den nächsten 90 Tagen Preise führt */
async function roomsWithPrices(token: string, filter: string): Promise<Set<number>> {
  const from = viennaToday();
  const res = await fetch(
    `${BEDS24_API}/inventory/rooms/calendar?startDate=${from}&endDate=${addDaysIso(from, 90)}` +
      `&includePrices=true${filter}`,
    { headers: { token, Accept: 'application/json' } },
  );
  const parsed = await parseJsonSafe(res);
  const priced = new Set<number>();
  if (!res.ok || !parsed.ok) return priced;
  const rows = (parsed.data as { data?: unknown })?.data;
  for (const row of Array.isArray(rows) ? rows : []) {
    const r = row as { roomId?: unknown; calendar?: unknown };
    const list = Array.isArray(r.calendar) ? r.calendar : [];
    if (list.some((e) => typeof (e as { price1?: unknown }).price1 === 'number')) {
      priced.add(Number(r.roomId));
    }
  }
  return priced;
}

/** Zimmer der gewählten Unterkunft — zur Auswahl in der Preisübersicht */
export async function listRoomOptions(db: D1Database): Promise<Outcome<RoomOption[]>> {
  const propertyId = await getPropertyId(db);
  if (!propertyId) {
    return {
      error: 'Bitte zuerst im Tab Beds24 die Unterkunft der Sechszirbenhütte wählen',
      status: 409,
    };
  }
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang', status: 400 };
  const res = await fetch(`${BEDS24_API}/properties?id=${propertyId}&includeAllRooms=true`, {
    headers: { token, Accept: 'application/json' },
  });
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) {
    return { error: `Beds24 antwortete mit HTTP ${res.status}`, status: 502 };
  }
  const rows = (parsed.data as { data?: unknown })?.data;
  const priced = await roomsWithPrices(token, `&propertyId=${propertyId}`);
  const rooms: RoomOption[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const p = row as { id?: unknown; name?: unknown; roomTypes?: unknown };
    if (Number(p.id) !== propertyId) continue;
    for (const r of Array.isArray(p.roomTypes) ? p.roomTypes : []) {
      const room = r as { id?: unknown; name?: unknown };
      const id = Number(room.id);
      if (Number.isFinite(id) && id > 0) {
        rooms.push({
          id,
          name: String(room.name ?? ''),
          propertyName: String(p.name ?? ''),
          hasPrices: priced.has(id),
        });
      }
    }
  }
  return { data: rooms };
}

/**
 * Zimmer wie beim Buchungsschluss: fest hinterlegtes Zimmer der Unterkunft,
 * sonst das erste mit Preisen, sonst das erste — immer nur innerhalb der
 * gewählten Unterkunft.
 */
async function resolveRoom(db: D1Database): Promise<Outcome<RoomOption>> {
  const options = await listRoomOptions(db);
  if (!options.data) return { error: options.error, status: options.status };
  const fixed = Number(await getSetting(db, KEY_ROOM_ID));
  const room =
    options.data.find((r) => r.id === fixed) ||
    options.data.find((r) => r.hasPrices) ||
    options.data[0];
  if (!room) {
    return {
      error: 'Für die Sechszirbenhütte ist noch kein Beds24-Zimmer festgelegt',
      needsRoom: true,
      status: 409,
    };
  }
  return { data: room };
}

/** Beds24-Zimmer der Sechszirbenhütte festlegen (gilt auch für den Buchungsschluss) */
export async function setOwnRoom(db: D1Database, roomId: number): Promise<Outcome<RoomOption>> {
  const options = await listRoomOptions(db);
  if (!options.data) return { error: options.error, status: options.status };
  const room = options.data.find((r) => r.id === roomId);
  if (!room)
    return { error: `Zimmer ${roomId} gehört nicht zur gewählten Unterkunft`, status: 400 };
  await setSetting(db, KEY_ROOM_ID, String(roomId));
  return { data: room };
}

async function readRules(db: D1Database): Promise<PriceRules | null> {
  const raw = await getSetting(db, KEY_RULES);
  if (!raw) return null;
  try {
    return sanitizeRules(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readLastChange(db: D1Database, roomId: number): Promise<HutData['lastChange']> {
  const id = Number(await getSetting(db, KEY_LAST_SNAPSHOT));
  if (!Number.isFinite(id) || id <= 0) return null;
  const snapshot = await getSnapshot(db, id);
  if (!snapshot || snapshot.room_id !== roomId) return null;
  return { snapshotId: snapshot.id, label: snapshot.label, createdAt: snapshot.created_at };
}

/** Preise, Mindestaufenthalte und Verfügbarkeit der nächsten Monate */
export async function getOwnPriceData(db: D1Database, months: number): Promise<Outcome<HutData>> {
  const room = await resolveRoom(db);
  if (!room.data) return { error: room.error, status: room.status, needsRoom: room.needsRoom };
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang', status: 400 };

  const from = viennaToday();
  const to = addDaysIso(addMonthsIso(from, Math.min(Math.max(months || 12, 1), 18)), -1);
  const res = await fetch(
    `${BEDS24_API}/inventory/rooms/calendar?roomId=${room.data.id}&startDate=${from}&endDate=${to}` +
      '&includeNumAvail=true&includePrices=true&includeMinStay=true',
    { headers: { token, Accept: 'application/json' } },
  );
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) {
    return { error: `Beds24 antwortete mit HTTP ${res.status}`, status: 502 };
  }

  const days: Record<string, HutDay> = {};
  const rows = (parsed.data as { data?: unknown })?.data;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (Number((row as { roomId?: unknown }).roomId) !== room.data.id) continue;
    const list = (row as { calendar?: unknown }).calendar;
    for (const item of Array.isArray(list) ? list : []) {
      const e = item as {
        from?: string;
        to?: string;
        price1?: unknown;
        minStay?: unknown;
        numAvail?: unknown;
      };
      if (!e.from) continue;
      const runTo = e.to || e.from;
      const last = runTo < to ? runTo : to;
      for (let day = e.from < from ? from : e.from; day <= last; day = addDaysIso(day, 1)) {
        const entry: HutDay = { a: Number(e.numAvail) === 0 ? 0 : 1 };
        if (typeof e.price1 === 'number') entry.p = e.price1;
        if (typeof e.minStay === 'number') entry.m = e.minStay;
        days[day] = entry;
      }
    }
  }

  return {
    data: {
      hut: HUT_KEY,
      name: HUT_NAME,
      roomId: room.data.id,
      roomName: [room.data.propertyName, room.data.name].filter(Boolean).join(' · '),
      from,
      to,
      days,
      rules: await readRules(db),
      lastChange: await readLastChange(db, room.data.id),
    },
  };
}

/** Eingehende Einträge prüfen — nur Preis und Mindestaufenthalt, ab heute */
function validateEntries(input: unknown): { entries?: Record<string, unknown>[]; error?: string } {
  const list = Array.isArray(input) ? input : [];
  if (list.length === 0) return { error: 'Keine Änderungen übergeben' };
  if (list.length > MAX_ENTRIES) return { error: 'Zu viele Zeiträume auf einmal' };
  const earliest = addDaysIso(viennaToday(), -1);
  const entries: Record<string, unknown>[] = [];
  for (const raw of list as CalendarEntryInput[]) {
    const from = String(raw?.from ?? '');
    const to = String(raw?.to ?? '');
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || to < from || from < earliest) {
      return { error: `Ungültiger Zeitraum ${from} – ${to}` };
    }
    const entry: Record<string, unknown> = { from, to };
    if (raw.price1 !== undefined && raw.price1 !== null) {
      const price = Number(raw.price1);
      if (!Number.isFinite(price) || price <= 0 || price > 100000) {
        return { error: `Ungültiger Preis ab ${from}` };
      }
      entry.price1 = Math.round(price * 100) / 100;
    }
    if (raw.minStay !== undefined && raw.minStay !== null) {
      const minStay = Number(raw.minStay);
      if (!Number.isInteger(minStay) || minStay < 1 || minStay > 365) {
        return { error: `Ungültiger Mindestaufenthalt ab ${from}` };
      }
      entry.minStay = minStay;
    }
    if (Object.keys(entry).length === 2) return { error: `Keine Änderung ab ${from}` };
    entries.push(entry);
  }
  return { entries };
}

async function postCalendar(
  token: string,
  roomId: number,
  entries: Record<string, unknown>[],
): Promise<{ written: number; error?: string }> {
  let written = 0;
  for (let i = 0; i < entries.length; i += MAX_ENTRIES_PER_CALL) {
    const chunk = entries.slice(i, i + MAX_ENTRIES_PER_CALL);
    const res = await fetch(`${BEDS24_API}/inventory/rooms/calendar`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([{ roomId, calendar: chunk }]),
    });
    const parsed = await parseJsonSafe(res);
    if (!res.ok || !parsed.ok) {
      return { written, error: `Beds24 antwortete mit HTTP ${res.status}` };
    }
    const apiError = beds24ResultError(parsed.data);
    if (apiError) return { written, error: `Beds24 hat die Änderung abgelehnt: ${apiError}` };
    written += chunk.length;
  }
  return { written };
}

/** Preise und Mindestaufenthalte schreiben (vorher sichern) */
export async function applyOwnEntries(
  db: D1Database,
  input: unknown,
  label: string,
): Promise<Outcome<{ snapshotId?: number; count: number }>> {
  const checked = validateEntries(input);
  if (!checked.entries) return { error: checked.error, status: 400 };
  const room = await resolveRoom(db);
  if (!room.data) return { error: room.error, status: room.status, needsRoom: room.needsRoom };
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang', status: 400 };

  const froms = checked.entries.map((e) => String(e.from)).sort();
  const tos = checked.entries.map((e) => String(e.to)).sort();
  const spanFrom = froms[0] ?? '';
  const spanTo = tos[tos.length - 1] ?? spanFrom;
  const snapshot = await saveSnapshot(
    db,
    token,
    room.data.id,
    spanFrom,
    spanTo,
    `Preisübersicht: ${label}`.slice(0, 200),
  );
  if (!snapshot.id) return { error: snapshot.error || 'Sicherung fehlgeschlagen', status: 502 };
  await setSetting(db, KEY_LAST_SNAPSHOT, String(snapshot.id));

  const result = await postCalendar(token, room.data.id, checked.entries);
  if (result.error) {
    const partly = result.written > 0 ? ` (${result.written} Zeiträume schon geschrieben)` : '';
    return { error: `${result.error}${partly}`, status: 502 };
  }
  return { data: { snapshotId: snapshot.id, count: result.written } };
}

/** Letzte Übernahme rückgängig machen: Preise und Mindestaufenthalte der Sicherung zurückschreiben */
export async function restoreOwnSnapshot(
  db: D1Database,
  snapshotId: number,
): Promise<Outcome<{ count: number }>> {
  const room = await resolveRoom(db);
  if (!room.data) return { error: room.error, status: room.status, needsRoom: room.needsRoom };
  const snapshot = await getSnapshot(db, snapshotId);
  if (!snapshot) return { error: 'Sicherung nicht gefunden', status: 404 };
  if (snapshot.room_id !== room.data.id) {
    return { error: 'Sicherung gehört zu einem anderen Zimmer', status: 403 };
  }
  const entries = restoreEntries(snapshot);
  if (entries.length === 0) return { error: 'Die Sicherung enthält keine Preise', status: 400 };
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang', status: 400 };

  const backup = await saveSnapshot(
    db,
    token,
    room.data.id,
    snapshot.date_from,
    snapshot.date_to,
    `Vor Rückgängig von Sicherung #${snapshot.id}`,
  );
  if (!backup.id) return { error: backup.error || 'Sicherung fehlgeschlagen', status: 502 };
  const result = await postCalendar(token, room.data.id, entries);
  if (result.error) return { error: result.error, status: 502 };
  if (Number(await getSetting(db, KEY_LAST_SNAPSHOT)) === snapshot.id) {
    await db.prepare('DELETE FROM settings WHERE key = ?').bind(KEY_LAST_SNAPSHOT).run();
  }
  return { data: { count: result.written } };
}

export async function saveOwnRules(db: D1Database, input: unknown): Promise<Outcome<PriceRules>> {
  const rules = sanitizeRules(input);
  rules.updatedAt = new Date().toISOString();
  await setSetting(db, KEY_RULES, JSON.stringify(rules));
  return { data: rules };
}
