// Dubletten-Abgleich für Gäste.
//
// Ein Gast kommt auf mehreren Wegen in die Datenbank: über den Beds24-Webhook,
// über „Buchung übernehmen" im Beds24-Cockpit und über „Neu" im Admin Center.
// Alle drei sollen denselben Gast wiedererkennen, sonst entstehen pro
// Aufenthalt neue Datensätze und die Buchungshistorie zerfällt.
//
// Regeln (angelehnt an gängige Hotelsysteme): Stimmt die E-Mail oder die
// Telefonnummer überein, ist es derselbe Gast. Stimmt der vollständige Name
// überein — unabhängig von Reihenfolge, Groß-/Kleinschreibung und Umlauten —
// ebenfalls, es sei denn, beide Seiten haben Kontaktdaten und die
// widersprechen sich (zwei verschiedene „Thomas Müller"). Nur der Nachname
// allein ist ein Hinweis zum Nachfragen, kein Treffer.

export interface GuestIdentity {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface GuestCandidateRow {
  id: number;
  guest_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

export type MatchReason = 'email' | 'phone' | 'name' | 'lastName';

export interface GuestMatch {
  guest: GuestCandidateRow;
  reasons: MatchReason[];
  /** Sicher derselbe Gast — darf ohne Rückfrage verwendet werden */
  strong: boolean;
}

/** Anreden und Füllwörter, die in Namensfeldern der Portale auftauchen */
const NAME_NOISE = new Set([
  'herr',
  'frau',
  'hr',
  'fr',
  'dr',
  'prof',
  'familie',
  'fam',
  'family',
  'mr',
  'mrs',
  'ms',
  'und',
  'and',
]);

/** Buchstaben vereinheitlichen: Umlaute wie in Portaldaten („Mueller"), keine Akzente. */
function foldLetters(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function words(value: string | null | undefined): string[] {
  return foldLetters(value || '')
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 2 && !NAME_NOISE.has(t));
}

/** Name in sortierte, normalisierte Wortbausteine zerlegen. */
export function nameTokens(...parts: (string | null | undefined)[]): string[] {
  return words(parts.filter(Boolean).join(' ')).sort();
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Telefonnummer auf einen vergleichbaren Schlüssel bringen. Ländervorwahl und
 * führende Null unterscheiden sich je nach Eingabe („+49 176…", „0176…",
 * „0049 176…") — verglichen werden deshalb die letzten neun Ziffern.
 */
export function phoneKey(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 6) return '';
  return digits.length > 9 ? digits.slice(-9) : digits;
}

function lastNameToken(identity: {
  lastName?: string | null;
  name?: string | null;
  tokensFallback: string[];
}): string {
  const explicit = nameTokens(identity.lastName);
  const explicitLast = explicit[explicit.length - 1];
  if (explicitLast) return explicitLast;
  // Ohne getrennten Nachnamen: letztes Wort des Anzeigenamens
  const rawLast = words(identity.name).at(-1);
  if (rawLast) return rawLast;
  return identity.tokensFallback[identity.tokensFallback.length - 1] || '';
}

/** Einen Kandidaten gegen die eingehenden Daten bewerten. */
export function scoreGuestMatch(
  incoming: GuestIdentity,
  candidate: GuestCandidateRow,
): GuestMatch | null {
  const reasons: MatchReason[] = [];

  const inEmail = normalizeEmail(incoming.email);
  const candEmail = normalizeEmail(candidate.email);
  const emailMatch = !!inEmail && inEmail === candEmail;
  if (emailMatch) reasons.push('email');

  const inPhone = phoneKey(incoming.phone);
  const candPhone = phoneKey(candidate.phone);
  const phoneMatch = !!inPhone && inPhone === candPhone;
  if (phoneMatch) reasons.push('phone');

  // Vollständiger Name: getrennte Felder bevorzugen, sonst den Anzeigenamen
  const inTokens =
    nameTokens(incoming.firstName, incoming.lastName).length >= 2
      ? nameTokens(incoming.firstName, incoming.lastName)
      : nameTokens(incoming.name);
  const candTokens =
    nameTokens(candidate.first_name, candidate.last_name).length >= 2
      ? nameTokens(candidate.first_name, candidate.last_name)
      : nameTokens(candidate.guest_name);
  const nameMatch =
    inTokens.length >= 2 && candTokens.length >= 2 && inTokens.join(' ') === candTokens.join(' ');

  const inLast = lastNameToken({
    lastName: incoming.lastName,
    name: incoming.name,
    tokensFallback: inTokens,
  });
  const candLast = lastNameToken({
    lastName: candidate.last_name,
    name: candidate.guest_name,
    tokensFallback: candTokens,
  });
  const lastNameMatch = !nameMatch && !!inLast && inLast === candLast;

  if (nameMatch) reasons.push('name');
  else if (lastNameMatch) reasons.push('lastName');

  if (reasons.length === 0) return null;

  // Gleicher Name, aber beide Seiten haben Kontaktdaten und die passen nicht
  // zusammen → vermutlich zwei verschiedene Personen
  const contactConflict =
    (!!inEmail && !!candEmail && inEmail !== candEmail) ||
    (!!inPhone && !!candPhone && inPhone !== candPhone);

  const strong = emailMatch || phoneMatch || (nameMatch && !contactConflict);
  return { guest: candidate, reasons, strong };
}

interface MatchDb {
  prepare(query: string): { all<T>(): Promise<{ results?: T[] }> };
}

/**
 * Alle Kandidaten bewerten. Die Gästetabelle ist klein (eine Hütte, ein paar
 * hundert Gäste), deshalb wird in JavaScript verglichen statt in SQL — so
 * greifen Normalisierung und Wortreihenfolge zuverlässig.
 */
export async function findGuestMatches(
  db: MatchDb,
  incoming: GuestIdentity,
): Promise<GuestMatch[]> {
  const hasName =
    nameTokens(incoming.name).length > 0 ||
    nameTokens(incoming.firstName, incoming.lastName).length > 0;
  if (!hasName && !normalizeEmail(incoming.email) && !phoneKey(incoming.phone)) return [];

  // Die Gästetabelle führt nur den Anzeigenamen — Vor- und Nachname getrennt
  // kennt allein die eingehende Buchung.
  const rows = await db
    .prepare(
      'SELECT id, guest_name, NULL AS first_name, NULL AS last_name, email, phone FROM guests',
    )
    .all<GuestCandidateRow>();

  return (rows.results || [])
    .map((candidate) => scoreGuestMatch(incoming, candidate))
    .filter((m): m is GuestMatch => m !== null)
    .sort((a, b) => {
      if (a.strong !== b.strong) return a.strong ? -1 : 1;
      return b.reasons.length - a.reasons.length;
    })
    .slice(0, 5);
}

/** Sicherer Treffer, der ohne Rückfrage verwendet werden darf — sonst null. */
export async function findExistingGuest(
  db: MatchDb,
  incoming: GuestIdentity,
): Promise<GuestMatch | null> {
  const matches = await findGuestMatches(db, incoming);
  return matches.find((m) => m.strong) || null;
}

/** Lesbare Begründung für Protokoll und Oberfläche. */
export function describeMatch(reasons: MatchReason[]): string {
  const labels: Record<MatchReason, string> = {
    email: 'E-Mail',
    phone: 'Telefon',
    name: 'Name',
    lastName: 'Nachname',
  };
  return reasons.map((r) => labels[r]).join(' + ');
}
