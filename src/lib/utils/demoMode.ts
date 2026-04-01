/**
 * Demo Mode Utilities
 *
 * When demo mode is active:
 * - Guest names, emails, phones, addresses are anonymized
 * - Financial data is rounded to obvious demo numbers
 * - Booking numbers are masked
 */

// Demo guest names pool
const DEMO_FIRST_NAMES = [
  'Max', 'Anna', 'Peter', 'Maria', 'Thomas', 'Laura', 'Stefan', 'Julia',
  'Michael', 'Sarah', 'Andreas', 'Lisa', 'Markus', 'Sandra', 'Christian',
  'Claudia', 'Daniel', 'Eva', 'Martin', 'Nina', 'Tobias', 'Monika',
  'Florian', 'Katharina', 'Sebastian', 'Petra', 'Johannes', 'Sabine',
];

const DEMO_LAST_NAMES = [
  'Mustermann', 'Beispiel', 'Muster', 'Demo', 'Testgast', 'Probegast',
  'Mustergast', 'Testname', 'Platzhalter', 'Beispielgast', 'Demogast',
  'Testkunde', 'Musterkunde', 'Musterfrau', 'Testbesucher',
];

// Consistent mapping: same input always produces same output
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Anonymize a guest name - consistent mapping (same name -> same demo name)
 */
export function anonymizeGuestName(name: string | null): string {
  if (!name) return 'Demo Gast';
  const hash = hashString(name);
  const firstName = DEMO_FIRST_NAMES[hash % DEMO_FIRST_NAMES.length] ?? 'Demo';
  const lastName = DEMO_LAST_NAMES[(hash >> 4) % DEMO_LAST_NAMES.length] ?? 'Gast';
  return `${firstName} ${lastName}`;
}

/**
 * Anonymize email
 */
export function anonymizeEmail(email: string | null): string {
  if (!email) return null as unknown as string;
  const hash = hashString(email);
  const firstName = (DEMO_FIRST_NAMES[hash % DEMO_FIRST_NAMES.length] ?? 'demo').toLowerCase();
  return `${firstName}.demo@beispiel.de`;
}

/**
 * Anonymize phone number
 */
export function anonymizePhone(phone: string | null): string {
  if (!phone) return null as unknown as string;
  return '+49 123 4567890';
}

/**
 * Anonymize address
 */
export function anonymizeAddress(address: string | null): string {
  if (!address) return null as unknown as string;
  return 'Musterstraße 1, 12345 Musterstadt';
}

/**
 * Mask booking number
 */
export function anonymizeBookingNumber(bookingNumber: string | null): string {
  if (!bookingNumber) return null as unknown as string;
  return 'DEMO-' + bookingNumber.slice(-4).replace(/./g, 'X') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

/**
 * Round a financial amount to obvious demo numbers.
 * Rounds to nearest 50 for values under 500, nearest 100 for larger values.
 * Returns values that are clearly "demo" (round numbers).
 */
export function roundDemoAmount(amount: number): number {
  if (amount === 0) return 0;
  const sign = amount >= 0 ? 1 : -1;
  const abs = Math.abs(amount);

  if (abs < 10) return sign * 10;
  if (abs < 100) return sign * Math.round(abs / 10) * 10;
  if (abs < 500) return sign * Math.round(abs / 50) * 50;
  if (abs < 2000) return sign * Math.round(abs / 100) * 100;
  return sign * Math.round(abs / 500) * 500;
}

/**
 * Format a currency value for demo mode
 */
export function formatDemoCurrency(amount: number): string {
  return `~${roundDemoAmount(amount).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
}
