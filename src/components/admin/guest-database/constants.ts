// Shared constants for GuestDatabase components

import type { CostType, Assignee, StandardTask, Country } from './types';

// Cost type definitions
export const COST_TYPES: CostType[] = [
  {
    type: 'Nebenkosten',
    categories: [
      { name: 'Wasser', defaultAmount: null },
      { name: 'Strom', defaultAmount: null }
    ]
  },
  {
    type: 'Reinigung',
    categories: [
      { name: 'Standard', defaultAmount: 100 },
      { name: 'Groß', defaultAmount: 125 }
    ]
  },
  {
    type: 'Kurtaxe',
    categories: null, // Calculated as 2.70€ × nights × adults
    perNightPerAdult: 2.70
  }
];

// Available assignees for tasks
export const ASSIGNEES: Assignee[] = [
  { email: 'eike@brenneisen.info', name: 'Eike' },
  { email: 'malte@brenneisen.info', name: 'Malte' },
];

// Standard tasks that should be created for each guest
// is_completed: 0 = pending, 1 = completed, 2 = not applicable (N/A)
export const STANDARD_TASKS: StandardTask[] = [
  { key: 'angebot', title: 'Angebot senden', order: 1 },
  { key: 'vertrag', title: 'Vertrag senden', order: 2 },
  { key: 'anzahlung', title: 'Anzahlung erhalten', order: 3 },
  { key: 'waesche', title: 'Wäschepaket anfragen', order: 4 },
  { key: 'welcome_guide', title: 'Welcome Guide senden', order: 5 },
  { key: 'restzahlung', title: 'Restzahlung erhalten', order: 6 },
  { key: 'verwaltung', title: 'Verwaltung briefen', order: 7 },
];

// Platform options for booking source
export const PLATFORMS: string[] = [
  'FeWo',
  'Booking.com',
  'Airbnb',
  'WhatsApp',
  'E-Mail',
  'Telefon',
  'Feratel',
  'Privat',
  'Sonstige',
];

// Countries for nationality selection (sorted alphabetically)
export const COUNTRIES: Country[] = [
  { code: 'BE', name: 'Belgien' },
  { code: 'DK', name: 'Dänemark' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'Frankreich' },
  { code: 'GB', name: 'Großbritannien' },
  { code: 'IT', name: 'Italien' },
  { code: 'HR', name: 'Kroatien' },
  { code: 'NL', name: 'Niederlande' },
  { code: 'NO', name: 'Norwegen' },
  { code: 'AT', name: 'Österreich' },
  { code: 'PL', name: 'Polen' },
  { code: 'RO', name: 'Rumänien' },
  { code: 'SE', name: 'Schweden' },
  { code: 'CH', name: 'Schweiz' },
  { code: 'SK', name: 'Slowakei' },
  { code: 'SI', name: 'Slowenien' },
  { code: 'ES', name: 'Spanien' },
  { code: 'CZ', name: 'Tschechien' },
  { code: 'HU', name: 'Ungarn' },
  { code: 'US', name: 'USA' },
];

// Month names for calendar and date display
export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Short month names
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

// Status options for bookings/guests
export const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv', color: 'green' },
  { value: 'completed', label: 'Abgeschlossen', color: 'gray' },
  { value: 'cancelled', label: 'Storniert', color: 'orange' },
];

// Centralized status colors (single source of truth)
export const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active:    { label: 'Aktiv',         bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  completed: { label: 'Abgeschlossen', bg: 'bg-gray-100',  text: 'text-gray-600',  border: 'border-gray-200' },
  cancelled: { label: 'Storniert',     bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
};

export function getStatusClasses(status: string): string {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['active']!;
  return `${s.bg} ${s.text} ${s.border}`;
}

// Centralized platform color configuration (single source of truth)
// Used by BookingCard, GuestTableRow, helpers.ts, and BookingWizard
export interface PlatformConfig {
  key: string;
  label: string;
  /** Tailwind classes for badges (bg + text) */
  badgeBg: string;
  badgeText: string;
  /** Solid color class for wizard tiles / icons */
  solidBg: string;
  /** Keywords used to match raw platform strings */
  keywords: string[];
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { key: 'booking',  label: 'Booking.com', badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700',   solidBg: 'bg-blue-500',   keywords: ['booking'] },
  { key: 'fewo',     label: 'FeWo/VRBO',   badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', solidBg: 'bg-orange-500', keywords: ['fewo', 'vrbo', 'ferienwohnung'] },
  { key: 'airbnb',   label: 'Airbnb',      badgeBg: 'bg-pink-100',   badgeText: 'text-pink-700',   solidBg: 'bg-pink-500',   keywords: ['airbnb'] },
  { key: 'feratel',  label: 'Feratel',     badgeBg: 'bg-cyan-100',   badgeText: 'text-cyan-700',   solidBg: 'bg-cyan-500',   keywords: ['feratel', 'kaernten', 'kärnten'] },
  { key: 'mail',     label: 'E-Mail',      badgeBg: 'bg-green-100',  badgeText: 'text-green-700',  solidBg: 'bg-green-500',  keywords: ['mail', 'direkt', 'e-mail'] },
  { key: 'whatsapp', label: 'WhatsApp',    badgeBg: 'bg-lime-100',   badgeText: 'text-lime-700',   solidBg: 'bg-lime-500',   keywords: ['whatsapp'] },
  { key: 'telefon',  label: 'Telefon',     badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', solidBg: 'bg-indigo-500', keywords: ['telefon', 'phone'] },
  { key: 'privat',   label: 'Privat',      badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', solidBg: 'bg-purple-500', keywords: ['privat'] },
];

/** Resolve a raw platform string to a PlatformConfig, or null if no match */
export function resolvePlatformConfig(platform: string | null): PlatformConfig | null {
  if (!platform) return null;
  const lower = platform.toLowerCase();
  return PLATFORM_CONFIGS.find(cfg =>
    cfg.keywords.some(kw => lower.includes(kw))
  ) || null;
}

/** Get badge classes for a platform string (for table/card badges) */
export function getPlatformBadgeClasses(platform: string | null): string {
  const cfg = resolvePlatformConfig(platform);
  if (!cfg) return 'bg-gray-100 text-gray-600';
  return `${cfg.badgeBg} ${cfg.badgeText}`;
}

// iCal calendar sources
export const ICAL_SOURCES = [
  {
    name: 'Feratel',
    url: 'https://ical.deskline.net/KTN/services/35981ad0-78ba-48f7-9ebc-3260e1ea446b/4d3167ef-4067-4c33-9483-a005b3dbdd17.ics'
  },
  {
    name: 'FeWo-Direkt',
    url: 'https://www.fewo-direkt.de/icalendar/69e49db18b094f38956a712f7c455189.ics?nonTentative'
  },
  {
    name: 'Booking.com',
    url: 'https://ical.booking.com/v1/export?t=f5f44162-4f91-434b-bf41-73381f708169'
  }
];

// Default new guest data - only personal/guest fields
// Booking fields (dates, prices, persons) are managed in the bookings table
export const DEFAULT_NEW_GUEST = {
  guest_name: '',
  nationality: '',
  email: '',
  phone: '',
  address: '',
  other_notes: '',
  status: 'active',
  is_returning_guest: 0,
};
