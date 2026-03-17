// Pure utility functions for GuestDatabase components

import type { Guest, Booking } from './types';
import { getPlatformBadgeClasses } from './constants';

// Calculate nights between two dates
export function calculateNights(arrival: string | null, departure: string | null): number {
  if (!arrival || !departure) return 0;
  const arrivalDate = new Date(arrival);
  const departureDate = new Date(departure);
  const diffTime = departureDate.getTime() - arrivalDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate Kurtaxe for a guest
export function calculateKurtaxe(guest: Guest): number {
  const nights = calculateNights(guest.arrival_date, guest.departure_date);
  return nights * guest.adults * 2.70;
}

// Normalize platform name for display
export function normalizePlatformDisplay(platform: string | null): string {
  if (!platform) return '-';
  const lower = platform.toLowerCase();
  if (lower.includes('whats')) return 'WhatsApp';
  if (lower.includes('feratel') || lower.includes('kaernten') || lower.includes('kärnten')) return 'Feratel';
  if (lower.includes('fewo') || lower.includes('ferienwohnung')) return 'FeWo';
  if (lower.includes('booking')) return 'Booking.com';
  if (lower.includes('airbnb')) return 'Airbnb';
  if (lower.includes('privat')) return 'Privat';
  if (lower.includes('mail') || lower.includes('direkt')) return 'E-Mail';
  return platform;
}

// Get platform badge style (Tailwind CSS classes)
// Delegates to centralized PLATFORM_CONFIGS in constants.ts
export function getPlatformBadgeStyle(platform: string): string {
  return getPlatformBadgeClasses(platform);
}

// Get all unique platforms for a guest (from guest record + bookings)
export function getGuestPlatforms(
  guest: Guest,
  bookings: Booking[]
): string[] {
  const platforms = new Set<string>();

  // Add guest's main platform(s) - can be comma-separated
  if (guest.platform) {
    guest.platform.split(',').forEach(p => {
      const normalized = normalizePlatformDisplay(p.trim());
      if (normalized !== '-') platforms.add(normalized);
    });
  }

  // Add platforms from bookings
  bookings.forEach(b => {
    if (b.platform) {
      const normalized = normalizePlatformDisplay(b.platform);
      if (normalized !== '-') platforms.add(normalized);
    }
  });

  return Array.from(platforms);
}

// Format date for display (German locale)
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE');
  } catch {
    return dateStr;
  }
}

// Format currency (EUR, German locale)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// Get the effective booking amount (payout_amount for platform bookings, rental_price otherwise)
export function getEffectiveBookingAmount(booking: Booking): number {
  if (booking.rental_price > 0) return booking.rental_price;
  // For platform bookings (Booking.com, Airbnb), rental_price may be 0
  // but payout_amount in additional_costs has the actual value
  if (booking.additional_costs) {
    try {
      const costs = typeof booking.additional_costs === 'string'
        ? JSON.parse(booking.additional_costs)
        : booking.additional_costs;
      if (costs?.payout_amount && costs.payout_amount > 0) {
        return costs.payout_amount;
      }
    } catch { /* ignore parse errors */ }
  }
  return booking.rental_price || 0;
}

// Parse guest name to extract name and address
export function parseGuestInfo(
  guestName: string,
  address: string | null
): { name: string; address: string | null } {
  // If address field is filled, use it directly
  if (address) {
    return { name: guestName, address };
  }

  // Try to extract address from combined guest_name field
  // Pattern: "Name Straße Nr PLZ Ort" or "Name + Name Straße Nr PLZ Ort"
  const lines = guestName.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean);

  if (lines.length === 1) {
    // Try to find address pattern (street with number, postal code)
    const match = guestName.match(/^(.+?)\s+([A-Za-zäöüßÄÖÜ]+(?:str(?:aße|\.)?|weg|allee|platz|gasse)\s*\.?\s*\d+.*)$/i);
    if (match) {
      return { name: match[1].trim(), address: match[2].trim() };
    }
    // Try postal code pattern
    const postalMatch = guestName.match(/^(.+?)\s+(\d{4,5}\s+.+)$/);
    if (postalMatch) {
      return { name: postalMatch[1].trim(), address: postalMatch[2].trim() };
    }
    return { name: guestName, address: null };
  }

  // Multiple lines - first is name, rest is address
  return { name: lines[0], address: lines.slice(1).join(', ') };
}

/**
 * Berechnet den effektiven Status eines Gastes anhand seiner Buchungen.
 * Der Gast-Status wird vollständig aus den Buchungs-Status abgeleitet.
 * Priorität: active > completed > cancelled
 *
 * Kann auch für Einzelbuchungen verwendet werden:
 *   getEffectiveStatus('completed', [booking])
 */
export function getEffectiveStatus(dbStatus: string, bookings: Pick<Booking, 'status' | 'departure_date' | 'arrival_date'>[]): string {
  if (bookings.length === 0) return dbStatus || 'completed';

  let hasActive = false;
  let hasCompleted = false;

  for (const booking of bookings) {
    const effectiveStatus = getEffectiveBookingStatus(
      booking.status,
      booking.departure_date,
      booking.arrival_date
    );
    if (effectiveStatus === 'active') hasActive = true;
    else if (effectiveStatus === 'completed') hasCompleted = true;
  }

  // Priorität: active > completed > cancelled
  if (hasActive) return 'active';
  if (hasCompleted) return 'completed';
  return 'cancelled';
}

/**
 * Berechnet den effektiven Status einer einzelnen Buchung.
 * - 'cancelled' → bleibt 'cancelled' (wird nie überschrieben)
 * - 'completed' → bleibt 'completed' (manuell gesetzt, z.B. vorzeitige Abreise)
 * - Abreise in der Vergangenheit → 'completed'
 * - Abreise heute oder in der Zukunft → 'active'
 */
export function getEffectiveBookingStatus(bookingStatus: string, departureDate: string | null, arrivalDate?: string | null): string {
  if (bookingStatus === 'cancelled') return 'cancelled';
  if (bookingStatus === 'completed') return 'completed';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Abreise in der Vergangenheit → completed
  if (departureDate && new Date(departureDate) < today) {
    return 'completed';
  }

  // Abreise heute oder in der Zukunft (inkl. zukünftige Anreise) → active
  if (departureDate && new Date(departureDate) >= today) {
    return 'active';
  }

  return bookingStatus || 'completed';
}

// Sort guests by column
export function sortGuests(
  guests: Guest[],
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc',
  guestBookings: Record<number, Booking[]>
): Guest[] {
  return [...guests].sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal: string | number | null = null;
    let bVal: string | number | null = null;

    switch (sortColumn) {
      case 'id':
        aVal = a.id;
        bVal = b.id;
        break;
      case 'guest_name':
        aVal = a.guest_name.toLowerCase();
        bVal = b.guest_name.toLowerCase();
        break;
      case 'platform':
        aVal = (a.platform || '').toLowerCase();
        bVal = (b.platform || '').toLowerCase();
        break;
      case 'arrival_date': {
        // Use latest booking arrival date (authoritative), fallback to legacy guest field
        const aBookingsForDate = guestBookings[a.id] || [];
        const bBookingsForDate = guestBookings[b.id] || [];
        const aLatest = aBookingsForDate
          .filter(booking => booking.arrival_date)
          .sort((x, y) => new Date(y.arrival_date!).getTime() - new Date(x.arrival_date!).getTime())[0];
        const bLatest = bBookingsForDate
          .filter(booking => booking.arrival_date)
          .sort((x, y) => new Date(y.arrival_date!).getTime() - new Date(x.arrival_date!).getTime())[0];
        aVal = aLatest?.arrival_date || a.arrival_date || '';
        bVal = bLatest?.arrival_date || b.arrival_date || '';
        break;
      }
      case 'rental_price': {
        const aBookings = guestBookings[a.id] || [];
        const bBookings = guestBookings[b.id] || [];
        aVal = aBookings.length > 0
          ? aBookings.reduce((sum, booking) => sum + (booking.rental_price || 0), 0)
          : a.rental_price;
        bVal = bBookings.length > 0
          ? bBookings.reduce((sum, booking) => sum + (booking.rental_price || 0), 0)
          : b.rental_price;
        break;
      }
      case 'status': {
        const aBookingsForStatus = guestBookings[a.id] || [];
        const bBookingsForStatus = guestBookings[b.id] || [];
        aVal = aBookingsForStatus.length > 0
          ? getEffectiveStatus(a.status, aBookingsForStatus)
          : getEffectiveBookingStatus(a.status, a.departure_date, a.arrival_date);
        bVal = bBookingsForStatus.length > 0
          ? getEffectiveStatus(b.status, bBookingsForStatus)
          : getEffectiveBookingStatus(b.status, b.departure_date, b.arrival_date);
        break;
      }
    }

    if (aVal === null || aVal === '') return 1;
    if (bVal === null || bVal === '') return -1;

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}
