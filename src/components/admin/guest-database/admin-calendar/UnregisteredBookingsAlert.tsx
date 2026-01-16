'use client';

import { AlertTriangle } from 'lucide-react';
import type { FeratelBooking } from '../types';

interface UnregisteredBookingsAlertProps {
  bookings: FeratelBooking[];
  onSwitchToGuests: () => void;
}

export function UnregisteredBookingsAlert({ bookings, onSwitchToGuests }: UnregisteredBookingsAlertProps) {
  if (bookings.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-orange-900">
            {bookings.length} Portal-Buchung{bookings.length > 1 ? 'en' : ''} nicht in Gästedatenbank
          </h4>
          <p className="text-sm text-orange-700 mt-1">
            Diese Buchungen wurden über Portale getätigt, sind aber noch nicht im System erfasst:
          </p>
          <div className="mt-2 space-y-1">
            {bookings.slice(0, 5).map((fb, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm border border-orange-200"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-orange-900">
                    {new Date(fb.start).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                    {' - '}
                    {new Date(fb.end).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                  <span className="text-orange-600">{fb.summary || 'Buchung'}</span>
                </div>
                <button
                  onClick={onSwitchToGuests}
                  className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Erfassen
                </button>
              </div>
            ))}
            {bookings.length > 5 && (
              <p className="text-sm text-orange-600">... und {bookings.length - 5} weitere</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
