// Direktbuchung über Beds24: Buchungsseite der Unterkunft 359833, nur das
// Zimmer 741929 („Sechszirbenhütte Falkert 1.700 m“). Preise, Endreinigung,
// Ortstaxe, Hund, Wäschepaket, Anzahlung und Last-Minute-Rabatte rechnet
// Beds24 selbst — die Website zeigt nur, was Beds24 ausgibt.
//
// Die Suche (Anreise, Abreise, Personen) kann überall auf der Seite stehen
// (Hero, Buchungsbereich): Sie schreibt den Zeitraum in die Adresse
// (?anreise=…&abreise=…&erwachsene=…&kinder=…#buchung) und meldet ihn per
// Ereignis an den Buchungsbereich, der den Kalender damit lädt. Von anderen
// Seiten aus führt dieselbe Adresse auf die Startseite.

import { motionReducedNow } from '@/contexts/MotionContext';

export const BEDS24_PROP_ID = 359833;
export const BEDS24_ROOM_ID = 741929;
export const MAX_GUESTS = 5;

export const BOOKING_SEARCH_EVENT = 'szh:booking-search';

export interface BookingQuery {
  /** erste Nacht, YYYY-MM-DD */
  arrival?: string;
  /** Abreisetag, YYYY-MM-DD */
  departure?: string;
  adults: number;
  children: number;
}

export const DEFAULT_QUERY: BookingQuery = { adults: 2, children: 0 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/** Nächte zwischen Anreise und Abreise (0, wenn unvollständig oder verdreht) */
export function nightsBetween(arrival?: string, departure?: string): number {
  if (!isIsoDate(arrival) || !isIsoDate(departure)) return 0;
  const ms = Date.parse(`${departure}T12:00:00Z`) - Date.parse(`${arrival}T12:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Heute in Österreich als YYYY-MM-DD */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

/** Zeitraum aus der Adresse lesen; Ungültiges fällt weg */
export function readBookingQuery(params: URLSearchParams): BookingQuery {
  const arrival = params.get('anreise');
  const departure = params.get('abreise');
  const adults = clampInt(params.get('erwachsene'), 1, MAX_GUESTS, DEFAULT_QUERY.adults);
  const children = clampInt(params.get('kinder'), 0, MAX_GUESTS - adults, 0);
  const query: BookingQuery = { adults, children };
  if (isIsoDate(arrival) && arrival >= todayIso()) {
    query.arrival = arrival;
    if (isIsoDate(departure) && nightsBetween(arrival, departure) > 0) query.departure = departure;
  }
  return query;
}

export function bookingSearchParams(query: BookingQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.arrival) params.set('anreise', query.arrival);
  if (query.departure) params.set('abreise', query.departure);
  params.set('erwachsene', String(query.adults));
  params.set('kinder', String(query.children));
  return params;
}

const BEDS24_LANGS = new Set(['de', 'en', 'it', 'sl']);

/** Adresse der Beds24-Buchungsseite, mit Zeitraum, sobald er vollständig ist */
export function beds24BookingUrl(query: BookingQuery, language: string): string {
  const params = new URLSearchParams({
    propid: String(BEDS24_PROP_ID),
    roomid: String(BEDS24_ROOM_ID),
    lang: BEDS24_LANGS.has(language) ? language : 'de',
    referer: 'Website',
  });
  const nights = nightsBetween(query.arrival, query.departure);
  if (query.arrival && nights > 0) {
    params.set('checkin', query.arrival);
    params.set('numnight', String(nights));
  }
  params.set('numadult', String(query.adults));
  params.set('numchild', String(query.children));
  return `https://beds24.com/booking2.php?${params.toString()}`;
}

/**
 * Suche auslösen: Auf der Startseite Adresse ergänzen, Buchungsbereich
 * benachrichtigen und hinscrollen; auf anderen Seiten zur Startseite wechseln.
 */
export function requestBookingSearch(query: BookingQuery): void {
  const target = `/?${bookingSearchParams(query).toString()}#buchung`;
  if (window.location.pathname !== '/') {
    window.location.assign(target);
    return;
  }
  window.history.replaceState(window.history.state, '', target);
  window.dispatchEvent(new CustomEvent<BookingQuery>(BOOKING_SEARCH_EVENT, { detail: query }));
  // Desktop: Abschnitt mit Suche und Kalender nebeneinander; schmaler direkt
  // zum Kalender, der dort unter der Suche steht
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  document
    .getElementById(wide ? 'buchung' : 'buchung-kalender')
    ?.scrollIntoView({ behavior: motionReducedNow() ? 'auto' : 'smooth', block: 'start' });
}
