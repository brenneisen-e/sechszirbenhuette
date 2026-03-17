// Shared types for FinanceOverview components

export interface FinanceGuest {
  id: number;
  guest_name: string;
  booking_number: string | null;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages?: string | null; // Comma-separated ages for Kurtaxe calculation (only >= 16 pay)

  // === FINANCIAL DATA - ONLY FROM BOOKINGS TABLE ===
  // All financial calculations use booking_additional_costs JSON
  rental_price: number;  // From bookings.rental_price
  booking_additional_costs?: string | null;  // JSON with payout_amount, fees, etc.
  utilities_cash?: number;  // From bookings.utilities_cash
  cleaning_cash?: number;   // From bookings.cleaning_cash
  kurtaxe_cash?: number;    // From bookings.kurtaxe_cash

  // === DEPRECATED - NOT USED FOR CALCULATIONS ===
  // These fields exist in guests table but are NOT used for financial calculations
  // They are kept for backwards compatibility but should not be relied upon
  /** @deprecated Use calculateBookingFinances() instead */
  net_rent: number | null;
  /** @deprecated Use calculateBookingFinances() instead */
  ancillary_costs_amount: number;
  /** @deprecated Use calculateBookingFinances() instead */
  final_cleaning_amount: number;

  // === NON-FINANCIAL GUEST DATA ===
  additional_costs: string | null; // NK notes (e.g., "vor Ort")
  final_cleaning: string | null;   // ER notes (e.g., "vor Ort")
  deposit_amount: number;
  deposit_paid: number;
  final_payment: number;
  final_payment_paid: number;
  electricity_flat: number;
  additional_payment: number;
  security_deposit: number;
  status: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  other_notes?: string | null;
  pets?: string | null;
  is_private?: number;
  private_config?: string | null;
  no_nebenkosten?: number;
}

export interface MonthData {
  month: number;
  monthName: string;
  guests: FinanceGuest[];
  totalRevenue: number;
  commission: number;
}

export interface QuarterData {
  quarter: number;
  months: MonthData[];
  totalRevenue: number;
  commission: number;
  guestCount: number;
}

export interface ExpenseRecord {
  id: number;
  year: number;
  month: number;
  category: string;
  amount: number;
}

// Platform fees parsed from additional_costs JSON
export interface PlatformFees {
  platform_service_fee: number;
  payment_processing_fee: number;
}

export interface BookingWithFees {
  id: number;
  guest_id: number;
  arrival_date: string | null;
  additional_costs: string | null;
  utilities_cash?: number;
  cleaning_cash?: number;
}
