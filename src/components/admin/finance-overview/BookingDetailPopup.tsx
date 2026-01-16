'use client';

import { BookingDetailPopup as SharedBookingDetailPopup, type BookingDetailData } from '../shared/BookingDetailPopup';
import type { FinanceGuest } from './types';
import type { PricingSettings } from '../utility-costs';

interface BookingDetailPopupProps {
  guest: FinanceGuest;
  pricing?: PricingSettings;
  onClose: () => void;
  onNavigateToGuest?: () => void;
}

// Convert FinanceGuest to BookingDetailData
function toBookingDetailData(guest: FinanceGuest): BookingDetailData {
  return {
    guest_name: guest.guest_name,
    email: guest.email,
    phone: guest.phone,
    nationality: guest.nationality,
    arrival_date: guest.arrival_date,
    departure_date: guest.departure_date,
    adults: guest.adults,
    children: guest.children,
    platform: guest.platform,
    booking_number: guest.booking_number,
    rental_price: guest.rental_price,
    pets: guest.pets,
    no_nebenkosten: guest.no_nebenkosten,
    cleaning_cash: guest.cleaning_cash,
    utilities_cash: guest.utilities_cash,
    is_private: guest.is_private,
    final_cleaning: guest.final_cleaning,
    additional_costs: guest.additional_costs,
    booking_additional_costs: guest.booking_additional_costs,
    notes: guest.other_notes,
  };
}

export function BookingDetailPopup({ guest, pricing, onClose, onNavigateToGuest }: BookingDetailPopupProps) {
  return (
    <SharedBookingDetailPopup
      data={toBookingDetailData(guest)}
      pricing={pricing}
      onClose={onClose}
      onNavigateToGuest={onNavigateToGuest}
    />
  );
}
