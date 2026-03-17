// Shared types for GuestDatabase components

export type SortColumn = 'id' | 'guest_name' | 'platform' | 'arrival_date' | 'departure_date' | 'rental_price' | 'status' | null;
export type SortDirection = 'asc' | 'desc';
export type GuestProfileTab = 'overview' | 'bookings' | 'tasks' | 'documents' | 'notes';

export interface Guest {
  id: number;
  booking_number: string | null;
  month: string | null;
  year: number | null;
  guest_name: string;
  nationality: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_returning_guest: number;
  is_private: number;
  no_nebenkosten: number;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages: string | null;
  pets: string | null;
  rental_price: number;
  net_rent: number | null;
  cleaning_cash: number;
  additional_costs: string | null;
  final_cleaning: string | null;
  other_notes: string | null;
  first_contact_date: string | null;
  offer_sent: number;
  contract_sent: number;
  welcome_guide_sent: number;
  deposit_amount: number;
  deposit_paid: number;
  final_payment: number;
  final_payment_paid: number;
  electricity_flat: number;
  additional_payment: number;
  security_deposit: number;
  admin_briefed: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  guest_id: number;
  booking_id: number | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  is_completed: number;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Granulare Konfiguration für Privatbuchungen.
 * Bestimmt, welche Kosten/Einnahmen bei einer privaten Buchung anfallen.
 */
export interface PrivateBookingConfig {
  miete_zero: boolean;          // Miete = 0 EUR?
  nk_paid: boolean;             // Nebenkosten werden bezahlt (kalkulatorische Höhe)?
  kurtaxe_paid: boolean;        // Kurtaxe wird bezahlt?
  provision_charged: boolean;   // Provision wird berechnet?
}

/** Default: Miete 0, keine NK, keine Kurtaxe, keine Provision */
export const DEFAULT_PRIVATE_CONFIG: PrivateBookingConfig = {
  miete_zero: true,
  nk_paid: false,
  kurtaxe_paid: false,
  provision_charged: false,
};

export interface Booking {
  id: number;
  guest_id: number;
  booking_number: string | null;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages: string | null;
  pets: string | null;
  rental_price: number;
  deposit_amount: number;
  deposit_paid: number;
  final_payment: number;
  final_payment_paid: number;
  electricity_flat: number;
  additional_payment: number;
  security_deposit: number;
  additional_costs: string | null;
  final_cleaning: string | null;
  first_contact_date: string | null;
  offer_sent: number;
  contract_sent: number;
  welcome_guide_sent: number;
  admin_briefed: number;
  status: string;
  notes: string | null;
  cleaning_cash: number;
  utilities_cash: number;
  kurtaxe_cash: number;
  is_private: number;
  private_config: string | null;  // JSON string of PrivateBookingConfig
  created_at: string;
  updated_at: string;
}

export interface GuestCost {
  id: number;
  guest_id: number;
  booking_id: number | null;
  cost_type: string;
  cost_category: string | null;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface BankPayment {
  id: number;
  guest_id: number | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  is_unknown_booking: number;
  is_cash: number;
}

export interface GuestDocument {
  id: number;
  guest_id: number;
  booking_id: number | null;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number | null;
  description: string | null;
  document_type: string;
  r2_key: string;
  created_at: string;
}

export interface GuestNote {
  id: number;
  guest_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface FeratelBooking {
  start: string;
  end: string;
  summary?: string;
}

// API Response types
export interface GuestsResponse {
  guests?: Guest[];
  error?: string;
}

export interface GuestResponse {
  guest?: Guest;
  error?: string;
}

export interface BookingsResponse {
  bookings?: Booking[];
  error?: string;
}

// Transaction from payment plan (Zahlungsplan)
export interface PaymentTransaction {
  date: string;           // YYYY-MM-DD
  amount: number;         // Positive for payments, positive for refunds
  type: 'payment' | 'refund';
  status: 'paid' | 'refunded' | 'pending';
  description?: string;
  fee?: number;           // Processing fee (positive for payments, negative for refund fee credits)
}

export interface ScreenshotAnalysisResponse {
  success?: boolean;
  data?: {
    guest_name?: string;
    nationality?: string;
    email?: string;
    phone?: string;
    address?: string;
    arrival_date?: string;
    departure_date?: string;
    adults?: number;
    children?: number;
    children_ages?: string;
    platform?: string;
    booking_number?: string;
    rental_price?: number;
    net_rent?: number;
    first_contact_date?: string;
    notes?: string;
    communication?: string;
    // Billing-Felder
    guest_total_payment?: number;
    platform_fees?: number;
    service_fee?: number;
    payment_processing_fees?: number;
    payout_amount?: number;
    payout_date?: string;
    // Einnahmen-Aufteilung
    nebenkosten_income?: number;
    cleaning_fee_income?: number;
    kurtaxe_income?: number;
    transactions?: PaymentTransaction[];
    fewo_breakdown?: {
      base_rent?: number;
      extra_guest_fee?: number;
      discount?: number;
      management_fee?: number;
      water?: number;
      electricity?: number;
      heating?: number;
      cleaning?: number;
    };
    platform_payment?: boolean;
  };
  error?: string;
  debug?: {
    message?: string;
    responsePreview?: string;
    rawResponse?: string;
    imageSize?: number;
  };
}

// Cost type definition
export interface CostCategory {
  name: string;
  defaultAmount: number | null;
}

export interface CostType {
  type: string;
  categories: CostCategory[] | null;
  perNightPerAdult?: number;
}

// Assignee for tasks
export interface Assignee {
  email: string;
  name: string;
}

// Standard task template
export interface StandardTask {
  key: string;
  title: string;
  order: number;
}

// Country for nationality selection
export interface Country {
  code: string;
  name: string;
}
