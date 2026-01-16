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
  { value: 'pending', label: 'Ausstehend', color: 'yellow' },
  { value: 'completed', label: 'Abgeschlossen', color: 'blue' },
  { value: 'cancelled', label: 'Storniert', color: 'red' },
];

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

// Default new guest data
export const DEFAULT_NEW_GUEST = {
  guest_name: '',
  nationality: '',
  email: '',
  phone: '',
  platform: '',
  arrival_date: '',
  departure_date: '',
  adults: 2,
  children: 0,
  children_ages: '',
  pets: '',
  rental_price: 0,
  deposit_amount: 0,
  status: 'active',
  other_notes: '',
  address: '',
  is_returning_guest: 0,
  offer_sent: 0,
  contract_sent: 0,
  welcome_guide_sent: 0,
  deposit_paid: 0,
  final_payment: 0,
  final_payment_paid: 0,
  admin_briefed: 0,
};
