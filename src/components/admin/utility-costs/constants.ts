import { Sun, Snowflake } from 'lucide-react';
import type { AdultsCount, WeeksCount } from './types';

// Default pricing constants (can be overridden by settings)
// Kurtaxe: 2,70€ bis 30.04.2026, ab 01.05.2026 dann 4,00€
export const DEFAULT_PRICING = {
  kurtaxe: 2.7, // € per day per adult (current rate until 30.04.2026)
  // Kurtaxe rates: 2.70€ bis 30.04.2026, dann 4.00€ ab 01.05.2026
  kurtaxeRates: [
    // 2024: Ganzjährig 2.70€
    { from: '2024-01-01', to: '2024-12-31', rate: 2.7 },
    // 2025: Ganzjährig 2.70€
    { from: '2025-01-01', to: '2025-12-31', rate: 2.7 },
    // 2026: 2.70€ bis 30.04., dann 4.00€ ab 01.05.
    { from: '2026-01-01', to: '2026-04-30', rate: 2.7 },
    { from: '2026-05-01', to: '2026-12-31', rate: 4.0 },
    // 2027+: 4.00€
    { from: '2027-01-01', to: '2099-12-31', rate: 4.0 },
  ],
  holz: 10.0, // € per Bündel
  water: 7.0, // € per person per week
  trash: 11.0, // € per bag
  electricity: 0.55, // € per kWh
  reinigung: 100.0, // € per booking
};

// Configuration for seasons and durations (supports 2-8 people)
export const CONFIG = {
  summer: {
    name: 'Sommer',
    months: 'Mai bis Oktober',
    icon: Sun,
    weeks: {
      1: {
        holzBuendel: 2, // Weniger Holz im Sommer
        trashBags: { 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3, 8: 4 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 150, 3: 150, 4: 200, 5: 250, 6: 300, 7: 350, 8: 400 } as {
          [key in AdultsCount]: number;
        },
      },
      2: {
        holzBuendel: 4,
        trashBags: { 2: 2, 3: 2, 4: 4, 5: 4, 6: 6, 7: 6, 8: 8 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 300, 3: 300, 4: 400, 5: 500, 6: 600, 7: 700, 8: 800 } as {
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
        holzBuendel: 5, // Mehr Holz im Winter
        trashBags: { 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3, 8: 4 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 250, 3: 250, 4: 300, 5: 350, 6: 400, 7: 450, 8: 500 } as {
          [key in AdultsCount]: number;
        },
      },
      2: {
        holzBuendel: 10,
        trashBags: { 2: 2, 3: 2, 4: 4, 5: 4, 6: 6, 7: 6, 8: 8 } as { [key in AdultsCount]: number },
        electricityIncluded: { 2: 500, 3: 500, 4: 500, 5: 600, 6: 700, 7: 800, 8: 900 } as {
          [key in AdultsCount]: number;
        },
      },
    },
  },
} as const;

// Gerundete Nebenkosten pro Woche/Personenzahl (2-8 Personen, Kurtaxe aktuell 2,70€)
export const WALLI_VALUES: {
  [season in 'summer' | 'winter']: { [weeks in WeeksCount]: { [adults in AdultsCount]: number } };
} = {
  summer: {
    1: { 2: 190, 3: 220, 4: 295, 5: 345, 6: 400, 7: 455, 8: 510 },
    2: { 2: 375, 3: 445, 4: 590, 5: 690, 6: 800, 7: 910, 8: 1020 },
  },
  winter: {
    1: { 2: 270, 3: 305, 4: 375, 5: 430, 6: 490, 7: 550, 8: 610 },
    2: { 2: 535, 3: 610, 4: 710, 5: 820, 6: 940, 7: 1060, 8: 1180 },
  },
};

// Adults count options for iteration
export const ADULTS_OPTIONS: AdultsCount[] = [2, 3, 4, 5, 6, 7, 8];
