// Kopie aus dem Repo natbergerhuette (lib/demand/scoring.ts), angepasst an
// noUncheckedIndexedAccess dieses Repos.
//
// Nachfrage je Nacht für das Beds24-Cockpit: Welche Märkte haben Ferien oder
// ein langes Feiertagswochenende, liegt die Nacht in der Skisaison oder im
// Sommer, gibt es ein Ereignis in der Region? Daraus eine Stufe (erhöht,
// hoch, Spitze) und die Gründe für den Tooltip.
//
// Gewichte nach Bedeutung für die Hütte am Falkertsee: Österreich und
// Deutschland zuerst, im Land die nahen Regionen vor den fernen (Kärnten,
// Steiermark, Wien vor Tirol; Bayern, Baden-Württemberg vor Norddeutschland).
// Es ist eine Faustregel, kein Preismodell — die Gründe stehen deshalb immer
// dabei.

import {
  DEMAND_EVENTS,
  DEMAND_HOLIDAYS,
  DEMAND_SCHOOL_HOLIDAYS,
  type DemandCountry,
  SEASONS,
} from './periods';

/** Gewicht eines Landes als Herkunftsmarkt (1 = wichtigster Markt) */
export const MARKET_WEIGHT: Record<DemandCountry, number> = {
  AT: 1,
  DE: 0.9,
  IT: 0.4,
  SI: 0.3,
  CZ: 0.35,
  HU: 0.3,
  SK: 0.15,
  CH: 0.15,
};

/**
 * Anteil einer Region am Markt ihres Landes (Summe je Land = 1). Nahe
 * Regionen zählen mehr als ihre Einwohnerzahl, ferne weniger.
 */
export const REGION_SHARE: Partial<Record<DemandCountry, Record<string, number>>> = {
  AT: { W: 0.25, STMK: 0.18, NOE: 0.17, K: 0.15, OOE: 0.12, S: 0.05, B: 0.04, T: 0.02, V: 0.02 },
  DE: {
    BY: 0.3,
    BW: 0.2,
    NW: 0.12,
    HE: 0.08,
    NI: 0.06,
    SN: 0.05,
    RP: 0.04,
    BE: 0.04,
    TH: 0.03,
    BB: 0.02,
    ST: 0.02,
    SH: 0.01,
    HH: 0.01,
    MV: 0.01,
    SL: 0.005,
    HB: 0.005,
  },
};

export type DemandLevel = 0 | 1 | 2 | 3;

export const DEMAND_LEVEL_LABEL: Record<Exclude<DemandLevel, 0>, string> = {
  1: 'erhöht',
  2: 'hoch',
  3: 'Spitze',
};

/**
 * Farbe je Stufe: ein Farbton von hell nach dunkel (Cockpit, Buchungsliste),
 * getrennt von den Kanalfarben der Belegung
 */
export const DEMAND_COLOR: Record<Exclude<DemandLevel, 0>, string> = {
  1: '#d8b4fe', // purple-300
  2: '#a855f7', // purple-500
  3: '#6b21a8', // purple-800
};

/** Schwellen der Stufen auf der Punktzahl (Summe der gewichteten Märkte) */
const LEVEL_THRESHOLDS: [number, DemandLevel][] = [
  [1.6, 3],
  [0.75, 2],
  [0.35, 1],
];

export interface NightDemand {
  score: number;
  level: DemandLevel;
  /** Gründe, wichtigste zuerst, z. B. „Semesterferien Wien, NÖ“ */
  reasons: string[];
  /** Einzelne Ferien, Feiertage und Ereignisse mit ihrem Beitrag zur Punktzahl */
  causes: { label: string; weight: number }[];
  /** Saison der Nacht, z. B. „Skisaison Falkert“ */
  season?: string;
}

function dateParts(iso: string): [number, number, number] {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return [y, m, d];
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = dateParts(iso);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekday(iso: string): number {
  const [y, m, d] = dateParts(iso);
  return new Date(y, m - 1, d).getDay(); // 0 = Sonntag
}

/**
 * Nächte des langen Wochenendes um einen Feiertag — so, wie Gäste ihn
 * nutzen: Montag → Fr–So, Dienstag → Sa–Mo (Brückentag Montag),
 * Donnerstag → Mi–Sa (Brückentag Freitag), Freitag → Do–Sa,
 * Mittwoch → nur die Nacht davor, Wochenende → Fr–Sa.
 */
export function longWeekendNights(holiday: string): [string, string] {
  switch (weekday(holiday)) {
    case 1:
      return [addDays(holiday, -3), addDays(holiday, -1)];
    case 2:
      return [addDays(holiday, -3), addDays(holiday, -1)];
    case 3:
      return [addDays(holiday, -1), addDays(holiday, -1)];
    case 4:
      return [addDays(holiday, -1), addDays(holiday, 2)];
    case 5:
      return [addDays(holiday, -1), addDays(holiday, 1)];
    case 6:
      return [addDays(holiday, -1), holiday];
    default:
      return [addDays(holiday, -2), addDays(holiday, -1)];
  }
}

function shareOf(country: DemandCountry, regions: string[] | 'alle', share?: number): number {
  if (share !== undefined) return share;
  if (regions === 'alle') return 1;
  const table = REGION_SHARE[country];
  if (!table) return 1;
  return Math.min(
    1,
    regions.reduce((sum, r) => sum + (table[r] ?? 0), 0),
  );
}

/**
 * Wie stark Ferien eine einzelne Woche füllen: Kurze Ferien (Semester, Ostern,
 * Weihnachten) bündeln die Reisen auf wenige Tage, lange Sommerferien
 * verteilen sie über Wochen. Bis 14 Tage volle Wirkung, darüber anteilig,
 * höchstens auf die Hälfte herunter.
 */
function holidayIntensity(from: string, to: string): number {
  const days =
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000 +
    1;
  return Math.min(1, Math.max(0.5, 14 / days));
}

/** Ein Beitrag zur Nacht: wer frei hat, mit welchem Anteil des Landes */
interface Contribution {
  /** Region (W, BY …), „alle“ oder die Bezeichnung eines Gebiets mit eigenem Anteil */
  key: string;
  value: number;
  label: string;
}

/**
 * Nachfrage für jede Nacht im Bereich [from, to] (ISO, inklusive). Eine
 * Nacht ist der Abend dieses Tages bis zum Morgen danach.
 */
export function demandByNight(from: string, to: string): Record<string, NightDemand> {
  const contributions: Record<string, Partial<Record<DemandCountry, Contribution[]>>> = {};
  const add = (
    night: string,
    country: DemandCountry,
    regions: string[] | 'alle',
    share: number | undefined,
    intensity: number,
    label: string,
  ) => {
    if (night < from || night > to) return;
    const list = ((contributions[night] ??= {})[country] ??= []);
    if (share !== undefined) {
      list.push({ key: `#${label}`, value: share * intensity, label });
    } else if (regions === 'alle' || !REGION_SHARE[country]) {
      list.push({ key: 'alle', value: intensity, label });
    } else {
      for (const r of regions) {
        list.push({ key: r, value: shareOf(country, [r]) * intensity, label });
      }
    }
  };
  const eachNight = (a: string, b: string, fn: (night: string) => void) => {
    for (let n = a; n <= b; n = addDays(n, 1)) fn(n);
  };

  for (const p of DEMAND_SCHOOL_HOLIDAYS) {
    // Familien nutzen die Wochenenden davor und danach: Ferien ab Montag
    // beginnen am Samstag davor, Ferien bis Freitag/Samstag enden am Sonntag.
    // Nächte bis zur Nacht vor dem letzten Tag (dann reisen Familien ab).
    let first = p.from;
    if (weekday(first) === 1) first = addDays(first, -2);
    let lastDay = p.to;
    if (weekday(lastDay) === 5) lastDay = addDays(lastDay, 2);
    else if (weekday(lastDay) === 6) lastDay = addDays(lastDay, 1);
    const last = first === lastDay ? lastDay : addDays(lastDay, -1);
    const intensity = holidayIntensity(p.from, p.to);
    eachNight(first, last, (n) => add(n, p.country, p.regions, p.share, intensity, p.label));
  }
  for (const h of DEMAND_HOLIDAYS) {
    const [a, b] = longWeekendNights(h.date);
    eachNight(a, b, (n) => add(n, h.country, h.regions, h.share, 1, h.label));
  }

  const result: Record<string, NightDemand> = {};
  eachNight(from, to, (night) => {
    const season = SEASONS.find((s) => night >= s.from && night <= s.to);
    const seasonFactor = season?.factor ?? 0.4;
    const reasons: { text: string; weight: number }[] = [];
    const causes: { label: string; weight: number }[] = [];
    let score = 0;
    for (const [country, list] of Object.entries(contributions[night] ?? {}) as [
      DemandCountry,
      Contribution[],
    ][]) {
      // Je Region zählt der stärkste Grund — Ferien und Feiertag derselben
      // Region addieren sich nicht, verschiedene Regionen schon
      const byKey = new Map<string, Contribution>();
      for (const c of list) {
        const prev = byKey.get(c.key);
        if (!prev || c.value > prev.value) byKey.set(c.key, c);
      }
      const whole = byKey.get('alle');
      byKey.delete('alle');
      const parts = [...byKey.values()];
      const partSum = parts.reduce((sum, c) => sum + c.value, 0);
      const useWhole = whole !== undefined && whole.value >= partSum;
      const share = Math.min(1, useWhole ? whole.value : partSum);
      const weight = MARKET_WEIGHT[country] * share * seasonFactor;
      score += weight;
      // Gründe je Land zusammenfassen, der stärkste zuerst
      const counted = useWhole ? [whole] : parts;
      const byLabel = new Map<string, number>();
      for (const c of counted) byLabel.set(c.label, (byLabel.get(c.label) ?? 0) + c.value);
      const labels = [...byLabel.entries()].sort((a, b) => b[1] - a[1]);
      reasons.push({ text: labels.map(([l]) => l).join(' · '), weight });
      const total = labels.reduce((sum, [, v]) => sum + v, 0);
      for (const [label, v] of labels) causes.push({ label, weight: (weight * v) / total });
    }
    for (const e of DEMAND_EVENTS) {
      if (night >= e.from && night <= e.to) {
        score += e.weight;
        reasons.push({ text: e.label, weight: e.weight });
        causes.push({ label: e.label, weight: e.weight });
      }
    }
    reasons.sort((a, b) => b.weight - a.weight);
    const level = LEVEL_THRESHOLDS.find(([t]) => score >= t)?.[1] ?? 0;
    result[night] = {
      score,
      level,
      reasons: reasons.map((r) => r.text),
      causes,
      season: season?.label,
    };
  });
  return result;
}

export interface DemandStretch {
  from: string;
  /** letzte Nacht des Zeitraums */
  to: string;
  level: Exclude<DemandLevel, 0>;
  /** gewichtigste Gründe im Zeitraum (Beitrag über alle Nächte) */
  reasons: string[];
  nights: number;
}

/** Kürzere Abschnitte gehen in ihrer Umgebung auf (Nächte) */
const MIN_RUN = 3;

interface Run {
  from: string;
  to: string;
  level: DemandLevel;
  nights: number;
  causes: Map<string, number>;
}

/**
 * Nächte ab einer Mindeststufe zu Zeiträumen fassen (für die Liste
 * „Interessante Zeiträume“). Ein langer Zeitraum wird nach Stufe geteilt —
 * der Sommer etwa in hoch, Spitze, hoch —, damit sich jeder Teil einzeln
 * bepreisen lässt. Abschnitte unter drei Nächten gehen in ihrer Umgebung
 * auf: zwischen zwei gleichen Nachbarn in deren Stufe, sonst als „hoch“.
 */
export function demandStretches(
  demand: Record<string, NightDemand>,
  minLevel: Exclude<DemandLevel, 0> = 2,
): DemandStretch[] {
  // 1. Läufe gleicher Stufe
  const runs: Run[] = [];
  for (const night of Object.keys(demand).sort()) {
    const d = demand[night];
    if (!d || d.level < minLevel) continue;
    const last = runs.at(-1);
    let run: Run;
    if (last && last.level === d.level && addDays(last.to, 1) === night) {
      run = last;
      run.to = night;
      run.nights += 1;
    } else {
      run = { from: night, to: night, level: d.level, nights: 1, causes: new Map() };
      runs.push(run);
    }
    for (const c of d.causes) run.causes.set(c.label, (run.causes.get(c.label) ?? 0) + c.weight);
  }

  // 2. Kurze Läufe der Umgebung zuschlagen
  const adjacent = (a: Run | undefined, b: Run | undefined) =>
    a !== undefined && b !== undefined && addDays(a.to, 1) === b.from;
  const group = runs.map((run, i) => {
    if (run.nights >= MIN_RUN) return run.level;
    const prev = runs[i - 1];
    const next = runs[i + 1];
    if (prev && next && adjacent(prev, run) && adjacent(run, next) && prev.level === next.level) {
      return prev.level;
    }
    return Math.max(minLevel, Math.min(run.level, 2)) as DemandLevel;
  });

  // 3. Benachbarte Läufe derselben Gruppe verbinden
  const stretches: DemandStretch[] = [];
  let current: Run | null = null;
  let currentLevel: DemandLevel = 0;
  const close = () => {
    if (!current) return;
    stretches.push({
      from: current.from,
      to: current.to,
      level: currentLevel as Exclude<DemandLevel, 0>,
      reasons: [...current.causes.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([r]) => r)
        .slice(0, 4),
      nights: current.nights,
    });
    current = null;
  };
  runs.forEach((run, i) => {
    if (current && group[i] === currentLevel && adjacent(current, run)) {
      current.to = run.to;
      current.nights += run.nights;
      for (const [label, w] of run.causes) {
        current.causes.set(label, (current.causes.get(label) ?? 0) + w);
      }
    } else {
      close();
      current = { ...run, causes: new Map(run.causes) };
      currentLevel = group[i] ?? run.level;
    }
  });
  close();
  return stretches;
}
