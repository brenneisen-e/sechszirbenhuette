/**
 * Position Calculator
 *
 * Resolves auto-calculated positions based on booking data and pricing settings.
 * This is the computation layer for the dynamic position system.
 */

import type { BookingPosition, ResolvedPosition, CalcRule, KurtaxeRate } from '@/lib/types/positions';
import { DEFAULT_PRICING } from '@/components/admin/utility-costs/constants';
import { calcStrom, calcWasser, calcMuell, calcHolz } from '@/components/admin/utility-costs/calculations';
import type { PricingSettings, Season, AdultsCount } from '@/components/admin/utility-costs/types';

/** Format number in German locale for display in descriptions */
const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export interface PositionCalcContext {
  arrivalDate: string | null;
  departureDate: string | null;
  adults: number;
  children: number;
  childrenAges: number[];
  hasDog: boolean;
  isPrivate: boolean;
  platform: string | null;
  pricingSettings?: PricingSettings;
  kurtaxeRates?: KurtaxeRate[];
  komfortpaketPersons?: number;
  komfortpaketGuestPaid?: boolean;
}

/**
 * Resolve all positions: compute auto-calculated amounts
 */
export function resolvePositions(
  positions: BookingPosition[],
  context: PositionCalcContext
): ResolvedPosition[] {
  return positions.map(pos => resolvePosition(pos, context));
}

/**
 * Resolve a single position
 */
function resolvePosition(
  pos: BookingPosition,
  ctx: PositionCalcContext
): ResolvedPosition {
  if (!pos.auto_calculate || !pos.calc_rule) {
    return {
      ...pos,
      resolvedAmount: pos.amount,
    };
  }

  const { amount, description } = calculateFromRule(pos.calc_rule, ctx);

  return {
    ...pos,
    resolvedAmount: amount,
    calcDescription: description,
  };
}

/**
 * Calculate amount from a calc_rule
 */
function calculateFromRule(
  rule: CalcRule,
  ctx: PositionCalcContext
): { amount: number; description: string } {
  const { days, weeks, season, cappedAdults } = getBookingMetrics(ctx);

  switch (rule.type) {
    case 'kurtaxe':
      return calculateKurtaxe(ctx, days, rule.params.minAge ?? 16);

    case 'nk_strom':
      return calculateStrom(ctx, weeks, season, cappedAdults);

    case 'nk_wasser':
      return calculateWasser(ctx, weeks, cappedAdults);

    case 'nk_muell':
      return calculateMuell(ctx, weeks, season, cappedAdults);

    case 'nk_holz':
      return calculateHolz(ctx, weeks, season);

    case 'reinigung': {
      const base = rule.params.base ?? 100;
      const surcharge = ctx.hasDog ? (rule.params.dogSurcharge ?? 25) : 0;
      const amount = base + surcharge;
      const desc = ctx.hasDog
        ? `${base} € + ${surcharge} € (Hund)`
        : `${base} €`;
      return { amount, description: desc };
    }

    case 'komfortpaket_income': {
      const persons = ctx.komfortpaketPersons ?? 0;
      const pricePerPerson = rule.params.pricePerPerson ?? 25;
      const amount = ctx.komfortpaketGuestPaid ? persons * pricePerPerson : 0;
      return {
        amount,
        description: `${persons} Pers. × ${fmtNum(pricePerPerson)} €`,
      };
    }

    case 'komfortpaket_cost': {
      const persons = ctx.komfortpaketPersons ?? 0;
      const costPerPerson = rule.params.costPerPerson ?? 16;
      return {
        amount: persons * costPerPerson,
        description: `${persons} Pers. × ${fmtNum(costPerPerson)} €`,
      };
    }

    case 'fixed':
      return {
        amount: rule.params.amount,
        description: `Festbetrag: ${fmtNum(rule.params.amount)} €`,
      };

    case 'per_person': {
      const persons = rule.params.countChildren
        ? ctx.adults + ctx.children
        : ctx.adults;
      const amount = persons * rule.params.pricePerPerson;
      return {
        amount,
        description: `${persons} Pers. × ${fmtNum(rule.params.pricePerPerson)} €`,
      };
    }

    case 'per_night':
      return {
        amount: days * rule.params.pricePerNight,
        description: `${days} Nächte × ${fmtNum(rule.params.pricePerNight)} €`,
      };

    case 'per_person_per_night': {
      const minAge = rule.params.minAge ?? 0;
      const qualifyingChildren = ctx.childrenAges.filter(a => a >= minAge).length;
      const persons = ctx.adults + qualifyingChildren;
      const amount = persons * days * rule.params.price;
      return {
        amount,
        description: `${persons} Pers. × ${days} Nächte × ${fmtNum(rule.params.price)} €`,
      };
    }

    default:
      return { amount: 0, description: 'Unbekannte Berechnungsregel' };
  }
}

// ============================================================================
// Individual NK calculation functions
// ============================================================================

function getBookingMetrics(ctx: PositionCalcContext) {
  if (!ctx.arrivalDate || !ctx.departureDate) {
    return { days: 0, weeks: 0, season: 'summer' as Season, cappedAdults: 2 as AdultsCount };
  }

  const arrival = new Date(ctx.arrivalDate);
  const departure = new Date(ctx.departureDate);
  const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = days / 7;
  const month = arrival.getMonth() + 1;
  const season: Season = month >= 5 && month <= 10 ? 'summer' : 'winter';
  const cappedAdults = Math.min(8, Math.max(2, ctx.adults)) as AdultsCount;

  return { days, weeks, season, cappedAdults };
}

function calculateKurtaxe(
  ctx: PositionCalcContext,
  days: number,
  minAge: number
): { amount: number; description: string } {
  if (!ctx.arrivalDate || !ctx.departureDate || days === 0) {
    return { amount: 0, description: 'Keine Daten' };
  }

  // Count kurtaxe-paying persons (adults + children >= minAge)
  const qualifyingChildren = ctx.childrenAges.filter(a => a >= minAge).length;
  const persons = Math.min(8, Math.max(1, ctx.adults + qualifyingChildren));

  // Use kurtaxeRates from DB if available, otherwise fall back to pricing settings
  if (ctx.kurtaxeRates && ctx.kurtaxeRates.length > 0) {
    return calculateKurtaxeFromDBRates(ctx.arrivalDate, ctx.departureDate, persons, ctx.kurtaxeRates);
  }

  // Fall back to pricing settings
  const pricing = ctx.pricingSettings || { ...DEFAULT_PRICING };

  if (pricing.kurtaxeRates && pricing.kurtaxeRates.length > 0) {
    return calculateKurtaxeWithDateRates(ctx.arrivalDate, ctx.departureDate, persons, pricing);
  }

  // Simple calculation
  const amount = pricing.kurtaxe * days * persons;
  return {
    amount,
    description: `${persons} Pers. × ${days} Nächte × ${fmtNum(pricing.kurtaxe)} €`,
  };
}

function calculateKurtaxeFromDBRates(
  arrivalDate: string,
  departureDate: string,
  persons: number,
  rates: KurtaxeRate[]
): { amount: number; description: string } {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);

  let total = 0;
  const rateCounts = new Map<number, number>();

  const current = new Date(arrival);
  while (current < departure) {
    const dateStr = current.toISOString().split('T')[0];
    const rate = getDBRateForDate(dateStr, rates);
    total += rate * persons;
    rateCounts.set(rate, (rateCounts.get(rate) || 0) + 1);
    current.setDate(current.getDate() + 1);
  }

  let description: string;
  if (rateCounts.size === 1) {
    const rate = Array.from(rateCounts.keys())[0];
    const days = Array.from(rateCounts.values())[0];
    description = `${persons} Pers. × ${days} Nächte × ${fmtNum(rate)} €`;
  } else {
    const parts: string[] = [];
    rateCounts.forEach((dayCount, rate) => {
      parts.push(`${dayCount} Nächte × ${fmtNum(rate)} €`);
    });
    description = `${persons} Pers. (${parts.join(', ')})`;
  }

  return { amount: total, description };
}

function getDBRateForDate(dateStr: string, rates: KurtaxeRate[]): number {
  for (const rate of rates) {
    const from = rate.valid_from;
    const to = rate.valid_to;
    if (dateStr >= from && (!to || dateStr <= to)) {
      return rate.rate_per_person_per_day;
    }
  }
  // Fallback to last known rate
  return rates.length > 0 ? rates[rates.length - 1].rate_per_person_per_day : 2.70;
}

function calculateKurtaxeWithDateRates(
  arrivalDate: string,
  departureDate: string,
  persons: number,
  pricing: PricingSettings
): { amount: number; description: string } {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);

  let total = 0;
  const rateCounts = new Map<number, number>();

  const current = new Date(arrival);
  while (current < departure) {
    const dateStr = current.toISOString().split('T')[0];
    let rate = pricing.kurtaxe;

    if (pricing.kurtaxeRates) {
      for (const period of pricing.kurtaxeRates) {
        if (dateStr >= period.from && dateStr <= period.to) {
          rate = period.rate;
          break;
        }
      }
    }

    total += rate * persons;
    rateCounts.set(rate, (rateCounts.get(rate) || 0) + 1);
    current.setDate(current.getDate() + 1);
  }

  let description: string;
  if (rateCounts.size === 1) {
    const rate = Array.from(rateCounts.keys())[0];
    const days = Array.from(rateCounts.values())[0];
    description = `${persons} Pers. × ${days} Nächte × ${fmtNum(rate)} €`;
  } else {
    const parts: string[] = [];
    rateCounts.forEach((dayCount, rate) => {
      parts.push(`${dayCount} Nächte × ${fmtNum(rate)} €`);
    });
    description = `${persons} Pers. (${parts.join(', ')})`;
  }

  return { amount: total, description };
}

function calculateStrom(
  ctx: PositionCalcContext,
  weeks: number,
  season: Season,
  cappedAdults: AdultsCount
): { amount: number; description: string } {
  const pricing = ctx.pricingSettings || { ...DEFAULT_PRICING };
  const { kwh, amount } = calcStrom(weeks, season, cappedAdults, pricing);
  return { amount, description: `${kwh} kWh × ${fmtNum(pricing.electricity ?? DEFAULT_PRICING.electricity)} €/kWh` };
}

function calculateWasser(
  ctx: PositionCalcContext,
  weeks: number,
  cappedAdults: AdultsCount
): { amount: number; description: string } {
  const pricing = ctx.pricingSettings || { ...DEFAULT_PRICING };
  const amount = calcWasser(weeks, cappedAdults, pricing);
  return { amount, description: `${cappedAdults} Pers. × ${fmtNum(weeks, 1)} Wo. × ${fmtNum(pricing.water ?? DEFAULT_PRICING.water)} €` };
}

function calculateMuell(
  ctx: PositionCalcContext,
  weeks: number,
  season: Season,
  cappedAdults: AdultsCount
): { amount: number; description: string } {
  const pricing = ctx.pricingSettings || { ...DEFAULT_PRICING };
  const { bags, amount } = calcMuell(weeks, season, cappedAdults, pricing);
  return { amount, description: `${bags} Säcke × ${fmtNum(pricing.trash ?? DEFAULT_PRICING.trash)} €` };
}

function calculateHolz(
  ctx: PositionCalcContext,
  weeks: number,
  season: Season
): { amount: number; description: string } {
  const pricing = ctx.pricingSettings || { ...DEFAULT_PRICING };
  const { buendel, amount } = calcHolz(weeks, season, pricing);
  return { amount, description: `${buendel} Bündel × ${fmtNum(pricing.holz ?? DEFAULT_PRICING.holz)} €` };
}

// ============================================================================
// Position aggregation helpers
// ============================================================================

export interface PositionSummary {
  totalExpenses: number;
  totalIncome: number;
  expensesByCategory: Record<string, number>;
  incomesByCategory: Record<string, number>;
  barItems: Array<{ name: string; amount: number }>;
  barTotal: number;
  directItems: Array<{ name: string; amount: number }>;
  directTotal: number;
  separatePositions: ResolvedPosition[];
  mieterlosAffectingExpenses: number;
}

/**
 * Summarize resolved positions into aggregated financial data
 */
export function summarizePositions(positions: ResolvedPosition[]): PositionSummary {
  const expenses = positions.filter(p => p.type === 'expense');
  const incomes = positions.filter(p => p.type === 'income');

  const totalExpenses = expenses.reduce((sum, p) => sum + p.resolvedAmount, 0);
  const totalIncome = incomes.reduce((sum, p) => sum + p.resolvedAmount, 0);

  const expensesByCategory: Record<string, number> = {};
  for (const p of expenses) {
    expensesByCategory[p.category] = (expensesByCategory[p.category] || 0) + p.resolvedAmount;
  }

  const incomesByCategory: Record<string, number> = {};
  for (const p of incomes) {
    incomesByCategory[p.category] = (incomesByCategory[p.category] || 0) + p.resolvedAmount;
  }

  const barItems = positions
    .filter(p => p.paid_by === 'guest_cash')
    .map(p => ({ name: p.name, amount: p.resolvedAmount }));

  const directItems = positions
    .filter(p => p.paid_by === 'guest_direct')
    .map(p => ({ name: p.name, amount: p.resolvedAmount }));

  const separatePositions = positions.filter(p => p.show_separate);

  const mieterlosAffectingExpenses = expenses
    .filter(p => p.affects_mieterlos)
    .reduce((sum, p) => sum + p.resolvedAmount, 0);

  return {
    totalExpenses,
    totalIncome,
    expensesByCategory,
    incomesByCategory,
    barItems,
    barTotal: barItems.reduce((sum, item) => sum + item.amount, 0),
    directItems,
    directTotal: directItems.reduce((sum, item) => sum + item.amount, 0),
    separatePositions,
    mieterlosAffectingExpenses,
  };
}
