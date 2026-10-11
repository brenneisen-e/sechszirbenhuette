// E-Mail-Benachrichtigungen für Buchungen, die über Beds24 eingehen
// (Booking.com, Feratel, FeWo-direkt …). Versand über Resend.
//
// Optional: Ohne RESEND_API_KEY (Cloudflare Pages Secret) wird nur ein
// Log-Eintrag geschrieben — der Webhook arbeitet trotzdem vollständig.
// Empfänger und Absender lassen sich über NOTIFICATION_EMAIL und
// NOTIFICATION_FROM überschreiben; die Absender-Domain muss bei Resend
// verifiziert sein.

import { getCloudflareContext } from '@opennextjs/cloudflare';

import { SITE_CONFIG } from '@/lib/constants';
import { type LogDatabase, writeAppLog } from '@/lib/server/appLog';

const DEFAULT_FROM = 'Sechszirbenhütte <noreply@sechszirbenhuette.com>';
const ADMIN_URL = `${SITE_CONFIG.url}/admin?tab=guests`;

interface MailEnv {
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL?: string;
  NOTIFICATION_FROM?: string;
}

async function getMailEnv(): Promise<MailEnv> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as MailEnv;
  } catch {
    return {};
  }
}

/**
 * Verschickt eine Benachrichtigung an das Postfach der Hütte. Fehler werden
 * protokolliert, aber nie geworfen — eine fehlgeschlagene Mail darf keine
 * Buchung blockieren.
 */
export async function sendNotificationEmail(
  subject: string,
  body: string,
  db: LogDatabase | null,
): Promise<void> {
  try {
    const env = await getMailEnv();
    if (!env.RESEND_API_KEY) {
      await writeAppLog(
        db,
        'info',
        'email',
        'skip',
        `Keine E-Mail versendet (RESEND_API_KEY fehlt): ${subject}`,
      );
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.NOTIFICATION_FROM || DEFAULT_FROM,
        to: [env.NOTIFICATION_EMAIL || SITE_CONFIG.email],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      await writeAppLog(
        db,
        'error',
        'email',
        'send',
        `Resend Fehler: ${res.status}`,
        (await res.text()).slice(0, 500),
      );
    } else {
      await writeAppLog(db, 'info', 'email', 'send', `E-Mail gesendet: ${subject}`);
    }
  } catch (error) {
    await writeAppLog(
      db,
      'error',
      'email',
      'send',
      'E-Mail-Versand fehlgeschlagen',
      error instanceof Error ? error.message : String(error),
    );
  }
}

function formatDate(value?: string | null): string {
  if (!value) return 'unbekannt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function timestamp(): string {
  return new Date().toLocaleString('de-AT', { timeZone: 'Europe/Vienna' });
}

export interface CancellationDetails {
  guestName: string;
  bookingNumber?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  platform?: string | null;
  /** Woher kam die Stornierung, z.B. "Beds24" */
  source: string;
}

export async function sendCancellationNotification(
  details: CancellationDetails,
  db: LogDatabase | null,
): Promise<void> {
  const arrival = formatDate(details.arrivalDate);
  const departure = formatDate(details.departureDate);
  const lines = [
    'Eine Buchung wurde storniert:',
    '',
    `Gast: ${details.guestName}`,
    ...(details.bookingNumber ? [`Buchungsnummer: ${details.bookingNumber}`] : []),
    `Anreise: ${arrival}`,
    `Abreise: ${departure}`,
    ...(details.platform ? [`Plattform: ${details.platform}`] : []),
    `Storniert über: ${details.source}`,
    '',
    'Der Zeitraum ist damit wieder frei.',
    '',
    `Zeitpunkt: ${timestamp()}`,
    `Admin Center: ${ADMIN_URL}`,
  ];
  await sendNotificationEmail(
    `Stornierung: ${details.guestName} (${arrival} – ${departure})`,
    lines.join('\n'),
    db,
  );
}

export interface NewBookingDetails {
  guestName: string;
  bookingNumber?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  platform?: string | null;
  adults?: number | null;
  children?: number | null;
  phone?: string | null;
  email?: string | null;
  /** Vom Portal gemeldete Ankunftszeit, z.B. "16:00 - 17:00" */
  checkinTime?: string | null;
  price?: number | null;
}

export async function sendNewBookingNotification(
  details: NewBookingDetails,
  db: LogDatabase | null,
): Promise<void> {
  const arrival = formatDate(details.arrivalDate);
  const departure = formatDate(details.departureDate);
  const guests = [
    details.adults ? `${details.adults} Erw.` : null,
    details.children ? `${details.children} Ki.` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const lines = [
    'Eine neue Buchung ist über Beds24 eingegangen:',
    '',
    `Gast: ${details.guestName}`,
    ...(details.bookingNumber ? [`Buchungsnummer: ${details.bookingNumber}`] : []),
    `Anreise: ${arrival}`,
    `Abreise: ${departure}`,
    ...(guests ? [`Personen: ${guests}`] : []),
    ...(details.checkinTime ? [`Voraussichtliche Ankunft: ${details.checkinTime} Uhr`] : []),
    ...(details.price ? [`Preis lt. Portal: ${details.price.toFixed(2)} €`] : []),
    ...(details.phone ? [`Telefon: ${details.phone}`] : []),
    ...(details.email ? [`E-Mail: ${details.email}`] : []),
    ...(details.platform ? [`Plattform: ${details.platform}`] : []),
    '',
    `Zeitpunkt: ${timestamp()}`,
    `Admin Center: ${ADMIN_URL}`,
  ];
  const timeSuffix = details.checkinTime ? `, Ankunft ${details.checkinTime}` : '';
  await sendNotificationEmail(
    `Neue Buchung: ${details.guestName} (${arrival} – ${departure}${timeSuffix})`,
    lines.join('\n'),
    db,
  );
}
