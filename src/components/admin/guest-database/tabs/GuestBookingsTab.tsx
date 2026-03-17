'use client';

import { useState } from 'react';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import type { Guest, Booking, BankPayment, GuestDocument } from '../types';
import type { PricingSettings } from '../../utility-costs';
import { BookingDetail } from './BookingDetail';

interface GuestBookingsTabProps {
  guest: Guest;
  bookings: Booking[];
  bankPayments: BankPayment[];
  documents?: GuestDocument[];
  loading: boolean;
  pricing?: PricingSettings;
  onAddBooking: () => void;
  onUpdateBookingStatus?: (bookingId: number, status: string) => void;
  onEditBooking?: (booking: Booking) => void;
  onToggleCleaningCash?: (bookingId: number, isCash: boolean) => void;
  onTogglePaymentStatus?: (bookingId: number, field: 'deposit_paid' | 'final_payment_paid', value: number) => void;
  onUpdateTransactions?: (bookingId: number, transactions: Array<{
    date: string;
    amount: number;
    type: 'payment' | 'refund';
    status: string;
    description?: string;
    fee?: number;
  }>, payoutDate: string) => void;
  onUploadDocument?: (bookingId: number, guestId: number, file: File) => Promise<void>;
  onDeleteBooking?: (bookingId: number) => void;
}

export function GuestBookingsTab({ guest, bookings, bankPayments, documents = [], loading, pricing, onAddBooking, onUpdateBookingStatus, onEditBooking, onToggleCleaningCash, onTogglePaymentStatus, onUpdateTransactions, onUploadDocument, onDeleteBooking }: GuestBookingsTabProps) {
  const [activeBookingIndex, setActiveBookingIndex] = useState(0);

  // Filter documents by booking_id for each booking
  const getBookingDocuments = (bookingId: number) => {
    return documents.filter(doc => doc.booking_id === bookingId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Alle Buchungen kommen jetzt aus der bookings-Tabelle
  const allBookings = bookings;

  const currentBooking = allBookings[activeBookingIndex];
  const totalBookings = allBookings.length;

  return (
    <div className="space-y-4">
      {/* Buchungs-Reiter */}
      {totalBookings > 1 && (
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
          {allBookings.map((booking, index) => {
            const isActive = activeBookingIndex === index;
            const label = `Buchung ${index + 1}`;
            const dateRange = booking.arrival_date
              ? `${formatDate(booking.arrival_date).slice(0, 5)}`
              : '';

            return (
              <button
                key={index}
                onClick={() => setActiveBookingIndex(index)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{label}</span>
                {dateRange && <span className="ml-1 text-xs text-gray-400">({dateRange})</span>}
                {booking.status === 'cancelled' && (
                  <span className="ml-1 text-xs text-red-500">(storniert)</span>
                )}
                {booking.status === 'refunded' && (
                  <span className="ml-1 text-xs text-orange-500">(erstattet)</span>
                )}
                {booking.status === 'pending' && (
                  <span className="ml-1 text-xs text-yellow-600">(ausstehend)</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Aktuelle Buchung */}
      {currentBooking ? (
        <BookingDetail
          booking={currentBooking}
          guestId={guest.id}
          bankPayments={bankPayments}
          bookingDocuments={getBookingDocuments(currentBooking.id)}
          pricing={pricing}
          onStatusChange={
            onUpdateBookingStatus
              ? (status) => onUpdateBookingStatus(currentBooking.id, status)
              : undefined
          }
          onEdit={
            onEditBooking
              ? () => onEditBooking(currentBooking)
              : undefined
          }
          onDelete={
            onDeleteBooking
              ? () => onDeleteBooking(currentBooking.id)
              : undefined
          }
          onToggleCleaningCash={
            onToggleCleaningCash
              ? (isCash) => onToggleCleaningCash(currentBooking.id, isCash)
              : undefined
          }
          onTogglePaymentStatus={
            onTogglePaymentStatus
              ? (field, value) => onTogglePaymentStatus(currentBooking.id, field, value)
              : undefined
          }
          onUpdateTransactions={
            onUpdateTransactions
              ? (transactions, payoutDate) => onUpdateTransactions(currentBooking.id, transactions, payoutDate)
              : undefined
          }
          onUploadDocument={
            onUploadDocument
              ? (file) => onUploadDocument(currentBooking.id, guest.id, file)
              : undefined
          }
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Noch keine Buchungen vorhanden</p>
          <p className="text-sm mt-1">Fügen Sie eine neue Buchung hinzu oder führen Sie die Migration durch.</p>
        </div>
      )}

      {/* Neue Buchung hinzufügen */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddBooking();
        }}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Neue Buchung hinzufügen
      </button>
    </div>
  );
}
