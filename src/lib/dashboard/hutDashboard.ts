// Übersicht im Admin Center (Tab „Übersicht“): tagesaktuelle Preise je
// Plattform und Belegung beider Hütten. Liegt identisch in beiden Repos
// (natbergerhuette: lib/dashboard, sechszirbenhuette: src/lib/dashboard) —
// Änderungen in beiden Repos nachziehen, die Daten werden zwischen den Admin
// Centern ausgetauscht (Partner-Aktion `dashboardData`).
//
// Preise: Beds24 liefert je Nacht nur die Tagespreise (Preisfelder 1–16).
// Was ein Kanal daraus macht (Multiplikator in Beds24 unter Channel Manager →
// Kanal → Einstellungen), gibt die Schnittstelle nicht heraus. Deshalb ist je
// Hütte und Plattform hinterlegt, welches Preisfeld sie bekommt und mit
// welchem Faktor/Aufschlag (settings.platform_prices) — Standard: alle
// Plattformen bekommen Preis 1 unverändert.

import type { Beds24Platform } from '@/lib/beds24Channels';
import type { HutKey } from '@/lib/pricing/dynamicPricing';

// ============================================================================
// Typen
// ============================================================================

/** Hütten-Umschalter im Kopf: nur die eigene Hütte oder beide */
export type HutView = 'own' | 'both';

/** Reihenfolge der Hütten in beiden Admin Centern (wie in der Preisübersicht) */
export const HUT_ORDER: string[] = ['szh', 'natberger'];

export const HUT_SHORT_NAMES: Record<string, string> = {
  natberger: 'Natberger',
  szh: 'Sechszirben',
};

export type PlatformKey = 'booking' | 'fewo' | 'feratel' | 'airbnb' | 'direct';

export interface PlatformSetting {
  key: PlatformKey;
  enabled: boolean;
  /** Beds24-Preisfeld (1 = price1 … 16 = price16) */
  slot: number;
  /** Multiplikator wie in Beds24 („*1.15“ = 1.15) */
  factor: number;
  /** Fester Auf- oder Abschlag je Nacht in Euro */
  add: number;
}

export interface PlatformConfig {
  platforms: PlatformSetting[];
  /** Runden auf volle … Euro (0 = nicht runden) */
  rounding: number;
  updatedAt?: string;
}

/** Tageswerte aus Beds24 */
export interface DashboardDay {
  /** 1 = frei, 0 = belegt oder gesperrt (numAvail) */
  a: 0 | 1;
  /** Mindestaufenthalt */
  m?: number;
  /** Preisfelder, Schlüssel = Feldnummer („1“ … „16“) */
  p?: Record<string, number>;
}

export type BookingStatus = 'confirmed' | 'new' | 'request' | 'black';

export interface DashboardBooking {
  id: string;
  /** Anreisetag = erste Nacht */
  arrival: string;
  /** Abreisetag (keine Nacht mehr) */
  departure: string;
  platform: Beds24Platform | null;
  /** Nur per iCal übernommene Belegung, ohne Gastdaten */
  ical: boolean;
  status: BookingStatus;
  guests?: number;
  /** Gastname — nur im eigenen Admin Center, nie an die Partner-Hütte */
  name?: string;
}

export interface DashboardData {
  hut: HutKey;
  name: string;
  roomName: string;
  /** Erste und letzte Nacht des geladenen Zeitraums */
  from: string;
  to: string;
  /** Heute in Österreich */
  today: string;
  days: Record<string, DashboardDay>;
  bookings: DashboardBooking[];
  config: PlatformConfig;
  /** Preisfelder, für die Beds24 im Zeitraum Werte führt */
  slots: number[];
}

// ============================================================================
// Plattformen
// ============================================================================

export interface PlatformInfo {
  key: PlatformKey;
  label: string;
  short: string;
  /** Pastellfarbe wie im Beds24-Cockpit */
  color: string;
}

export const PLATFORMS: PlatformInfo[] = [
  { key: 'booking', label: 'Booking.com', short: 'Booking', color: '#bfdbfe' },
  { key: 'fewo', label: 'FeWo-direkt', short: 'FeWo', color: '#bbf7d0' },
  { key: 'feratel', label: 'Feratel', short: 'Feratel', color: '#fed7aa' },
  { key: 'airbnb', label: 'Airbnb', short: 'Airbnb', color: '#fbcfe8' },
  { key: 'direct', label: 'Direkt / Website', short: 'Direkt', color: '#e5e7eb' },
];

export function platformInfo(key: PlatformKey): PlatformInfo {
  return PLATFORMS.find((p) => p.key === key) ?? (PLATFORMS[0] as PlatformInfo);
}

const BOOKING_COLORS: Record<Beds24Platform, string> = {
  'Booking.com': '#bfdbfe',
  FeWo: '#bbf7d0',
  Feratel: '#fed7aa',
  Airbnb: '#fbcfe8',
  Google: '#ddd6fe',
  Expedia: '#fde68a',
  Sonstige: '#e5e7eb',
};

const BOOKING_LABELS: Record<Beds24Platform, string> = {
  'Booking.com': 'Booking.com',
  FeWo: 'FeWo-direkt',
  Feratel: 'Feratel',
  Airbnb: 'Airbnb',
  Google: 'Google',
  Expedia: 'Expedia',
  Sonstige: 'Direkt',
};

/** Farbe einer Buchung nach Kanal */
export function bookingColor(booking: DashboardBooking): string {
  if (booking.status === 'black') return '#fecaca';
  return booking.platform ? BOOKING_COLORS[booking.platform] : '#d1d5db';
}

/** Kanal einer Buchung als Text */
export function bookingLabel(booking: DashboardBooking): string {
  if (booking.status === 'black') return 'Gesperrt';
  return booking.platform ? BOOKING_LABELS[booking.platform] : 'Unbekannt';
}

/** Schraffur für gesperrte Nächte ohne Buchung (wie im Beds24-Cockpit) */
export const BLOCKED_STRIPES = 'repeating-linear-gradient(135deg, #fca5a5 0 3px, #fff1f2 3px 7px)';

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  platforms: [
    { key: 'booking', enabled: true, slot: 1, factor: 1, add: 0 },
    { key: 'fewo', enabled: true, slot: 1, factor: 1, add: 0 },
    { key: 'feratel', enabled: true, slot: 1, factor: 1, add: 0 },
    { key: 'airbnb', enabled: false, slot: 1, factor: 1, add: 0 },
    { key: 'direct', enabled: false, slot: 1, factor: 1, add: 0 },
  ],
  rounding: 0,
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Einstellungen aus fremder Quelle (Body, Datenbank) auf gültige Werte bringen */
export function sanitizePlatformConfig(input: unknown): PlatformConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as {
    platforms?: unknown;
    rounding?: unknown;
    updatedAt?: unknown;
  };
  const list = Array.isArray(raw.platforms) ? raw.platforms : [];
  const platforms = DEFAULT_PLATFORM_CONFIG.platforms.map((fallback) => {
    const found = list.find(
      (item) =>
        item && typeof item === 'object' && (item as { key?: unknown }).key === fallback.key,
    ) as Partial<Record<keyof PlatformSetting, unknown>> | undefined;
    if (!found) return { ...fallback };
    return {
      key: fallback.key,
      enabled: found.enabled === true,
      slot: Math.round(clamp(found.slot, 1, 16, 1)),
      factor: Math.round(clamp(found.factor, 0.1, 5, 1) * 10000) / 10000,
      add: Math.round(clamp(found.add, -10000, 10000, 0) * 100) / 100,
    };
  });
  return {
    platforms,
    rounding: [0, 1, 5, 10].includes(Number(raw.rounding)) ? Number(raw.rounding) : 0,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt.slice(0, 40) : undefined,
  };
}

export function enabledPlatforms(config: PlatformConfig): PlatformSetting[] {
  return config.platforms.filter((p) => p.enabled);
}

/** Preis einer Nacht auf einer Plattform — null, wenn Beds24 für das Feld keinen Wert führt */
export function platformPrice(
  day: DashboardDay | undefined,
  setting: PlatformSetting,
  rounding: number,
): number | null {
  const base = day?.p?.[String(setting.slot)];
  if (typeof base !== 'number') return null;
  const value = base * setting.factor + setting.add;
  if (rounding > 0) return Math.round(value / rounding) * rounding;
  return Math.round(value * 100) / 100;
}

// ============================================================================
// Datum
// ============================================================================

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const d = toDate(`${iso.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** 0 = Montag … 6 = Sonntag */
export function weekdayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function monthEnd(iso: string): string {
  return addDays(addMonths(iso, 1), -1);
}

/** Tage von `from` bis einschließlich `to` */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from, guard = 0; d <= to && guard < 800; d = addDays(d, 1), guard++) days.push(d);
  return days;
}

/** Kalenderwochen (Mo–So) eines Monats — Tage außerhalb gehören zum Nachbarmonat */
export function monthGrid(iso: string): string[][] {
  const start = mondayOf(monthStart(iso));
  const end = addDays(mondayOf(monthEnd(iso)), 6);
  const weeks: string[][] = [];
  for (let w = start; w <= end; w = addDays(w, 7)) weeks.push(dayRange(w, addDays(w, 6)));
  return weeks;
}

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export function monthLabel(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1] ?? ''} ${iso.slice(0, 4)}`;
}

/** „27.10.“ */
export function dayMonth(iso: string): string {
  return `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;
}

/** „Di 27.10.“ */
export function weekdayDayMonth(iso: string): string {
  return `${WEEKDAYS_SHORT[weekdayIndex(iso)] ?? ''} ${dayMonth(iso)}`;
}

/** Zeitraum kurz: „25.–30.10.“, über den Monat „31.10.–6.11.“ */
export function shortRange(from: string, to: string): string {
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8, 10))}.–${dayMonth(to)}`;
  return `${dayMonth(from)}–${dayMonth(to)}`;
}

/** „26.10. – 1.11.2026“ */
export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  return `${dayMonth(monday)} – ${dayMonth(sunday)}${sunday.slice(0, 4)}`;
}

/** Kalenderwoche nach ISO 8601 */
export function isoWeek(iso: string): number {
  const thursday = toDate(addDays(mondayOf(iso), 3));
  const firstThursday = toDate(addDays(mondayOf(`${thursday.getUTCFullYear()}-01-04`), 3));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

// ============================================================================
// Belegung
// ============================================================================

export type NightState =
  | { kind: 'free' }
  | { kind: 'booked'; booking: DashboardBooking }
  | { kind: 'blocked'; booking?: DashboardBooking };

/**
 * Zustand jeder Nacht im geladenen Zeitraum: Buchung (Anreise bis Nacht vor
 * Abreise), sonst gesperrt, wenn Beds24 keine Verfügbarkeit meldet, sonst frei.
 */
export function nightStates(data: DashboardData): Record<string, NightState> {
  const map: Record<string, NightState> = {};
  for (const day of dayRange(data.from, data.to)) {
    map[day] = data.days[day]?.a === 0 ? { kind: 'blocked' } : { kind: 'free' };
  }
  for (const booking of data.bookings) {
    const first = booking.arrival < data.from ? data.from : booking.arrival;
    const last =
      addDays(booking.departure, -1) < data.to ? addDays(booking.departure, -1) : data.to;
    const state: NightState =
      booking.status === 'black' ? { kind: 'blocked', booking } : { kind: 'booked', booking };
    for (const night of dayRange(first, last)) map[night] = state;
  }
  return map;
}

export function isTaken(state: NightState | undefined): boolean {
  return state !== undefined && state.kind !== 'free';
}

export interface OccupancyStats {
  nights: number;
  booked: number;
  blocked: number;
  free: number;
}

/** Nächte von `from` bis einschließlich `to`, soweit geladen */
export function occupancy(
  states: Record<string, NightState>,
  from: string,
  to: string,
): OccupancyStats {
  const stats: OccupancyStats = { nights: 0, booked: 0, blocked: 0, free: 0 };
  for (const day of dayRange(from, to)) {
    const state = states[day];
    if (!state) continue;
    stats.nights += 1;
    stats[state.kind] += 1;
  }
  return stats;
}

/** Belegungsquote in Prozent — gesperrte Nächte zählen nicht mit */
export function occupancyPct(stats: OccupancyStats): number | null {
  const sellable = stats.nights - stats.blocked;
  if (sellable <= 0) return null;
  return Math.round((stats.booked / sellable) * 100);
}

export interface FreeWindow {
  from: string;
  /** Abreisetag */
  to: string;
  nights: number;
  minStay: number;
}

/**
 * Nächste buchbare Lücke ab `from`: zusammenhängende freie Nächte, mindestens
 * so viele, wie der Mindestaufenthalt der ersten Nacht verlangt.
 */
export function nextFreeWindow(
  data: DashboardData,
  states: Record<string, NightState>,
  from: string,
): FreeWindow | null {
  let day = from < data.from ? data.from : from;
  while (day <= data.to) {
    if (states[day]?.kind !== 'free') {
      day = addDays(day, 1);
      continue;
    }
    let end = day;
    while (end <= data.to && states[end]?.kind === 'free') end = addDays(end, 1);
    const nights = daysBetween(day, end);
    const minStay = data.days[day]?.m ?? 1;
    if (nights >= minStay) return { from: day, to: end, nights, minStay };
    day = end;
  }
  return null;
}

/** Nächste Anreise ab `from` (ohne Sperren) */
export function nextArrival(data: DashboardData, from: string): DashboardBooking | null {
  const upcoming = data.bookings
    .filter((b) => b.status !== 'black' && b.arrival >= from)
    .sort((a, b) => a.arrival.localeCompare(b.arrival));
  return upcoming[0] ?? null;
}

/** Abreise am Tag `day` (Wechseltag) */
export function departureOn(data: DashboardData, day: string): DashboardBooking | null {
  return data.bookings.find((b) => b.status !== 'black' && b.departure === day) ?? null;
}

/**
 * Geschnittene Belegungsbalken für eine Reihe von Tagen (Woche): je Buchung
 * bzw. Sperre ein Balken von der Mitte des Anreisetags bis zur Mitte des
 * Abreisetags. Spalten in halben Tagen, 1-basiert wie CSS-Grid-Linien.
 */
export interface StayBar {
  id: string;
  /** Erste und letzte Grid-Linie (halbe Tage) */
  start: number;
  end: number;
  booking?: DashboardBooking;
  /** Gesperrt ohne Buchung */
  blocked: boolean;
  /** Balken beginnt bzw. endet außerhalb der Reihe */
  clippedStart: boolean;
  clippedEnd: boolean;
}

export function stayBars(days: string[], states: Record<string, NightState>): StayBar[] {
  const bars: StayBar[] = [];
  const first = days[0];
  if (!first) return bars;
  // Nacht vor der Reihe mit einbeziehen, damit ein Aufenthalt, der vorher
  // beginnt, am linken Rand angeschnitten erscheint. Halbtags-Linien: Tag i
  // (0-basiert) reicht von Linie 2i+1 bis 2i+3, seine Nacht beginnt in der
  // Mitte (Linie 2i+2) und endet in der Mitte des Folgetags.
  let current: StayBar | null = null;
  let currentKey = '';
  for (let dayIdx = -1; dayIdx < days.length; dayIdx++) {
    const night = dayIdx < 0 ? addDays(first, -1) : (days[dayIdx] ?? first);
    const state = states[night];
    let key = '';
    if (state?.kind === 'booked') key = `b:${state.booking.id}`;
    else if (state?.kind === 'blocked') key = state.booking ? `b:${state.booking.id}` : 'blocked';
    if (current && key !== currentKey) {
      current.end = 2 * dayIdx + 2;
      bars.push(current);
      current = null;
    }
    if (!current && key) {
      const startLine = dayIdx < 0 ? 1 : 2 * dayIdx + 2;
      current = {
        id: `${key}:${night}`,
        start: startLine,
        end: startLine,
        booking: state && state.kind !== 'free' ? state.booking : undefined,
        blocked: state?.kind === 'blocked',
        clippedStart: dayIdx < 0,
        clippedEnd: false,
      };
    }
    currentKey = key;
  }
  // Noch offen: Die Nacht des letzten Tags ist belegt, der Balken läuft rechts hinaus
  if (current) {
    current.end = 2 * days.length + 1;
    current.clippedEnd = true;
    bars.push(current);
  }
  return bars.filter((bar) => bar.end > bar.start);
}
