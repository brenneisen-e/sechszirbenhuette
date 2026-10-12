// Constants for ExpensePanel component

import type { PricingSettings } from './types';

// Kurtaxe: 2,70€ bis 31.10.2026, ab 01.11.2026 dann 4,50€
export const DEFAULT_SETTINGS: PricingSettings = {
  kurtaxe_rate: 2.7,
  kurtaxe_rates: [
    { from: '2024-01-01', to: '2024-12-31', rate: 2.7 },
    { from: '2025-01-01', to: '2025-12-31', rate: 2.7 },
    { from: '2026-01-01', to: '2026-10-31', rate: 2.7 },
    { from: '2026-11-01', to: '2099-12-31', rate: 4.5 },
  ],
  holz_rate: 9.0,
  water_rate: 7.0,
  trash_rate: 11.0,
  electricity_rate: 0.55,
  commission_rate: 0.1,
  reinigung_rate: 100.0,
};

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

export const FULL_MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

// Categories that are calculated automatically from bookings
export const CALCULATED_CATEGORIES = ['Malte & Eike (Provision)', 'Ortstaxe'];
