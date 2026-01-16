'use client';

import { X } from 'lucide-react';
import type { KurtaxeBooking } from './types';

interface OrtstaxePopupProps {
  month: number;
  monthName: string;
  year: number;
  bookings: KurtaxeBooking[];
  kurtaxeRate: number;
  totalAmount: number;
  onClose: () => void;
}

export function OrtstaxePopup({
  monthName,
  year,
  bookings,
  kurtaxeRate,
  totalAmount,
  onClose,
}: OrtstaxePopupProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">
          Ortstaxe {monthName} {year}
        </h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
            <div>
              <div className="font-medium text-gray-800">
                {new Date(booking.arrival).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} -{' '}
                {new Date(booking.departure).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </div>
              <div className="text-xs text-gray-500">
                {booking.adults} Erw. × {booking.days} Tage × {kurtaxeRate.toFixed(2)} €
              </div>
            </div>
            <span className="font-semibold text-gray-700">{formatCurrency(booking.amount)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center font-semibold">
        <span>Gesamt</span>
        <span className="text-gray-800">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
