/**
 * Calculation utilities for the vacation rental management system
 * ES2024 optimized
 */

import { nightsBetween } from './formatting';

/**
 * Commission rate for Malte & Eike (always 10% of rental price)
 */
export const COMMISSION_RATE = 0.10;

/**
 * Kurtaxe (tourist tax) per adult per night
 */
export const KURTAXE_PER_ADULT_PER_NIGHT = 3.10;

/**
 * Default cleaning cost
 */
export const DEFAULT_CLEANING_COST = 85;

/**
 * Calculate commission (Provision) for Malte & Eike
 * Always 10% of the rental price (payout received)
 */
export function calculateCommission(rentalPrice: number): number {
  return rentalPrice * COMMISSION_RATE;
}

/**
 * Calculate tourist tax (Kurtaxe)
 */
export function calculateKurtaxe(adults: number, nights: number): number {
  return adults * nights * KURTAXE_PER_ADULT_PER_NIGHT;
}

/**
 * Calculate number of nights from arrival and departure dates
 */
export function calculateNights(arrivalDate: string, departureDate: string): number {
  return nightsBetween(arrivalDate, departureDate);
}

/**
 * Calculate utility costs breakdown
 */
export interface UtilityCostsBreakdown {
  holz: number;
  wasser: number;
  muell: number;
  strom: number;
  reinigung: number;
  kurtaxe: number;
  total: number;
}

export interface UtilityCostSettings {
  holzPerNight: number;
  wasserPerPerson: number;
  muellPerNight: number;
  stromPerNight: number;
  cleaningCost: number;
}

export const DEFAULT_UTILITY_SETTINGS: UtilityCostSettings = {
  holzPerNight: 5,
  wasserPerPerson: 3,
  muellPerNight: 2,
  stromPerNight: 8,
  cleaningCost: DEFAULT_CLEANING_COST,
};

/**
 * Calculate utility costs for a booking
 */
export function calculateUtilityCosts(
  nights: number,
  adults: number,
  children: number,
  settings: UtilityCostSettings = DEFAULT_UTILITY_SETTINGS,
  isCleaningCash = false,
): UtilityCostsBreakdown {
  const totalPersons = adults + children;

  const holz = nights * settings.holzPerNight;
  const wasser = totalPersons * settings.wasserPerPerson;
  const muell = nights * settings.muellPerNight;
  const strom = nights * settings.stromPerNight;
  const reinigung = isCleaningCash ? 0 : settings.cleaningCost;
  const kurtaxe = calculateKurtaxe(adults, nights);

  const total = holz + wasser + muell + strom + reinigung + kurtaxe;

  return {
    holz,
    wasser,
    muell,
    strom,
    reinigung,
    kurtaxe,
    total,
  };
}

/**
 * Calculate "Mietertrag" (rental income after costs and commission)
 * Formula: Miete - Kalkulatorische Kosten - Provision (10%)
 */
export function calculateMietertrag(
  rentalPrice: number,
  utilityCosts: UtilityCostsBreakdown,
): { mietertrag: number; commission: number; kalkKosten: number } {
  const commission = calculateCommission(rentalPrice);
  // Kalk. Kosten = NK (Holz, Wasser, Müll, Strom) + Kurtaxe + Reinigung
  const kalkKosten =
    utilityCosts.holz +
    utilityCosts.wasser +
    utilityCosts.muell +
    utilityCosts.strom +
    utilityCosts.reinigung +
    utilityCosts.kurtaxe;

  const mietertrag = rentalPrice - kalkKosten - commission;

  return { mietertrag, commission, kalkKosten };
}

/**
 * Calculate deposit amount (typically 30% of rental price)
 */
export function calculateDeposit(rentalPrice: number, percentage = 0.3): number {
  return Math.round(rentalPrice * percentage);
}

/**
 * Calculate remaining payment after deposit
 */
export function calculateRemainingPayment(rentalPrice: number, depositAmount: number): number {
  return rentalPrice - depositAmount;
}

/**
 * Group bookings by quarter
 */
export function groupByQuarter<T extends { arrival_date?: string }>(
  items: T[],
): Map<string, T[]> {
  return items.reduce((acc, item) => {
    if (!item.arrival_date) return acc;
    const date = new Date(item.arrival_date);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const year = date.getFullYear();
    const key = `Q${quarter} ${year}`;

    const existing = acc.get(key) ?? [];
    existing.push(item);
    acc.set(key, existing);
    return acc;
  }, new Map<string, T[]>());
}

/**
 * Group bookings by month
 */
export function groupByMonth<T extends { arrival_date?: string }>(
  items: T[],
): Map<string, T[]> {
  return items.reduce((acc, item) => {
    if (!item.arrival_date) return acc;
    const date = new Date(item.arrival_date);
    const month = date.toLocaleString('de-DE', { month: 'long' });
    const year = date.getFullYear();
    const key = `${month} ${year}`;

    const existing = acc.get(key) ?? [];
    existing.push(item);
    acc.set(key, existing);
    return acc;
  }, new Map<string, T[]>());
}

/**
 * Calculate totals for a list of bookings
 */
export interface BookingTotals {
  totalRentalPrice: number;
  totalCommission: number;
  totalUtilityCosts: number;
  totalMietertrag: number;
  bookingCount: number;
  totalNights: number;
}

export function calculateBookingTotals<T extends {
  rental_price?: number | null;
  arrival_date?: string;
  departure_date?: string;
  adults?: number;
  children?: number;
}>(bookings: T[], settings?: UtilityCostSettings): BookingTotals {
  return bookings.reduce(
    (acc, booking) => {
      const rentalPrice = booking.rental_price ?? 0;
      const nights = booking.arrival_date && booking.departure_date
        ? calculateNights(booking.arrival_date, booking.departure_date)
        : 0;
      const adults = booking.adults ?? 2;
      const children = booking.children ?? 0;

      const utilityCosts = calculateUtilityCosts(nights, adults, children, settings);
      const { mietertrag, commission } = calculateMietertrag(rentalPrice, utilityCosts);

      return {
        totalRentalPrice: acc.totalRentalPrice + rentalPrice,
        totalCommission: acc.totalCommission + commission,
        totalUtilityCosts: acc.totalUtilityCosts + utilityCosts.total,
        totalMietertrag: acc.totalMietertrag + mietertrag,
        bookingCount: acc.bookingCount + 1,
        totalNights: acc.totalNights + nights,
      };
    },
    {
      totalRentalPrice: 0,
      totalCommission: 0,
      totalUtilityCosts: 0,
      totalMietertrag: 0,
      bookingCount: 0,
      totalNights: 0,
    },
  );
}

/**
 * Round to 2 decimal places
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
