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
  rental_price: number;
  net_rent: number | null;
  ancillary_costs_amount: number;  // NK - Nebenkosten (actual from PDF)
  final_cleaning_amount: number;   // ER - Endreinigung (actual from PDF)
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
  no_nebenkosten?: number;
  // Booking financial data (from bookings table)
  booking_additional_costs?: string | null;
  utilities_cash?: number;
  cleaning_cash?: number;
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
