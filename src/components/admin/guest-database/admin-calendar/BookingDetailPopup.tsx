'use client';

import { BookingDetailPopup as SharedBookingDetailPopup, type BookingDetailData } from '../../shared/BookingDetailPopup';
import type { Guest, Booking } from '../types';

interface BookingDetailPopupProps {
  booking: Booking;
  guest: Guest;
  onClose: () => void;
  onNavigateToGuest: () => void;
}

// Convert Booking + Guest to BookingDetailData
function toBookingDetailData(booking: Booking, guest: Guest): BookingDetailData {
  return {
    guest_name: guest.guest_name,
    email: guest.email,
    phone: guest.phone,
    nationality: guest.nationality,
    arrival_date: booking.arrival_date,
    departure_date: booking.departure_date,
    adults: booking.adults,
    children: booking.children,
    platform: booking.platform,
    booking_number: booking.booking_number,
    rental_price: booking.rental_price,
    pets: booking.pets,
    no_nebenkosten: guest.no_nebenkosten,
    cleaning_cash: booking.cleaning_cash,
    utilities_cash: booking.utilities_cash,
    is_private: guest.is_private,
    final_cleaning: booking.final_cleaning,
    additional_costs: booking.additional_costs,
    notes: booking.notes,
  };
}

export function BookingDetailPopup({ booking, guest, onClose, onNavigateToGuest }: BookingDetailPopupProps) {
  return (
    <SharedBookingDetailPopup
      data={toBookingDetailData(booking, guest)}
      onClose={onClose}
      onNavigateToGuest={onNavigateToGuest}
    />
  );
}
