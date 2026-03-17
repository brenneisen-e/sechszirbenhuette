/**
 * Types for the dynamic booking positions system
 */

export type PositionCategory = 'nk' | 'reinigung' | 'kurtaxe' | 'komfortpaket' | 'gebuehr' | 'custom' | string;
export type PositionType = 'income' | 'expense';
export type PaidBy = 'guest_platform' | 'guest_cash' | 'guest_direct' | 'owner' | 'included_payout';

/**
 * Dynamic position category from DB (position_categories table)
 */
export interface PositionCategoryRecord {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at?: string;
}

/**
 * Dynamic category group for finance results
 * Used in byCategory - keys are dynamic, NOT hardcoded
 */
export interface CategoryGroup {
  category: { id: number; name: string; icon: string | null } | null;
  positions: ResolvedPosition[];
  total: number;
}

export interface BookingPosition {
  id?: number;
  booking_id: number;
  name: string;
  category: PositionCategory;
  type: PositionType;
  amount: number;
  paid_by: PaidBy;
  paid: boolean;
  affects_mieterlos: boolean;
  affects_gewinn: boolean;
  show_separate: boolean;
  auto_calculate: boolean;
  calc_rule: CalcRule | null;
  sort_order: number;
  notes: string | null;
}

export interface ResolvedPosition extends BookingPosition {
  /** The final computed amount (either manual or auto-calculated) */
  resolvedAmount: number;
  /** Description of how the amount was calculated (for auto-calc positions) */
  calcDescription?: string;
}

// Calculation rules for auto-calculated positions
export type CalcRule =
  | { type: 'kurtaxe'; params: { minAge?: number } }
  | { type: 'nk_strom'; params: Record<string, never> }
  | { type: 'nk_wasser'; params: Record<string, never> }
  | { type: 'nk_muell'; params: Record<string, never> }
  | { type: 'nk_holz'; params: Record<string, never> }
  | { type: 'reinigung'; params: { base?: number; dogSurcharge?: number } }
  | { type: 'komfortpaket_income'; params: { pricePerPerson?: number } }
  | { type: 'komfortpaket_cost'; params: { costPerPerson?: number } }
  | { type: 'fixed'; params: { amount: number } }
  | { type: 'per_person'; params: { pricePerPerson: number; countChildren?: boolean } }
  | { type: 'per_night'; params: { pricePerNight: number } }
  | { type: 'per_person_per_night'; params: { price: number; minAge?: number } };

export interface PositionTemplate {
  id?: number;
  name: string;
  category: PositionCategory;
  type: PositionType;
  default_amount: number;
  default_paid_by: PaidBy;
  affects_mieterlos: boolean;
  affects_gewinn: boolean;
  show_separate: boolean;
  auto_calculate: boolean;
  calc_rule: CalcRule | null;
  applies_to_platforms: string | null;
  is_default: boolean;
  sort_order: number;
}

export interface KurtaxeRate {
  id?: number;
  valid_from: string;
  valid_to: string | null;
  rate_per_person_per_day: number;
  min_age: number;
}

export interface PayoutTrackingEntry {
  id?: number;
  booking_id: number;
  expected_date: string | null;
  expected_amount: number | null;
  received: boolean;
  received_date: string | null;
  payment_type: 'payout' | 'anzahlung' | 'restzahlung' | 'direct_transfer';
  notes: string | null;
}

// DB record types (with 0/1 integers instead of booleans)
export interface BookingPositionRecord {
  id: number;
  booking_id: number;
  name: string;
  category: string;
  type: string;
  amount: number;
  paid_by: string;
  paid: number;
  affects_mieterlos: number;
  affects_gewinn: number;
  show_separate: number;
  auto_calculate: number;
  calc_rule: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert DB record to typed BookingPosition
 */
export function recordToPosition(record: BookingPositionRecord): BookingPosition {
  let calcRule: CalcRule | null = null;
  if (record.calc_rule) {
    try {
      calcRule = JSON.parse(record.calc_rule) as CalcRule;
    } catch { /* ignore */ }
  }

  return {
    id: record.id,
    booking_id: record.booking_id,
    name: record.name,
    category: record.category as PositionCategory,
    type: record.type as PositionType,
    amount: record.amount,
    paid_by: record.paid_by as PaidBy,
    paid: record.paid === 1,
    affects_mieterlos: record.affects_mieterlos === 1,
    affects_gewinn: record.affects_gewinn === 1,
    show_separate: record.show_separate === 1,
    auto_calculate: record.auto_calculate === 1,
    calc_rule: calcRule,
    sort_order: record.sort_order,
    notes: record.notes,
  };
}

/**
 * Convert BookingPosition to DB-compatible record for API calls
 */
export function positionToRecord(pos: BookingPosition): Partial<BookingPositionRecord> {
  return {
    id: pos.id,
    booking_id: pos.booking_id,
    name: pos.name,
    category: pos.category,
    type: pos.type,
    amount: pos.amount,
    paid_by: pos.paid_by,
    paid: pos.paid ? 1 : 0,
    affects_mieterlos: pos.affects_mieterlos ? 1 : 0,
    affects_gewinn: pos.affects_gewinn ? 1 : 0,
    show_separate: pos.show_separate ? 1 : 0,
    auto_calculate: pos.auto_calculate ? 1 : 0,
    calc_rule: pos.calc_rule ? JSON.stringify(pos.calc_rule) : null,
    sort_order: pos.sort_order,
    notes: pos.notes,
  };
}

/**
 * Labels for paid_by values
 */
export const PAID_BY_LABELS: Record<PaidBy, string> = {
  guest_platform: 'in Payout',
  guest_cash: 'bar',
  guest_direct: 'überwiesen',
  owner: 'Vermieter',
  included_payout: 'in Payout',
};

/**
 * Category labels
 */
export const CATEGORY_LABELS: Record<PositionCategory, string> = {
  nk: 'Nebenkosten',
  reinigung: 'Reinigung',
  kurtaxe: 'Kurtaxe',
  komfortpaket: 'Komfortpaket',
  gebuehr: 'Gebühren',
  custom: 'Sonstige',
};
