// Types for UtilityCostsCalculator

// Kurtaxe rate period for date-based rates
export interface KurtaxeRatePeriod {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  rate: number;
}

export interface PricingSettings {
  kurtaxe: number;
  kurtaxeRates?: KurtaxeRatePeriod[];
  holz: number;
  water: number;
  trash: number;
  electricity: number;
  reinigung: number;
}

export interface CostBreakdown {
  kurtaxe: number;
  holz: number;
  water: number;
  trash: number;
  electricity: number;
  electricityKwh: number;
  reinigung: number;
  total: number;
}

export interface CostBreakdownWithDetails extends CostBreakdown {
  holzBuendel: number;
  trashBags: number;
}

// Detailed breakdown for display
export interface CostBreakdownDetailed {
  kurtaxe: number;
  kurtaxeDetails: string;
  holz: number;
  holzBuendel: number;
  water: number;
  trash: number;
  trashBags: number;
  electricity: number;
  electricityKwh: number;
  reinigung: number;
}

export type AdultsCount = 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Season = 'summer' | 'winter';
export type WeeksCount = 1 | 2;

export interface SeasonConfig {
  name: string;
  months: string;
  icon: React.ComponentType<{ className?: string }>;
  weeks: {
    [key in WeeksCount]: {
      holzBuendel: number;
      trashBags: { [key in AdultsCount]: number };
      electricityIncluded: { [key in AdultsCount]: number };
    };
  };
}

export interface BookingCostResult {
  costs: number;
  kurtaxe: number;
  kurtaxeDetails: string;
  reinigung: number;
  season: Season;
  weeks: number;
  days: number;
  details: string;
  breakdown: CostBreakdownDetailed;
}
