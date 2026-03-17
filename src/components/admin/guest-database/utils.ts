// Utility functions for GuestDatabase

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Guest, GuestCost, GuestDocument, GuestNote, Booking, SortColumn, SortDirection } from './types';

// ---- Cache helpers ----

const CACHE_KEY_GUESTS = 'natberger_guests_cache';
const CACHE_KEY_TIMESTAMP = 'natberger_guests_timestamp';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 Minuten

export function loadGuestsFromCache(): Guest[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY_GUESTS);
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_MAX_AGE) {
        return JSON.parse(cached) as Guest[];
      }
    }
  } catch (e) {
    console.error('Error reading from cache:', e);
  }
  return null;
}

export function saveGuestsToCache(guestsData: Guest[]): void {
  try {
    localStorage.setItem(CACHE_KEY_GUESTS, JSON.stringify(guestsData));
    localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
  } catch (e) {
    console.error('Error saving to cache:', e);
  }
}

// ---- Constants ----

// Mapping of standard task keys to guest checkbox fields
export const TASK_TO_CHECKBOX_MAP: Record<string, keyof Guest> = {
  'angebot': 'offer_sent',
  'vertrag': 'contract_sent',
  'anzahlung': 'deposit_paid',
  'welcome_guide': 'welcome_guide_sent',
  'restzahlung': 'final_payment_paid',
  'verwaltung': 'admin_briefed'
};

// Mapping of standard task titles to guest checkbox fields
export const TASK_TITLE_TO_FIELD: Record<string, keyof Guest> = {
  'Angebot senden': 'offer_sent',
  'Vertrag senden': 'contract_sent',
  'Anzahlung erhalten': 'deposit_paid',
  'Welcome Guide senden': 'welcome_guide_sent',
  'Restzahlung erhalten': 'final_payment_paid',
  'Verwaltung briefen': 'admin_briefed'
};

// ---- Date & formatting utilities ----

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE');
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// ---- Platform utilities ----

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

export function getPlatformBadgeStyle(platform: string): string {
  const lower = platform.toLowerCase();
  if (lower.includes('fewo')) return 'bg-orange-100 text-orange-700';
  if (lower.includes('airbnb')) return 'bg-pink-100 text-pink-700';
  if (lower.includes('booking')) return 'bg-blue-100 text-blue-700';
  if (lower.includes('whats')) return 'bg-lime-100 text-lime-700';
  if (lower.includes('mail') || lower.includes('direkt')) return 'bg-green-100 text-green-700';
  if (lower.includes('feratel') || lower.includes('kaernten') || lower.includes('kärnten')) return 'bg-cyan-100 text-cyan-700';
  if (lower.includes('privat')) return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

export function getGuestPlatforms(
  guest: Guest,
  guestBookings: Record<number, Booking[]>
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
  const bookings = guestBookings[guest.id] || [];
  bookings.forEach(b => {
    if (b.platform) {
      const normalized = normalizePlatformDisplay(b.platform);
      if (normalized !== '-') platforms.add(normalized);
    }
  });

  return Array.from(platforms);
}

// ---- Guest info parsing ----

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

// ---- Calculation utilities ----

export function calculateNights(arrival: string | null, departure: string | null): number {
  if (!arrival || !departure) return 0;
  const arrivalDate = new Date(arrival);
  const departureDate = new Date(departure);
  const diffTime = departureDate.getTime() - arrivalDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateKurtaxe(guest: Guest): number {
  const nights = calculateNights(guest.arrival_date, guest.departure_date);
  return nights * guest.adults * 2.70;
}

export function calculateTotalCosts(guestCosts: GuestCost[]): number {
  return guestCosts.reduce((sum, cost) => sum + cost.amount, 0);
}

export function calculateMietertrag(guest: Guest, guestCosts: GuestCost[]): number {
  const totalCosts = calculateTotalCosts(guestCosts);
  return guest.rental_price - totalCosts;
}

// ---- Booking utilities ----

export function getLatestBooking(
  guest: Guest,
  guestBookings: Record<number, Booking[]>
): { arrival: string | null; departure: string | null } {
  const additionalBookings = guestBookings[guest.id] || [];

  // Collect all bookings (main + additional)
  const allBookings = [
    { arrival_date: guest.arrival_date, departure_date: guest.departure_date },
    ...additionalBookings.map(b => ({ arrival_date: b.arrival_date, departure_date: b.departure_date }))
  ].filter(b => b.arrival_date);

  if (allBookings.length === 0) {
    return { arrival: guest.arrival_date, departure: guest.departure_date };
  }

  // Sort by arrival_date descending (newest first)
  allBookings.sort((a, b) => {
    const dateA = new Date(a.arrival_date!).getTime();
    const dateB = new Date(b.arrival_date!).getTime();
    return dateB - dateA;
  });

  return { arrival: allBookings[0].arrival_date, departure: allBookings[0].departure_date };
}

export function getEffectiveStatus(
  guest: Guest,
  guestBookings: Record<number, Booking[]>
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const additionalBookings = guestBookings[guest.id] || [];

  // Check main booking
  if (guest.departure_date && new Date(guest.departure_date) >= today) {
    return 'active';
  }

  // Check additional bookings
  for (const booking of additionalBookings) {
    if (booking.status !== 'cancelled' && booking.departure_date && new Date(booking.departure_date) >= today) {
      return 'active';
    }
  }

  // No future bookings - return original status
  return guest.status || 'completed';
}

// ---- Sort icon component ----

import React from 'react';

interface SortIconProps {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

export function SortIcon({ column, sortColumn, sortDirection }: SortIconProps): React.ReactElement {
  if (sortColumn !== column) {
    return React.createElement(ArrowUpDown, { className: 'w-3 h-3 text-gray-400' });
  }
  return sortDirection === 'asc'
    ? React.createElement(ArrowUp, { className: 'w-3 h-3 text-primary' })
    : React.createElement(ArrowDown, { className: 'w-3 h-3 text-primary' });
}
