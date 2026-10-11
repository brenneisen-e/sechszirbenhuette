// Kanal einer Beds24-Buchung → Plattform der Gästedatenbank.
//
// Maßgeblich ist das Feld `channel` — laut API-Spezifikation (beds24.com/api/v2,
// Schema "booking") ein fester Wert wie booking, vrbo, vrboical, airbnb,
// googleads, feratel oder bookingpage. Fehlt er, hilft apiSourceId (Beds24-Wiki
// „API V2.0 apisourceids": 19 Booking.com, 30 Vrbo XML, 40 Vrbo iCal …).
// apiSource ("Airbnb.com") und referer sind Freitext und nur der letzte
// Rückfall. Vrbo umfasst FeWo-direkt; googleads sind Buchungen über Google for
// Vacation Rentals. iCal-Kanäle liefern nur Belegungen ohne Gastdaten.
//
// Die Werte müssen exakt den Plattformen der App entsprechen — Finanzen
// ("booking.com"), Einbehalte und Zahlungsstatus vergleichen genau.

export type Beds24Platform =
  | 'Booking.com'
  | 'FeWo'
  | 'Airbnb'
  | 'Expedia'
  | 'Feratel'
  | 'Google'
  | 'Sonstige';

export interface Beds24Source {
  /** Plattform wie in der Gästedatenbank, null = Beds24 liefert gar keine Herkunft */
  platform: Beds24Platform | null;
  /** Nur eine per iCal übernommene Belegung, keine Buchung mit Gastdaten */
  ical: boolean;
}

const PLATFORM_BY_CHANNEL: Record<string, Beds24Platform> = {
  booking: 'Booking.com',
  vrbo: 'FeWo',
  vrboical: 'FeWo',
  airbnb: 'Airbnb',
  airbnbical: 'Airbnb',
  expedia: 'Expedia',
  feratel: 'Feratel',
  googleads: 'Google',
  bookingpage: 'Sonstige',
  direct: 'Sonstige',
};

const PLATFORM_BY_SOURCE_ID: Record<number, Beds24Platform> = {
  0: 'Sonstige',
  1: 'Sonstige',
  10: 'Airbnb',
  14: 'Expedia',
  19: 'Booking.com',
  30: 'FeWo',
  40: 'FeWo',
  46: 'Airbnb',
};

const ICAL_SOURCE_IDS = new Set([10, 16, 21, 28, 29, 40]);

function field(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

/** Freitext (apiSource, referer) — nur, wenn channel und apiSourceId nichts hergeben */
function platformFromText(text: string): Beds24Platform | null {
  if (/vrbo|homeaway|fewo|abritel|stayz/.test(text)) return 'FeWo';
  if (text.includes('airbnb')) return 'Airbnb';
  if (text.includes('expedia')) return 'Expedia';
  if (text.includes('feratel')) return 'Feratel';
  if (text.includes('google')) return 'Google';
  if (/bookingpage|booking page|\bdirect\b/.test(text)) return 'Sonstige';
  if (/booking\.com|\bbooking\b/.test(text)) return 'Booking.com';
  return null;
}

export function beds24Source(raw: Record<string, unknown>): Beds24Source {
  const channel = field(raw, 'channel').toLowerCase();
  const idText = field(raw, 'apiSourceId');
  const id = idText === '' ? NaN : Number(idText);
  const text = [field(raw, 'apiSource'), field(raw, 'referer')].join(' ').toLowerCase();

  // vrboical, airbnbical, icalimport1–3, googlecal
  const ical =
    channel.endsWith('ical') ||
    channel.startsWith('icalimport') ||
    channel === 'googlecal' ||
    ICAL_SOURCE_IDS.has(id) ||
    /\bical\b/.test(text);

  let platform: Beds24Platform | null =
    PLATFORM_BY_CHANNEL[channel] ??
    (id in PLATFORM_BY_SOURCE_ID ? PLATFORM_BY_SOURCE_ID[id] : null) ??
    platformFromText(text);
  // Eine Herkunft, die wir nicht kennen, ist nicht Booking.com
  if (!platform && (channel || idText || text.trim())) platform = 'Sonstige';
  return { platform, ical };
}

/** Schreibweisen derselben Plattform in der Gästedatenbank (für Abgleiche) */
export function platformAliases(platform: Beds24Platform): string[] {
  if (platform === 'FeWo') return ['fewo', 'fewo-direkt', 'vrbo'];
  if (platform === 'Booking.com') return ['booking.com', 'booking'];
  return [platform.toLowerCase()];
}
