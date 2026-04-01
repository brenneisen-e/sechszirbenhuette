import { Sun, Snowflake } from 'lucide-react';
import type { AdultsCount, WeeksCount } from './types';

// Default pricing constants (can be overridden by settings)
// Kurtaxe: 2,70€ bis 31.10.2026, ab 01.11.2026 dann 4,50€ pro Person/Nacht
export const DEFAULT_PRICING = {
  kurtaxe: 2.7, // € per day per adult (Fallback wenn keine Perioden greifen)
  kurtaxeRates: [
    { from: '2024-01-01', to: '2025-12-31', rate: 2.7 },
    { from: '2026-01-01', to: '2026-10-31', rate: 2.7 },
    { from: '2026-11-01', to: '2099-12-31', rate: 4.5 },
  ],
  holz: 9.0, // € per Sack (Pellets)
  water: 7.0, // € per person per week
  trash: 11.0, // € per bag
  electricity: 0.55, // € per kWh
  reinigung: 100.0, // € per booking
};

// Configuration for seasons and durations (supports 2-5 people)
export const CONFIG = {
  summer: {
    name: 'Sommer',
    months: 'Mai bis Oktober',
    icon: Sun,
    weeks: {
      1: {
        holzBuendel: 3, // Pellets im Sommer
        trashBags: { 2: 1, 3: 1, 4: 2, 5: 2 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 150, 3: 150, 4: 200, 5: 250 } as {
          [key in AdultsCount]: number;
        },
      },
      2: {
        holzBuendel: 6,
        trashBags: { 2: 2, 3: 2, 4: 4, 5: 4 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 300, 3: 300, 4: 400, 5: 500 } as {
          [key in AdultsCount]: number;
        },
      },
    },
  },
  winter: {
    name: 'Winter',
    months: 'November bis April',
    icon: Snowflake,
    weeks: {
      1: {
        holzBuendel: 6, // Pellets im Winter
        trashBags: { 2: 1, 3: 1, 4: 2, 5: 2 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 250, 3: 250, 4: 300, 5: 350 } as {
          [key in AdultsCount]: number;
        },
      },
      2: {
        holzBuendel: 12,
        trashBags: { 2: 2, 3: 2, 4: 4, 5: 4 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 500, 3: 500, 4: 500, 5: 600 } as {
          [key in AdultsCount]: number;
        },
      },
    },
  },
} as const;

// Gerundete Nebenkosten pro Woche/Personenzahl (2-5 Personen, Kurtaxe 2,70€ bis 31.10.2026, danach 4,50€)
export const WALLI_VALUES: {
  [season in 'summer' | 'winter']: { [weeks in WeeksCount]: { [adults in AdultsCount]: number } };
} = {
  summer: {
    1: { 2: 170, 3: 195, 4: 260, 5: 315 },
    2: { 2: 340, 3: 390, 4: 515, 5: 630 },
  },
  winter: {
    1: { 2: 252, 3: 277, 4: 340, 5: 395 },
    2: { 2: 505, 3: 560, 4: 630, 5: 740 },
  },
};

// Adults count options for iteration
export const ADULTS_OPTIONS: AdultsCount[] = [2, 3, 4, 5];
