// Vorlagen für Gäste-Anschreiben (Willkommens- und Bewertungsnachricht) —
// verwendet im Beds24-Cockpit. Versand über Beds24 in den Nachrichtenverlauf
// des Portals (Booking.com, Feratel, FeWo-direkt).

import { SITE_CONFIG } from '@/lib/constants';

/** Google-Bewertungslink (wie im Bewertungsbereich der Website) */
export const REVIEW_LINK_GOOGLE = 'https://g.page/r/CSYqzFakCmSsEBM/review';

const HOST_PHONE = SITE_CONFIG.phone;
const SIGNATURE = 'Mareike & Malte Brenneisen';

export interface GuestSalutationInfo {
  /** Voller Name des Gastes (Vor- und Nachname) */
  fullName: string;
  /** Anrede aus den Buchungsdaten, z.B. "Mrs"/"Mr"/"Frau"/"Herr" */
  title?: string;
  /** Nachname, falls separat bekannt (sonst letztes Wort des Namens) */
  lastName?: string;
  /**
   * Manuell gewählte Anrede. Sticht die Angabe aus der Buchung, weil Portale
   * das Feld oft leer lassen oder falsch befüllen. 'neutral' erzwingt die
   * geschlechtsneutrale Variante.
   */
  gender?: 'female' | 'male' | 'neutral';
}

const FEMALE_TITLES = new Set([
  'frau',
  'fr',
  'mrs',
  'ms',
  'miss',
  'mme',
  'madame',
  'signora',
  'sigra',
  'sra',
  'señora',
  'senora',
  'mevrouw',
  'mw',
  'ga',
  'gospa',
]);
const MALE_TITLES = new Set([
  'herr',
  'hr',
  'mr',
  'mister',
  'monsieur',
  'm',
  'signor',
  'sig',
  'sr',
  'señor',
  'senor',
  'meneer',
  'dhr',
  'g',
  'gospod',
]);

/**
 * Ermittelt Geschlecht und Nachnamen für die Anrede.
 *
 * Eine manuell gewählte Anrede hat Vorrang — Portale liefern das Titel-Feld
 * oft gar nicht oder falsch, und am Namen ist meist zu sehen, was passt.
 */
function resolveSalutation(info: GuestSalutationInfo): {
  gender: 'female' | 'male' | 'neutral';
  lastName: string;
  fullName: string;
} {
  let fullName = info.fullName.trim();
  let title = (info.title || '').trim();
  // Anrede direkt am Namensanfang erkennen (z.B. „Frau Maria Muster")
  const inline = fullName.match(/^(herr|frau|mr|mrs|ms|miss)\.?\s+(.+)$/i);
  if (!title && inline?.[1] && inline[2]) {
    title = inline[1];
    fullName = inline[2];
  }
  const normalized = title.toLowerCase().replace(/\./g, '');
  const lastName = (info.lastName || '').trim() || fullName.split(/\s+/).slice(-1)[0] || fullName;

  let gender: 'female' | 'male' | 'neutral';
  if (info.gender) {
    gender = info.gender;
  } else if (FEMALE_TITLES.has(normalized)) {
    gender = 'female';
  } else if (MALE_TITLES.has(normalized)) {
    gender = 'male';
  } else {
    gender = 'neutral';
  }
  return { gender, lastName, fullName };
}

/**
 * Deutsche Anrede: „Liebe Frau X" / „Lieber Herr X", sobald das Geschlecht
 * bekannt ist — sonst neutral „Guten Tag Vorname Nachname", damit niemand
 * falsch angesprochen wird.
 */
export function germanSalutation(info: GuestSalutationInfo): string {
  const { gender, lastName, fullName } = resolveSalutation(info);
  if (gender === 'female') return `Liebe Frau ${lastName}`;
  if (gender === 'male') return `Lieber Herr ${lastName}`;
  return `Guten Tag ${fullName}`;
}

/**
 * Englische Anrede — „Dear Mrs/Mr Nachname", sonst der volle Name.
 * Bewusst ohne Punkt hinter Mr/Mrs (britische Schreibweise, passend zu den
 * übrigen englischen Vorlagen).
 */
export function englishSalutation(info: GuestSalutationInfo): string {
  const { gender, lastName, fullName } = resolveSalutation(info);
  if (gender === 'female') return `Dear Mrs ${lastName}`;
  if (gender === 'male') return `Dear Mr ${lastName}`;
  return `Dear ${fullName}`;
}

// Vorformuliertes Gäste-App-Schreiben (Willkommensnachricht mit App-Link)
export function buildGuestWelcomeText(
  lang: 'de' | 'en',
  info: GuestSalutationInfo,
  link: string,
): string {
  if (lang === 'en') {
    return `${englishSalutation(info)},

thank you very much for your booking — we are really looking forward to welcoming you to the Sechszirbenhütte on the Falkert soon!

Everything you need for your stay — directions, arrival, the cabin and our tips for the Nockberge — can be found in our guest app:

${link}

If you have any questions, simply reply here or call us at ${HOST_PHONE}.

Warm regards
${SIGNATURE}`;
  }
  return `${germanSalutation(info)},

vielen Dank für Ihre Buchung — wir freuen uns sehr, Sie bald in der Sechszirbenhütte am Falkert begrüßen zu dürfen!

Alles Wichtige für Ihren Aufenthalt — Anfahrt, Anreise, die Hütte und unsere Tipps für die Nockberge — finden Sie in unserer Gäste-App:

${link}

Bei Fragen antworten Sie einfach auf diese Nachricht oder rufen Sie uns unter ${HOST_PHONE} an.

Herzliche Grüße
${SIGNATURE}`;
}

/**
 * Ab wie vielen Tagen bis zur Anreise die Vorlage für frühe Buchungen passt.
 * Bei knapp zwei Monaten Vorlauf wirkt „bald" unpassend — dann wird der lange
 * Vorlauf besser offen angesprochen.
 */
export const EARLY_WELCOME_THRESHOLD_DAYS = 56;

/** Tage bis zur Anreise (negativ, wenn die Anreise schon vorbei ist). */
export function daysUntilArrival(arrivalDate: string, today = new Date()): number {
  const arrival = new Date(`${arrivalDate.slice(0, 10)}T00:00:00`);
  if (isNaN(arrival.getTime())) return 0;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((arrival.getTime() - start.getTime()) / 86400000);
}

/** Willkommensnachricht für Buchungen, deren Anreise noch weit weg ist. */
export function buildGuestEarlyWelcomeText(
  lang: 'de' | 'en',
  info: GuestSalutationInfo,
  link: string,
  arrivalLabel: string,
): string {
  if (lang === 'en') {
    return `${englishSalutation(info)},

how lovely that you will be our guests at the Sechszirbenhütte! Your arrival on ${arrivalLabel} is still a while away — but we are already looking forward to welcoming you and did not want to wait until then to say so.

Your guest app is unlocked from today. There you will find everything about the cabin, the drive up the Falkert and our tips for the area — have a look whenever you like, and again closer to the date:

${link}

If you have any questions before then, simply write to us here or call us at ${HOST_PHONE}.

We wish you a good time until then.

Warm regards
${SIGNATURE}`;
  }
  return `${germanSalutation(info)},

wie schön, dass Sie unsere Gäste in der Sechszirbenhütte sein werden! Bis zu Ihrer Anreise am ${arrivalLabel} ist es zwar noch eine Weile hin — wir freuen uns aber jetzt schon auf Sie und wollten damit nicht bis kurz vor Ihrem Aufenthalt warten.

Ihre Gäste-App ist ab heute freigeschaltet. Dort finden Sie alles rund um die Hütte, die Anfahrt auf den Falkert und unsere Tipps für die Umgebung — schauen Sie hinein, wann immer Sie mögen, und gerne noch einmal näher am Termin:

${link}

Falls Sie schon vorher Fragen haben, schreiben Sie uns einfach hier oder rufen Sie uns unter ${HOST_PHONE} an.

Wir wünschen Ihnen bis dahin eine gute Zeit.

Herzliche Grüße
${SIGNATURE}`;
}

// Vorformulierte Danke-/Bewertungsnachricht für bereits abgereiste Gäste
export function buildGuestReviewText(lang: 'de' | 'en', info: GuestSalutationInfo): string {
  if (lang === 'en') {
    return `${englishSalutation(info)},

thank you so much for staying with us at the Sechszirbenhütte! We hope you had a wonderful time in the mountains and arrived home safely.

If you enjoyed your stay, we would be very grateful for a short review — on Google or on the portal you booked with. It helps us a lot:

Google: ${REVIEW_LINK_GOOGLE}

Thank you very much and warm regards
${SIGNATURE}`;
  }
  return `${germanSalutation(info)},

vielen Dank, dass Sie bei uns in der Sechszirbenhütte zu Gast waren! Wir hoffen, Sie hatten eine wunderschöne Zeit in den Bergen und sind gut wieder nach Hause gekommen.

Wenn es Ihnen bei uns gefallen hat, würden wir uns sehr über eine kurze Bewertung freuen — auf Google oder auf dem Portal, über das Sie gebucht haben. Das hilft uns enorm:

Google: ${REVIEW_LINK_GOOGLE}

Vielen Dank und herzliche Grüße
${SIGNATURE}`;
}
