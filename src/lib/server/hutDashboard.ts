// Daten der eigenen Hütte für den Reiter „Portalpreise“ (Preise je Plattform,
// Belegung). Gelesen vom eigenen Admin Center (/api/admin/dashboard) und vom
// verbundenen Admin Center der Partner-Hütte (/api/partner, Aktion
// dashboardData). Liegt bis auf die Kommentare identisch in beiden Repos.
//
// Nur lesend gegenüber Beds24 — geschrieben werden ausschließlich die
// Plattform-Einstellungen in settings.platform_prices. Gastnamen gehen nie
// an die Partner-Hütte (names: false).

import { beds24Source } from '@/lib/beds24Channels';
import {
  addDays,
  type BookingStatus,
  type DashboardBooking,
  type DashboardData,
  type DashboardDay,
  DATE_RE,
  daysBetween,
  type PlatformConfig,
  sanitizePlatformConfig,
} from '@/lib/dashboard/hutDashboard';
import {
  BEDS24_API,
  getBeds24AccessToken,
  getSetting,
  parseJsonSafe,
  setSetting,
} from '@/lib/server/beds24';
import { HUT_KEY, HUT_NAME } from '@/lib/server/partner';
import { type Outcome, resolveRoom, viennaToday } from '@/lib/server/priceOverview';

const KEY_PLATFORM_CONFIG = 'platform_prices';
const MAX_NIGHTS = 430;
const MAX_BOOKING_PAGES = 5;
const ACTIVE_STATUSES: BookingStatus[] = ['confirmed', 'new', 'request', 'black'];

export async function readPlatformConfig(db: D1Database): Promise<PlatformConfig> {
  const raw = await getSetting(db, KEY_PLATFORM_CONFIG);
  if (!raw) return sanitizePlatformConfig(null);
  try {
    return sanitizePlatformConfig(JSON.parse(raw));
  } catch {
    return sanitizePlatformConfig(null);
  }
}

export async function saveOwnPlatformConfig(
  db: D1Database,
  input: unknown,
): Promise<Outcome<PlatformConfig>> {
  const config = sanitizePlatformConfig(input);
  config.updatedAt = new Date().toISOString();
  await setSetting(db, KEY_PLATFORM_CONFIG, JSON.stringify(config));
  return { data: config };
}

/** Zeitraum prüfen: gültige Daten, höchstens gut 14 Monate */
function checkRange(
  fromInput: unknown,
  toInput: unknown,
): { from?: string; to?: string; error?: string } {
  const from = String(fromInput ?? '');
  const to = String(toInput ?? '');
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || to < from) {
    return { error: 'Ungültiger Zeitraum' };
  }
  if (daysBetween(from, to) > MAX_NIGHTS) return { error: 'Zeitraum zu lang' };
  return { from, to };
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

/** Tageswerte inkl. aller Preisfelder (price1 … price16) */
async function fetchDays(
  token: string,
  roomId: number,
  from: string,
  to: string,
): Promise<{ days?: Record<string, DashboardDay>; slots?: number[]; error?: string }> {
  const res = await fetch(
    `${BEDS24_API}/inventory/rooms/calendar?roomId=${roomId}&startDate=${from}&endDate=${to}` +
      '&includeNumAvail=true&includePrices=true&includeMinStay=true',
    { headers: { token, Accept: 'application/json' } },
  );
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) return { error: `Beds24 antwortete mit HTTP ${res.status}` };

  const days: Record<string, DashboardDay> = {};
  const slots = new Set<number>();
  const rows = (parsed.data as { data?: unknown })?.data;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (Number((row as { roomId?: unknown }).roomId) !== roomId) continue;
    const list = (row as { calendar?: unknown }).calendar;
    for (const item of Array.isArray(list) ? list : []) {
      const e = item as Record<string, unknown>;
      const start = text(e.from);
      if (!DATE_RE.test(start)) continue;
      const runTo = DATE_RE.test(text(e.to)) ? text(e.to) : start;
      const prices: Record<string, number> = {};
      for (let slot = 1; slot <= 16; slot++) {
        const value = e[`price${slot}`];
        if (typeof value === 'number' && value > 0) {
          prices[String(slot)] = value;
          slots.add(slot);
        }
      }
      const last = runTo < to ? runTo : to;
      for (let day = start < from ? from : start, guard = 0; day <= last && guard < 800; guard++) {
        const entry: DashboardDay = { a: Number(e.numAvail) === 0 ? 0 : 1 };
        if (typeof e.minStay === 'number') entry.m = e.minStay;
        if (Object.keys(prices).length > 0) entry.p = { ...prices };
        days[day] = entry;
        day = addDays(day, 1);
      }
    }
  }
  return { days, slots: [...slots].sort((a, b) => a - b) };
}

/** Buchungen, die mindestens eine Nacht im Zeitraum haben */
async function fetchBookings(
  token: string,
  roomId: number,
  from: string,
  to: string,
  names: boolean,
): Promise<{ bookings?: DashboardBooking[]; error?: string }> {
  const bookings: DashboardBooking[] = [];
  const base = `${BEDS24_API}/bookings?roomId=${roomId}&departureFrom=${addDays(from, 1)}&arrivalTo=${to}`;
  let url: string | null = base;
  for (let page = 1; url && page <= MAX_BOOKING_PAGES; page++) {
    const res: Response = await fetch(url, { headers: { token, Accept: 'application/json' } });
    const parsed = await parseJsonSafe(res);
    if (!res.ok || !parsed.ok) return { error: `Beds24 antwortete mit HTTP ${res.status}` };
    const body = parsed.data as {
      data?: unknown;
      pages?: { nextPageExists?: unknown; nextPageLink?: unknown };
    };
    for (const item of Array.isArray(body?.data) ? body.data : []) {
      const raw = item as Record<string, unknown>;
      if (Number(raw.roomId) !== roomId) continue;
      const status = text(raw.status).toLowerCase() as BookingStatus;
      if (!ACTIVE_STATUSES.includes(status)) continue;
      const arrival = text(raw.arrival);
      const departure = text(raw.departure);
      if (!DATE_RE.test(arrival) || !DATE_RE.test(departure) || departure <= arrival) continue;
      if (departure <= from || arrival > to) continue;
      const source = beds24Source(raw);
      const guests = (Number(raw.numAdult) || 0) + (Number(raw.numChild) || 0);
      const booking: DashboardBooking = {
        id: text(raw.id) || `${arrival}-${departure}`,
        arrival,
        departure,
        platform: source.platform,
        ical: source.ical,
        status,
      };
      if (guests > 0) booking.guests = guests;
      if (names) {
        const name = [text(raw.firstName), text(raw.lastName)].filter(Boolean).join(' ');
        if (name) booking.name = name.slice(0, 80);
      }
      bookings.push(booking);
    }
    // Weitere Seiten: Beds24 nennt den Link meist vollständig, sonst selbst zählen
    if (body?.pages?.nextPageExists !== true) {
      url = null;
    } else {
      const link = text(body.pages.nextPageLink);
      url = link.startsWith(`${BEDS24_API}/`) ? link : `${base}&page=${page + 1}`;
    }
  }
  bookings.sort((a, b) => a.arrival.localeCompare(b.arrival));
  return { bookings };
}

/** Preise (alle Preisfelder), Mindestaufenthalt, Verfügbarkeit und Buchungen im Zeitraum */
export async function getOwnDashboardData(
  db: D1Database,
  fromInput: unknown,
  toInput: unknown,
  options: { names: boolean },
): Promise<Outcome<DashboardData>> {
  const range = checkRange(fromInput, toInput);
  if (!range.from || !range.to) return { error: range.error, status: 400 };
  const room = await resolveRoom(db);
  if (!room.data) return { error: room.error, status: room.status, needsRoom: room.needsRoom };
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang', status: 400 };

  const [calendar, bookings, config] = await Promise.all([
    fetchDays(token, room.data.id, range.from, range.to),
    fetchBookings(token, room.data.id, range.from, range.to, options.names),
    readPlatformConfig(db),
  ]);
  if (!calendar.days) return { error: calendar.error, status: 502 };
  if (!bookings.bookings) return { error: bookings.error, status: 502 };

  return {
    data: {
      hut: HUT_KEY,
      name: HUT_NAME,
      roomName: [room.data.propertyName, room.data.name].filter(Boolean).join(' · '),
      from: range.from,
      to: range.to,
      today: viennaToday(),
      days: calendar.days,
      bookings: bookings.bookings,
      config,
      slots: calendar.slots ?? [],
    },
  };
}
