// Constants for ExpensePanel component

import type { PricingSettings } from './types';

// Kurtaxe: 2,70€ bis 31.10.2026, ab 01.11.2026 dann 4,50€
export const DEFAULT_SETTINGS: PricingSettings = {
  kurtaxe_rate: 2.70,
  kurtaxe_rates: [
    { from: '2024-01-01', to: '2024-12-31', rate: 2.70 },
    { from: '2025-01-01', to: '2025-12-31', rate: 2.70 },
    { from: '2026-01-01', to: '2026-10-31', rate: 2.70 },
    { from: '2026-11-01', to: '2099-12-31', rate: 4.50 }
  ],
  holz_rate: 9.00,
  water_rate: 7.00,
  trash_rate: 11.00,
  electricity_rate: 0.55,
  commission_rate: 0.10,
  reinigung_rate: 100.00,
};

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

export const FULL_MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Categories that are calculated automatically from bookings
export const CALCULATED_CATEGORIES = ['Malte & Eike (Provision)', 'Ortstaxe'];
