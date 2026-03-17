'use client';

import { X } from 'lucide-react';
import type { ProvisionBooking } from './types';

interface ProvisionPopupProps {
  month: number;
  monthName: string;
  year: number;
  bookings: ProvisionBooking[];
  totalAmount: number;
  onClose: () => void;
}

export function ProvisionPopup({
  monthName,
  year,
  bookings,
  totalAmount,
  onClose,
}: ProvisionPopupProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">
          Provision {monthName} {year}
        </h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {bookings.map((booking) => (
          <div key={booking.id} className="p-2 bg-gray-50 rounded text-sm">
            <div className="flex justify-between items-start mb-1">
              <div className="font-medium text-gray-800 truncate max-w-[180px]">
                {booking.guestName}
              </div>
              <span className="font-semibold text-purple-700">{formatCurrency(booking.provision)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div>
                {new Date(booking.arrival).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} -{' '}
                {new Date(booking.departure).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                {booking.platform && (
                  <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                    {booking.platform}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
              <span>Miete: {formatCurrency(booking.rentalPrice)}</span>
              <span>Mieterlös: {formatCurrency(booking.mieterlos)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center font-semibold">
        <span>Gesamt (10% von Mieterlös)</span>
        <span className="text-purple-800">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
