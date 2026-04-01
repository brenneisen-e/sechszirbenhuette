'use client';

import { useState, useEffect } from 'react';
import { calculateUtilityCostsForBooking } from '../../UtilityCostsCalculator';
import type { PricingSettings, KurtaxeRatePeriod } from '../../utility-costs';
import type { Guest, Booking } from '../types';

interface YearlyBookingsListProps {
  guests: Guest[];
  bookings: Booking[];
  year: number;
  onSelectBooking: (booking: Booking, guest: Guest) => void;
}

// Combined display item
interface BookingDisplayItem {
  booking: Booking;
  guest: Guest;
}

const DEFAULT_PRICING: PricingSettings = {
  kurtaxe: 2.7,
  holz: 9,
  water: 7,
  trash: 11,
  electricity: 0.55,
  reinigung: 100,
};

export function YearlyBookingsList({ guests, bookings, year, onSelectBooking }: YearlyBookingsListProps) {
  // Load pricing settings from DB
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json() as Promise<{ settings?: Record<string, string> }>)
      .then((data) => {
        if (data.settings) {
          let kurtaxeRates: KurtaxeRatePeriod[] | undefined;
          if (data.settings.kurtaxe_rates) {
            try {
              kurtaxeRates = JSON.parse(data.settings.kurtaxe_rates) as KurtaxeRatePeriod[];
            } catch { /* ignore */ }
          }
          setPricing({
            kurtaxe: parseFloat(data.settings.kurtaxe_rate ?? '') || 2.7,
            kurtaxeRates,
            holz: parseFloat(data.settings.holz_rate ?? '') || 9,
            water: parseFloat(data.settings.water_rate ?? '') || 7,
            trash: parseFloat(data.settings.trash_rate ?? '') || 11,
            electricity: parseFloat(data.settings.electricity_rate ?? '') || 0.55,
            reinigung: parseFloat(data.settings.reinigung_rate ?? '') || 100,
          });
        }
      })
      .catch(() => { /* use defaults */ });
  }, []);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  // Build list of bookings for this year from the bookings table
  const yearBookingItems: BookingDisplayItem[] = bookings
    .filter((b) => {
      if (!b.arrival_date || b.status === 'cancelled') return false;
      const arrival = new Date(b.arrival_date);
      return arrival.getFullYear() === year;
    })
    .map((b) => {
      const guest = guests.find((g) => g.id === b.guest_id);
      return guest ? { booking: b, guest } : null;
    })
    .filter((item): item is BookingDisplayItem => item !== null)
    .sort((a, b) => new Date(a.booking.arrival_date!).getTime() - new Date(b.booking.arrival_date!).getTime());

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">Buchungen {year}</h4>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {yearBookingItems.map(({ booking, guest }) => {
          const hasDog = booking.pets?.toLowerCase().includes('hund') ?? false;
          const costCalc =
            booking.arrival_date && booking.departure_date
              ? calculateUtilityCostsForBooking(booking.arrival_date, booking.departure_date, booking.adults || 2, pricing, hasDog)
              : null;
          return (
            <div
              key={booking.id}
              className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => onSelectBooking(booking, guest)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {guest.nationality && (
                    <img
                      src={`https://flagcdn.com/w20/${guest.nationality.split(',')[0]?.toLowerCase()}.png`}
                      alt=""
                      className="w-5 h-4 rounded-sm shadow-sm"
                      loading="eager"
                    />
                  )}
                  <span className="font-medium text-gray-900">{guest.guest_name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    {new Date(booking.arrival_date!).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    {' - '}
                    {booking.departure_date
                      ? new Date(booking.departure_date).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '?'}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">{booking.platform || 'Direkt'}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-gray-500">
                  <span>{booking.adults || 2} Erw.</span>
                  {costCalc && <span>{costCalc.days} Tage</span>}
                </div>
                <div className="flex items-center gap-3">
                  {booking.rental_price > 0 && (
                    <span className="text-green-700 font-medium">Miete: {formatCurrency(booking.rental_price)}</span>
                  )}
                  {costCalc && <span className="text-purple-700">Kurtaxe: {formatCurrency(costCalc.kurtaxe)}</span>}
                  {costCalc && <span className="text-gray-600">NK: {formatCurrency(costCalc.costs)}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {yearBookingItems.length === 0 && <p className="text-sm text-gray-500">Keine Buchungen für {year}</p>}
      </div>
    </div>
  );
}
