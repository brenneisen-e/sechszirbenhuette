import { CONFIG, DEFAULT_PRICING } from './constants';

/** Format number in German locale for display in descriptions */
const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
import type {
  PricingSettings,
  CostBreakdown,
  CostBreakdownWithDetails,
  CostBreakdownDetailed,
  AdultsCount,
  Season,
  WeeksCount,
  BookingCostResult,
} from './types';

// Re-export types for external consumers
export type { BookingCostResult };

// Get Kurtaxe rate for a specific date
export function getKurtaxeRateForDate(date: Date, pricing: PricingSettings): number {
  if (!pricing.kurtaxeRates || pricing.kurtaxeRates.length === 0) {
    return pricing.kurtaxe;
  }

  const dateStr = date.toISOString().split('T')[0] ?? '';

  // Exact match: date falls within a defined period
  for (const period of pricing.kurtaxeRates) {
    if (dateStr >= period.from && dateStr <= period.to) {
      return period.rate;
    }
  }

  // Gap handling: no exact match found — find the temporally nearest rate.
  // This covers gaps between valid_to of one period and valid_from of the next.
  // Log a warning so admins notice and can fix the gap in kurtaxe_rates.
  let nearestRate = pricing.kurtaxe;
  let smallestGap = Infinity;
  const dateMs = date.getTime();

  for (const period of pricing.kurtaxeRates) {
    const fromMs = new Date(period.from).getTime();
    const toMs = new Date(period.to).getTime();
    const gapToFrom = Math.abs(dateMs - fromMs);
    const gapToTo = Math.abs(dateMs - toMs);
    const minGap = Math.min(gapToFrom, gapToTo);

    if (minGap < smallestGap) {
      smallestGap = minGap;
      nearestRate = period.rate;
    }
  }

  console.warn(
    `[Kurtaxe] Kein Satz fuer Datum ${dateStr} gefunden — Luecke in kurtaxe_rates. ` +
    `Verwende naechsten Satz (${nearestRate} EUR). Bitte Kurtaxe-Saetze pruefen.`
  );

  return nearestRate;
}

// Calculate Kurtaxe with date-based rates (handles rate changes during booking)
export function calculateKurtaxeWithDateRates(
  arrivalDate: string,
  departureDate: string,
  adults: number,
  pricing: PricingSettings
): { kurtaxe: number; kurtaxeDetails: string } {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));

  if (!pricing.kurtaxeRates || pricing.kurtaxeRates.length === 0) {
    // Simple calculation with single rate
    const kurtaxe = pricing.kurtaxe * days * adults;
    return {
      kurtaxe,
      kurtaxeDetails: `${adults} Erw. × ${days} Nächte × ${fmtNum(pricing.kurtaxe)} €`,
    };
  }

  // Calculate day by day if we have rate periods
  let totalKurtaxe = 0;
  const rateCounts: Map<number, number> = new Map();

  const currentDate = new Date(arrival);
  while (currentDate < departure) {
    const rate = getKurtaxeRateForDate(currentDate, pricing);
    totalKurtaxe += rate * adults;
    rateCounts.set(rate, (rateCounts.get(rate) || 0) + 1);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Build details string
  let details: string;
  if (rateCounts.size === 1) {
    const rate = Array.from(rateCounts.keys())[0] ?? 0;
    details = `${adults} Erw. × ${days} Nächte × ${fmtNum(rate)} €`;
  } else {
    const parts: string[] = [];
    rateCounts.forEach((dayCount, rate) => {
      parts.push(`${dayCount} Nächte × ${fmtNum(rate)} €`);
    });
    details = `${adults} Erw. (${parts.join(', ')})`;
  }

  return { kurtaxe: totalKurtaxe, kurtaxeDetails: details };
}

// Calculate utility costs for any booking (day-level calculation)
export function calculateUtilityCostsForBooking(
  arrivalDate: string,
  departureDate: string,
  adults: number,
  pricing?: PricingSettings,
  hasDog?: boolean,
  childrenAges?: number[] // Optional: ages of children for Kurtaxe calculation
): BookingCostResult {
  const prices = pricing || { ...DEFAULT_PRICING };
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = days / 7; // Keep as decimal for proportional calculation

  // Determine season based on arrival month (May-Oct = summer, Nov-Apr = winter)
  const month = arrival.getMonth() + 1; // 1-12
  const season: Season = month >= 5 && month <= 10 ? 'summer' : 'winter';

  // Cap adults at 8 for calculation, minimum 2
  const cappedAdults = Math.min(8, Math.max(2, adults)) as AdultsCount;

  // Kurtaxe: Count adults + children >= 16 years
  // Children under 16 are exempt from Kurtaxe
  const kurtaxePayingChildren = childrenAges ? childrenAges.filter(age => age >= 16).length : 0;
  const kurtaxePayingPersons = Math.min(8, Math.max(1, adults + kurtaxePayingChildren));

  // Calculate Kurtaxe with date-based rates (using kurtaxe-paying persons)
  const { kurtaxe, kurtaxeDetails } = calculateKurtaxeWithDateRates(arrivalDate, departureDate, kurtaxePayingPersons, prices);

  // Reinigungskosten (cleaning) per booking - fixed cost: 100€ base + 25€ if dog
  const reinigungBase = 100;
  const reinigungHund = hasDog ? 25 : 0;
  const reinigung = reinigungBase + reinigungHund;

  // Day-based calculation for all cost positions
  const config = CONFIG[season].weeks[1]; // Use weekly config as base

  // Holz: proportional to days (base: 2 Bündel/week summer, 5 Bündel/week winter)
  const holzBuendelPerWeek = season === 'summer' ? 3 : 6;
  const holzBuendel = Math.ceil(holzBuendelPerWeek * weeks);
  const holz = prices.holz * holzBuendel;

  // Water: per person per week, proportional to days
  const water = prices.water * cappedAdults * weeks;

  // Trash: proportional to days (use weekly config as base)
  const trashBagsPerWeek = config.trashBags[cappedAdults];
  const trashBags = Math.ceil(trashBagsPerWeek * weeks);
  const trash = prices.trash * trashBags;

  // Electricity: included kWh proportional to days
  const electricityKwhPerWeek = config.electricityIncluded[cappedAdults];
  const electricityKwh = Math.round(electricityKwhPerWeek * weeks);
  const electricity = prices.electricity * electricityKwh;

  // Total costs (excluding Kurtaxe which is shown separately)
  const costs = holz + water + trash + electricity + reinigung;

  const seasonName = season === 'summer' ? 'Sommer' : 'Winter';
  const roundedWeeks = Math.round(weeks * 10) / 10; // Round to 1 decimal
  const details = `${days} Tage (${roundedWeeks} Wo.), ${cappedAdults} Erw., ${seasonName}`;

  const breakdown: CostBreakdownDetailed = {
    kurtaxe,
    kurtaxeDetails,
    holz,
    holzBuendel,
    water,
    trash,
    trashBags,
    electricity,
    electricityKwh,
    reinigung,
  };

  return { costs, kurtaxe, kurtaxeDetails, reinigung, season, weeks: roundedWeeks, days, details, breakdown };
}

// Calculate costs for standard weeks
export function calculateCosts(
  season: Season,
  weeks: WeeksCount,
  adults: AdultsCount,
  pricing: PricingSettings
): CostBreakdown {
  const config = CONFIG[season].weeks[weeks];
  const days = weeks * 7;

  const electricityKwh = config.electricityIncluded[adults];
  const kurtaxe = pricing.kurtaxe * days * adults;
  const holz = pricing.holz * config.holzBuendel;
  const water = pricing.water * adults * weeks;
  const trash = pricing.trash * config.trashBags[adults];
  const electricity = pricing.electricity * electricityKwh;
  const reinigung = pricing.reinigung || DEFAULT_PRICING.reinigung;

  return {
    kurtaxe,
    holz,
    water,
    trash,
    electricity,
    electricityKwh,
    reinigung,
    total: kurtaxe + holz + water + trash + electricity + reinigung,
  };
}

// Calculate costs for arbitrary number of days (proportional calculation)
export function calculateCostsForDays(
  season: Season,
  days: number,
  adults: AdultsCount,
  pricing: PricingSettings
): CostBreakdownWithDetails {
  const weeks = days / 7; // Keep as decimal for proportional calculation
  const config = CONFIG[season].weeks[1]; // Use weekly config as base

  // Holz: proportional to days (base: 2 Bündel/week summer, 5 Bündel/week winter)
  const holzBuendelPerWeek = season === 'summer' ? 3 : 6;
  const holzBuendel = Math.ceil(holzBuendelPerWeek * weeks);
  const holz = pricing.holz * holzBuendel;

  // Water: per person per week, proportional to days
  const water = pricing.water * adults * weeks;

  // Trash: proportional to days (use weekly config as base)
  const trashBagsPerWeek = config.trashBags[adults];
  const trashBags = Math.ceil(trashBagsPerWeek * weeks);
  const trash = pricing.trash * trashBags;

  // Electricity: included kWh proportional to days
  const electricityKwhPerWeek = config.electricityIncluded[adults];
  const electricityKwh = Math.round(electricityKwhPerWeek * weeks);
  const electricity = pricing.electricity * electricityKwh;

  // Kurtaxe: per day per person
  const kurtaxe = pricing.kurtaxe * days * adults;

  // Reinigung: fixed per booking
  const reinigung = pricing.reinigung || DEFAULT_PRICING.reinigung;

  return {
    kurtaxe,
    holz,
    water,
    trash,
    electricity,
    electricityKwh,
    reinigung,
    total: kurtaxe + holz + water + trash + electricity + reinigung,
    holzBuendel,
    trashBags,
  };
}

// ============================================================================
// Shared NK calculation primitives (used by both calculations.ts and positionCalculator.ts)
// ============================================================================

export function calcHolz(weeks: number, season: Season, pricing: PricingSettings): { buendel: number; amount: number } {
  const buendelPerWeek = season === 'summer' ? 3 : 6;
  const buendel = Math.ceil(buendelPerWeek * weeks);
  return { buendel, amount: (pricing.holz ?? DEFAULT_PRICING.holz) * buendel };
}

export function calcWasser(weeks: number, cappedAdults: AdultsCount, pricing: PricingSettings): number {
  return (pricing.water ?? DEFAULT_PRICING.water) * cappedAdults * weeks;
}

export function calcMuell(weeks: number, season: Season, cappedAdults: AdultsCount, pricing: PricingSettings): { bags: number; amount: number } {
  const config = CONFIG[season].weeks[1];
  const bagsPerWeek = config.trashBags[cappedAdults];
  const bags = Math.ceil(bagsPerWeek * weeks);
  return { bags, amount: (pricing.trash ?? DEFAULT_PRICING.trash) * bags };
}

export function calcStrom(weeks: number, season: Season, cappedAdults: AdultsCount, pricing: PricingSettings): { kwh: number; amount: number } {
  const config = CONFIG[season].weeks[1];
  const kwhPerWeek = config.electricityIncluded[cappedAdults];
  const kwh = Math.round(kwhPerWeek * weeks);
  return { kwh, amount: (pricing.electricity ?? DEFAULT_PRICING.electricity) * kwh };
}
