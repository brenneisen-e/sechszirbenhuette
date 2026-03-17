/**
 * ============================================================================
 * DEPRECATED - DO NOT USE FOR NEW CODE
 * ============================================================================
 *
 * This file contains legacy calculation utilities from an earlier version of
 * the vacation rental management system. All functions and constants in this
 * file have been superseded by modern implementations:
 *
 *   - Kurtaxe: Now uses date-range-based rates from the kurtaxe_rates table
 *     (see positionCalculator.ts and utility-costs/calculations.ts)
 *   - Utility costs: Now uses seasonal/weekly rates via calculateUtilityCostsForBooking()
 *     (see financeCalculations.ts and utility-costs/calculations.ts)
 *   - Commission: Now calculated as mieterlos * 0.10 (not rentalPrice * 0.10)
 *     (see financeCalculations.ts)
 *   - Cleaning cost: Now 100/125 EUR (not 85 EUR)
 *     (see financeCalculations.ts)
 *
 * This file is retained for historical comparisons only.
 * Re-exported via lib/index.ts but NOT actively imported by any component.
 *
 * @deprecated Since migration to financeCalculations.ts + utility-costs/calculations.ts
 * ============================================================================
 */

import { nightsBetween } from './formatting';

/**
 * Commission rate for Malte & Eike (always 10% of rental price)
 * @deprecated Legacy rate. Modern commission is calculated as mieterlos * 0.10
 * (not rentalPrice * 0.10). See financeCalculations.ts.
 * NOT imported anywhere in the codebase.
 */
export const COMMISSION_RATE = 0.10;

/**
 * Kurtaxe (tourist tax) per adult per night
 * @deprecated Hardcoded at 3.10 EUR. Current rates: 2.70 EUR (bis 31.10.2026), 4.50 EUR (ab 01.11.2026)
 * depending on date, loaded from the kurtaxe_rates database table.
 * See positionCalculator.ts and utility-costs/calculations.ts.
 * NOT imported anywhere in the codebase.
 */
export const KURTAXE_PER_ADULT_PER_NIGHT = 3.10;

/**
 * Default cleaning cost
 * @deprecated Hardcoded at 85 EUR. Current cleaning costs are 100/125 EUR
 * as defined in financeCalculations.ts.
 * NOT imported anywhere in the codebase.
 */
export const DEFAULT_CLEANING_COST = 85;

/**
 * Calculate commission (Provision) for Malte & Eike
 * Always 10% of the rental price (payout received)
 * @deprecated Uses simple rentalPrice * 0.10 formula. Modern commission is
 * mieterlos * 0.10 (see financeCalculations.ts). Referenced in README.md
 * as an example but NOT imported by any component.
 */
export function calculateCommission(rentalPrice: number): number {
  return rentalPrice * COMMISSION_RATE;
}

/**
 * Calculate tourist tax (Kurtaxe)
 * @deprecated Uses hardcoded 3.10 EUR/adult/night. Modern Kurtaxe uses
 * date-range-based rates from the kurtaxe_rates table. See
 * calculateKurtaxeWithDateRates() in utility-costs/calculations.ts and
 * calculateKurtaxeFromDBRates() in positionCalculator.ts.
 * NOT imported anywhere in the codebase (other files define their own versions).
 */
export function calculateKurtaxe(adults: number, nights: number): number {
  return adults * nights * KURTAXE_PER_ADULT_PER_NIGHT;
}

/**
 * Calculate number of nights from arrival and departure dates
 * @deprecated Thin wrapper around nightsBetween(). Other files define their
 * own calculateNights() locally (helpers.ts, import-guests/route.ts,
 * GuestOverviewTab.tsx). NOT imported from this file anywhere.
 */
export function calculateNights(arrivalDate: string, departureDate: string): number {
  return nightsBetween(arrivalDate, departureDate);
}

/**
 * Calculate utility costs breakdown
 * @deprecated Legacy interface using simple per-night/per-person flat rates.
 * Modern code uses BookingCostResult from utility-costs/calculations.ts
 * with seasonal/weekly rates. NOT imported anywhere in the codebase.
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

/**
 * @deprecated Legacy settings interface for flat per-night/per-person rates.
 * Modern pricing uses PricingSettings from utility-costs/calculations.ts.
 * NOT imported anywhere in the codebase.
 */
export interface UtilityCostSettings {
  holzPerNight: number;
  wasserPerPerson: number;
  muellPerNight: number;
  stromPerNight: number;
  cleaningCost: number;
}

/**
 * @deprecated Legacy default utility settings with outdated flat rates
 * (e.g. cleaningCost: 85). Modern defaults are in financeCalculations.ts
 * and utility-costs/calculations.ts. NOT imported anywhere in the codebase.
 */
export const DEFAULT_UTILITY_SETTINGS: UtilityCostSettings = {
  holzPerNight: 5,
  wasserPerPerson: 3,
  muellPerNight: 2,
  stromPerNight: 8,
  cleaningCost: DEFAULT_CLEANING_COST,
};

/**
 * Calculate utility costs for a booking
 * @deprecated Uses simple flat per-night/per-person rates. Modern code uses
 * calculateUtilityCostsForBooking() from utility-costs/calculations.ts which
 * supports seasonal/weekly rates. NOT imported anywhere in the codebase.
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
 * @deprecated Uses legacy calculateCommission (rentalPrice * 0.10) and legacy
 * UtilityCostsBreakdown. Modern Mietertrag calculation is in
 * financeCalculations.ts. NOT imported anywhere in the codebase.
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
 * @deprecated Simple percentage-based deposit calculation.
 * NOT imported anywhere in the codebase.
 */
export function calculateDeposit(rentalPrice: number, percentage = 0.3): number {
  return Math.round(rentalPrice * percentage);
}

/**
 * Calculate remaining payment after deposit
 * @deprecated Simple subtraction helper.
 * NOT imported anywhere in the codebase.
 */
export function calculateRemainingPayment(rentalPrice: number, depositAmount: number): number {
  return rentalPrice - depositAmount;
}

/**
 * Group bookings by quarter
 * @deprecated Generic utility that may still be useful but is NOT imported
 * anywhere in the codebase. Consider moving to a general-purpose utils file
 * if needed in new code.
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
 * @deprecated Generic utility that may still be useful but is NOT imported
 * anywhere in the codebase. Consider moving to a general-purpose utils file
 * if needed in new code.
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
 * @deprecated Uses legacy calculateUtilityCosts and calculateMietertrag
 * with outdated rates. NOT imported anywhere in the codebase.
 */
export interface BookingTotals {
  totalRentalPrice: number;
  totalCommission: number;
  totalUtilityCosts: number;
  totalMietertrag: number;
  bookingCount: number;
  totalNights: number;
}

/**
 * @deprecated Uses legacy calculateUtilityCosts and calculateMietertrag
 * with outdated rates. NOT imported anywhere in the codebase.
 */
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
 * @deprecated Generic utility, NOT imported anywhere in the codebase.
 * Use Math.round(value * 100) / 100 directly or move to a shared utils file.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Clamp a value between min and max
 * @deprecated Generic utility, NOT imported anywhere in the codebase.
 * Use Math.min(Math.max(value, min), max) directly or move to a shared utils file.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
