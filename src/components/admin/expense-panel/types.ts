// Types for ExpensePanel component

export interface ExpenseRecord {
  id: number;
  year: number;
  month: number;
  category: string;
  amount: number;
  notes: string | null;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  display_order: number;
}

export interface ExpenseGuest {
  id: number;
  arrival_date: string | null;
  departure_date: string | null;
  rental_price: number | null;
  net_rent: number | null;
  adults: number;
  children: number;
  status: string;
  // Additional fields needed for central calculation
  pets?: string | null;
  platform?: string | null;
  is_private?: number;
  no_nebenkosten?: number;
  final_cleaning?: string | null;
}

export interface KurtaxeRatePeriod {
  from: string;
  to: string;
  rate: number;
}

export interface PricingSettings {
  kurtaxe_rate: number;
  kurtaxe_rates: KurtaxeRatePeriod[];
  holz_rate: number;
  water_rate: number;
  trash_rate: number;
  electricity_rate: number;
  commission_rate: number;
  reinigung_rate: number;
}

export interface KurtaxeBooking {
  id: number;
  arrival: string;
  departure: string;
  adults: number;
  days: number;
  amount: number;
}

export interface ProvisionBooking {
  id: number;
  guestName: string;
  arrival: string;
  departure: string;
  platform: string | null;
  rentalPrice: number;
  mieterlos: number;
  provision: number;
}
