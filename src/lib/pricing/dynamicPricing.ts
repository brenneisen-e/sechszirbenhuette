// Dynamische Preise und Mindestaufenthalte für die Preisübersicht beider
// Hütten (src/components/admin/PriceOverview.tsx). Liegt identisch im Repo
// natbergerhuette (lib/pricing/dynamicPricing.ts) — Änderungen in beiden
// Repos nachziehen, die Regeln werden zwischen den Admin Centern
// ausgetauscht.
//
// Grundlage ist die Nachfrage je Nacht aus lib/demand (Ferien, Feiertage,
// Saison, Ereignisse am Falkert). Beide Hütten liegen in derselben Region,
// deshalb gilt dieselbe Nachfrage — die Preise je Stufe legt jede Hütte
// selbst fest.

import { type DemandLevel, demandStretches, type NightDemand } from '@/lib/demand/scoring';

export type HutKey = 'natberger' | 'szh';

/** Tageswerte aus Beds24: Preis (price1), Mindestaufenthalt, a = 1 frei / 0 belegt oder gesperrt */
export interface HutDay {
  p?: number;
  m?: number;
  a: 0 | 1;
}

export interface HutData {
  hut: HutKey;
  name: string;
  roomId: number;
  roomName: string;
  from: string;
  to: string;
  days: Record<string, HutDay>;
  rules: PriceRules | null;
  /** Letzte Übernahme aus der Preisübersicht — lässt sich rückgängig machen */
  lastChange: { snapshotId: number; label: string; createdAt: string } | null;
}

export interface FixedPeriod {
  /** erste und letzte Nacht */
  from: string;
  to: string;
  price?: number | null;
  minStay?: number | null;
  label?: string;
}

export interface PriceRules {
  /** Preis je Nacht nach Nachfragestufe: ruhig, erhöht, hoch, Spitze */
  levelPrice: [number, number, number, number];
  /** Mindestaufenthalt für Anreisen nach Nachfragestufe */
  levelMinStay: [number, number, number, number];
  /** Aufschlag in Prozent für Freitag- und Samstagnächte */
  weekendPct: number;
  /** Last-Minute: so viele Tage vor der Nacht greift der Rabatt (0 = aus) */
  lastMinuteDays: number;
  /** Rabatt in Prozent */
  lastMinutePct: number;
  /** Mindestaufenthalt kurzfristig höchstens so lang (0 = unverändert) */
  lastMinuteMinStay: number;
  /** Untergrenze für den Preis */
  minPrice: number;
  /** Runden auf volle … Euro */
  rounding: number;
  /** Feste Zeiträume gehen allen Regeln vor */
  fixed: FixedPeriod[];
  updatedAt?: string;
}

export const LEVEL_NAMES = ['ruhig', 'erhöht', 'hoch', 'Spitze'] as const;

export const DEFAULT_RULES: PriceRules = {
  levelPrice: [150, 180, 220, 280],
  levelMinStay: [2, 3, 4, 7],
  weekendPct: 0,
  lastMinuteDays: 0,
  lastMinutePct: 10,
  lastMinuteMinStay: 2,
  minPrice: 0,
  rounding: 5,
  fixed: [],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clampNumber(value, min, max, fallback));
}

/** Regeln aus fremder Quelle (Body, Datenbank) auf gültige Werte bringen */
export function sanitizeRules(input: unknown): PriceRules {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<
    Record<keyof PriceRules, unknown>
  >;
  const prices = Array.isArray(raw.levelPrice) ? raw.levelPrice : [];
  const stays = Array.isArray(raw.levelMinStay) ? raw.levelMinStay : [];
  const fixedList = Array.isArray(raw.fixed) ? raw.fixed : [];
  const levelPrice = DEFAULT_RULES.levelPrice.map((d, i) =>
    clampNumber(prices[i], 0, 100000, d),
  ) as PriceRules['levelPrice'];
  const levelMinStay = DEFAULT_RULES.levelMinStay.map((d, i) =>
    clampInt(stays[i], 1, 60, d),
  ) as PriceRules['levelMinStay'];
  const fixed: FixedPeriod[] = [];
  for (const item of fixedList.slice(0, 60)) {
    const f = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const from = String(f.from ?? '');
    const to = String(f.to ?? '');
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || to < from) continue;
    const price =
      f.price === null || f.price === undefined || f.price === ''
        ? null
        : clampNumber(f.price, 0, 100000, 0);
    const minStay =
      f.minStay === null || f.minStay === undefined || f.minStay === ''
        ? null
        : clampInt(f.minStay, 1, 365, 1);
    if (price === null && minStay === null) continue;
    fixed.push({ from, to, price, minStay, label: String(f.label ?? '').slice(0, 60) });
  }
  fixed.sort((a, b) => a.from.localeCompare(b.from));
  return {
    levelPrice,
    levelMinStay,
    weekendPct: clampNumber(raw.weekendPct, -50, 100, 0),
    lastMinuteDays: clampInt(raw.lastMinuteDays, 0, 60, 0),
    lastMinutePct: clampNumber(raw.lastMinutePct, 0, 80, 10),
    lastMinuteMinStay: clampInt(raw.lastMinuteMinStay, 0, 60, 0),
    minPrice: clampNumber(raw.minPrice, 0, 100000, 0),
    rounding: [1, 5, 10].includes(Number(raw.rounding)) ? Number(raw.rounding) : 5,
    fixed,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt.slice(0, 40) : undefined,
  };
}

// ============================================================================
// Datum
// ============================================================================

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

/** 0 = Sonntag … 6 = Samstag */
function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function nightsOf(from: string, to: string): string[] {
  const list: string[] = [];
  for (let d = from; d <= to && list.length < 1200; d = addDaysIso(d, 1)) list.push(d);
  return list;
}

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

export function formatDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.`;
}

export function formatRange(from: string, to: string): string {
  if (from === to) return `${formatDay(from)}${from.slice(0, 4)}`;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${formatDay(from)}${sameYear ? '' : from.slice(0, 4)} – ${formatDay(to)}${to.slice(0, 4)}`;
}

function monthLabel(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

// ============================================================================
// Vorschlag je Nacht
// ============================================================================

export interface NightSuggestion {
  price: number;
  minStay: number;
  /** Was den Wert bestimmt hat, z. B. „hoch · Wochenende +10 %“ */
  basis: string;
}

export function suggestNight(
  night: string,
  demand: NightDemand | undefined,
  rules: PriceRules,
  today: string,
): NightSuggestion {
  const level = (demand?.level ?? 0) as DemandLevel;
  let price = rules.levelPrice[level];
  let minStay = rules.levelMinStay[level];
  const basis: string[] = [LEVEL_NAMES[level]];

  const weekday = weekdayOf(night);
  if (rules.weekendPct !== 0 && (weekday === 5 || weekday === 6)) {
    price *= 1 + rules.weekendPct / 100;
    basis.push(`Wochenende ${rules.weekendPct > 0 ? '+' : ''}${rules.weekendPct} %`);
  }

  const ahead = daysBetween(today, night);
  if (rules.lastMinuteDays > 0 && ahead >= 0 && ahead < rules.lastMinuteDays) {
    if (rules.lastMinutePct > 0) {
      price *= 1 - rules.lastMinutePct / 100;
      basis.push(`Last Minute −${rules.lastMinutePct} %`);
    }
    if (rules.lastMinuteMinStay > 0 && rules.lastMinuteMinStay < minStay) {
      minStay = rules.lastMinuteMinStay;
      if (rules.lastMinutePct <= 0) basis.push('Last Minute');
    }
  }

  const fixed = rules.fixed.find((f) => night >= f.from && night <= f.to);
  if (fixed) {
    if (fixed.price !== null && fixed.price !== undefined) price = fixed.price;
    if (fixed.minStay !== null && fixed.minStay !== undefined) minStay = fixed.minStay;
    return {
      price: Math.round(price * 100) / 100,
      minStay,
      basis: `fest: ${fixed.label || 'Zeitraum'}`,
    };
  }

  const step = rules.rounding || 1;
  price = Math.max(rules.minPrice, Math.round(price / step) * step);
  return { price, minStay, basis: basis.join(' · ') };
}

/**
 * Regeln vollständig? Ein Preis von 0 € (leeres Feld) darf nie zu Beds24 —
 * ohne gültige Regeln gibt es deshalb keine Vorschläge.
 */
export function rulesProblem(rules: PriceRules): string | null {
  if (rules.levelPrice.some((p) => !(p > 0))) return 'Preis je Nachfragestufe fehlt';
  if (rules.fixed.some((f) => f.price !== null && f.price !== undefined && !(f.price > 0))) {
    return 'Fester Zeitraum mit Preis 0 €';
  }
  if (rules.fixed.some((f) => !f.from || !f.to || f.to < f.from)) {
    return 'Fester Zeitraum mit ungültigem Datum';
  }
  return null;
}

/** Vorschläge für alle Nächte eines Zeitraums */
export function suggestAll(
  nights: string[],
  demand: Record<string, NightDemand>,
  rules: PriceRules,
  today: string,
): Record<string, NightSuggestion> {
  const out: Record<string, NightSuggestion> = {};
  for (const night of nights) out[night] = suggestNight(night, demand[night], rules, today);
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  return sorted.length % 2 ? upper : ((sorted[mid - 1] ?? upper) + upper) / 2;
}

function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return best ? best[0] : null;
}

/**
 * Startregeln aus den aktuellen Beds24-Preisen ableiten: je Nachfragestufe
 * der Median der Preise und der häufigste Mindestaufenthalt. Fehlt eine Stufe,
 * wird sie aus der Nachbarstufe fortgeschrieben (je Stufe ±20 %).
 */
export function deriveRules(
  days: Record<string, HutDay>,
  demand: Record<string, NightDemand>,
): PriceRules {
  const prices: [number[], number[], number[], number[]] = [[], [], [], []];
  const stays: [number[], number[], number[], number[]] = [[], [], [], []];
  for (const [night, day] of Object.entries(days)) {
    const level = demand[night]?.level ?? 0;
    if (day.p !== undefined && day.p > 0) prices[level].push(day.p);
    if (day.m !== undefined) stays[level].push(day.m);
  }
  const levelPrice = prices.map((list) => median(list)) as (number | null)[];
  const levelMinStay = stays.map((list) => mode(list)) as (number | null)[];
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < 4; i++) {
      if (levelPrice[i] === null) {
        if (i > 0 && levelPrice[i - 1] !== null)
          levelPrice[i] = (levelPrice[i - 1] as number) * 1.2;
        else if (i < 3 && levelPrice[i + 1] !== null) {
          levelPrice[i] = (levelPrice[i + 1] as number) / 1.2;
        }
      }
      if (levelMinStay[i] === null) {
        levelMinStay[i] = (i > 0 ? levelMinStay[i - 1] : levelMinStay[i + 1]) ?? null;
      }
    }
  }
  const round5 = (v: number) => Math.round(v / 5) * 5;
  return {
    ...DEFAULT_RULES,
    levelPrice: levelPrice.map((v, i) =>
      v === null ? DEFAULT_RULES.levelPrice[i] : round5(v),
    ) as PriceRules['levelPrice'],
    levelMinStay: levelMinStay.map((v, i) =>
      v === null ? DEFAULT_RULES.levelMinStay[i] : v,
    ) as PriceRules['levelMinStay'],
    fixed: [],
  };
}

// ============================================================================
// Zeilen der Übersicht
// ============================================================================

export type RowMode = 'sections' | 'months' | 'weeks';

export interface PeriodRow {
  key: string;
  from: string;
  to: string;
  label: string;
  /** höchste Nachfragestufe, die mindestens drei Nächte trägt */
  level: DemandLevel;
  reasons: string[];
}

function rowDemand(
  from: string,
  to: string,
  demand: Record<string, NightDemand>,
): { level: DemandLevel; reasons: string[] } {
  const counts: [number, number, number, number] = [0, 0, 0, 0];
  const causes = new Map<string, number>();
  const nights = nightsOf(from, to);
  for (const night of nights) {
    const d = demand[night];
    if (!d) continue;
    counts[d.level] += 1;
    for (const c of d.causes) causes.set(c.label, (causes.get(c.label) ?? 0) + c.weight);
  }
  const threshold = Math.min(3, nights.length);
  let level: DemandLevel = 0;
  for (const i of [3, 2, 1] as const) {
    if (counts[i] >= threshold) {
      level = i;
      break;
    }
  }
  const reasons = [...causes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
  return { level, reasons };
}

function monthChunks(from: string, to: string): [string, string][] {
  const chunks: [string, string][] = [];
  let start = from;
  while (start <= to) {
    const monthEnd = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0))
      .toISOString()
      .slice(0, 10);
    const end = monthEnd < to ? monthEnd : to;
    chunks.push([start, end]);
    start = addDaysIso(end, 1);
  }
  return chunks;
}

function makeRow(
  from: string,
  to: string,
  label: string,
  demand: Record<string, NightDemand>,
): PeriodRow {
  return { key: `${from}_${to}`, from, to, label, ...rowDemand(from, to, demand) };
}

/**
 * Zeilen bilden:
 * - months: Kalendermonate
 * - weeks: Hüttenwochen Samstag bis Freitag (Nächte)
 * - sections: Zeiten hoher Nachfrage (Ferien, Feiertage, Spitzen) als eigene
 *   Zeile, die ruhigeren Wochen dazwischen nach Monaten
 */
export function buildRows(
  from: string,
  to: string,
  mode: RowMode,
  demand: Record<string, NightDemand>,
): PeriodRow[] {
  if (mode === 'months') {
    return monthChunks(from, to).map(([a, b]) => makeRow(a, b, monthLabel(a), demand));
  }

  if (mode === 'weeks') {
    const rows: PeriodRow[] = [];
    let start = from;
    while (start <= to) {
      // Bis Freitag (Samstag ist Wechseltag)
      const toFriday = (5 - weekdayOf(start) + 7) % 7;
      const end = addDaysIso(start, toFriday) < to ? addDaysIso(start, toFriday) : to;
      rows.push(makeRow(start, end, formatRange(start, end), demand));
      start = addDaysIso(end, 1);
    }
    return rows;
  }

  const inRange: Record<string, NightDemand> = {};
  for (const night of nightsOf(from, to)) if (demand[night]) inRange[night] = demand[night];
  const stretches = demandStretches(inRange, 2);
  const rows: PeriodRow[] = [];
  const pushQuiet = (a: string, b: string) => {
    for (const [ca, cb] of monthChunks(a, b)) rows.push(makeRow(ca, cb, monthLabel(ca), demand));
  };
  let cursor = from;
  for (const s of stretches) {
    if (s.from > cursor) pushQuiet(cursor, addDaysIso(s.from, -1));
    const label = s.reasons[0] || `Nachfrage ${LEVEL_NAMES[s.level]}`;
    // Sehr lange Zeiträume (Sommer) nach Monaten teilen, sonst sagt die Zeile wenig
    if (daysBetween(s.from, s.to) > 45) {
      for (const [ca, cb] of monthChunks(s.from, s.to)) {
        rows.push(makeRow(ca, cb, `${label} · ${MONTHS[Number(ca.slice(5, 7)) - 1]}`, demand));
      }
    } else {
      rows.push(makeRow(s.from, s.to, label, demand));
    }
    cursor = addDaysIso(s.to, 1);
  }
  if (cursor <= to) pushQuiet(cursor, to);
  return rows;
}

// ============================================================================
// Zusammenfassung einer Zelle und Schreibaufträge
// ============================================================================

export interface CellSummary {
  nights: number;
  blocked: number;
  priceMin: number | null;
  priceMax: number | null;
  stayMin: number | null;
  stayMax: number | null;
  suggestMin: number | null;
  suggestMax: number | null;
  suggestStayMin: number | null;
  suggestStayMax: number | null;
  /** Freie Nächte, deren Vorschlag vom aktuellen Wert abweicht */
  diffNights: number;
}

export function differs(day: HutDay | undefined, s: NightSuggestion): boolean {
  if (!day) return true;
  const priceDiff = day.p === undefined || Math.abs(day.p - s.price) >= 0.5;
  return priceDiff || (day.m ?? 1) !== s.minStay;
}

export function summarize(
  from: string,
  to: string,
  days: Record<string, HutDay>,
  suggestions: Record<string, NightSuggestion> | null,
): CellSummary {
  const price: number[] = [];
  const stay: number[] = [];
  const suggest: number[] = [];
  const suggestStay: number[] = [];
  let nights = 0;
  let blocked = 0;
  let diffNights = 0;
  for (const night of nightsOf(from, to)) {
    const day = days[night];
    if (!day) continue;
    nights += 1;
    if (day.a === 0) {
      blocked += 1;
      continue;
    }
    if (day.p !== undefined && day.p > 0) price.push(day.p);
    stay.push(day.m ?? 1);
    const s = suggestions?.[night];
    if (s) {
      suggest.push(s.price);
      suggestStay.push(s.minStay);
      if (differs(day, s)) diffNights += 1;
    }
  }
  const min = (list: number[]) => (list.length ? Math.min(...list) : null);
  const max = (list: number[]) => (list.length ? Math.max(...list) : null);
  return {
    nights,
    blocked,
    priceMin: min(price),
    priceMax: max(price),
    stayMin: min(stay),
    stayMax: max(stay),
    suggestMin: min(suggest),
    suggestMax: max(suggest),
    suggestStayMin: min(suggestStay),
    suggestStayMax: max(suggestStay),
    diffNights,
  };
}

export interface CalendarEntryInput {
  from: string;
  to: string;
  price1?: number;
  minStay?: number;
}

/**
 * Nächte mit ihren Zielwerten zu Beds24-Einträgen zusammenfassen:
 * aufeinanderfolgende Nächte mit gleichen Werten werden ein Eintrag.
 */
export function toEntries(
  targets: { night: string; price1?: number; minStay?: number }[],
): CalendarEntryInput[] {
  const sorted = [...targets].sort((a, b) => a.night.localeCompare(b.night));
  const entries: CalendarEntryInput[] = [];
  for (const t of sorted) {
    const last = entries.at(-1);
    if (
      last &&
      addDaysIso(last.to, 1) === t.night &&
      last.price1 === t.price1 &&
      last.minStay === t.minStay
    ) {
      last.to = t.night;
      continue;
    }
    const entry: CalendarEntryInput = { from: t.night, to: t.night };
    if (t.price1 !== undefined) entry.price1 = t.price1;
    if (t.minStay !== undefined) entry.minStay = t.minStay;
    entries.push(entry);
  }
  return entries;
}
