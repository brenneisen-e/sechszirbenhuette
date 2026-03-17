'use client';

import { useState } from 'react';
import { Calendar, CreditCard, TrendingUp, Plus, Loader2, Check, RotateCcw, Edit3 } from 'lucide-react';
import { formatDate, formatCurrency, nightsBetween } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseTransactionsFromJson,
  parseCommunicationsFromJson,
  parsePayoutDateFromJson,
  type PlatformFees,
} from '@/lib/utils/financeCalculations';
import type { Guest, Booking, RonaldPayment, GuestDocument } from '../types';
import { CommunicationSection } from './CommunicationSection';
import { BookingFinancialDetails } from './BookingFinancialDetails';
import { BookingDocuments } from './BookingDocuments';

// ============================================================================
// WICHTIG: Keine Finanzberechnungen in dieser Komponente!
// Alle Berechnungen erfolgen zentral in lib/utils/financeCalculations.ts
// Diese Komponente zeigt nur die Ergebnisse an.
// ============================================================================

interface GuestBookingsTabProps {
  guest: Guest;
  bookings: Booking[];
  ronaldPayments: RonaldPayment[];
  documents?: GuestDocument[];
  loading: boolean;
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
}

interface BookingDetailProps {
  booking: Booking;
  guestId: number;
  ronaldPayments?: RonaldPayment[];
  bookingDocuments?: GuestDocument[];
  onStatusChange?: (status: string) => void;
  onEdit?: () => void;
  onToggleCleaningCash?: (isCash: boolean) => void;
  onUploadDocument?: (file: File) => Promise<void>;
  onTogglePaymentStatus?: (field: 'deposit_paid' | 'final_payment_paid', value: number) => void;
  onUpdateTransactions?: (transactions: Array<{
    date: string;
    amount: number;
    type: 'payment' | 'refund';
    status: string;
    description?: string;
    fee?: number;
  }>, payoutDate: string) => void;
}

function BookingDetail({ booking, guestId, ronaldPayments = [], bookingDocuments = [], onStatusChange, onEdit, onToggleCleaningCash, onUploadDocument, onTogglePaymentStatus, onUpdateTransactions }: BookingDetailProps) {
  // === Basis-Flags aus Buchungsdaten ===
  const hasDog = booking.pets?.toLowerCase().includes('hund') ?? false;
  const isPrivate = booking.platform?.toLowerCase() === 'privat';
  const isCleaningCash = booking.cleaning_cash === 1;
  const isUtilitiesCash = booking.utilities_cash === 1;
  const isFeWo = booking.platform?.toLowerCase() === 'fewo' ||
                 booking.platform?.toLowerCase() === 'fewo-direkt' ||
                 booking.platform?.toLowerCase() === 'vrbo';

  // === Parse additional_costs JSON (zentrale Hilfsfunktionen) ===
  let platformFees = parsePlatformFeesFromJson(booking.additional_costs);
  const transactions = parseTransactionsFromJson(booking.additional_costs);
  const communications = parseCommunicationsFromJson(booking.additional_costs);
  const payoutDate = parsePayoutDateFromJson(booking.additional_costs);

  // Extrahiere communication und document aus additional_costs
  let communication = '';
  let document: { r2_key: string; filename: string; type: string; uploaded_at?: string } | null = null;
  if (booking.additional_costs) {
    try {
      const parsed = JSON.parse(booking.additional_costs);
      if (parsed.communication) communication = parsed.communication;
      if (parsed.document?.r2_key) document = parsed.document;
      // FeWo breakdown für NK/Cleaning
      if (parsed.fewo_breakdown) {
        const fb = parsed.fewo_breakdown;
        if (!platformFees.nebenkosten_income) {
          platformFees = { ...platformFees, nebenkosten_income: (fb.water || 0) + (fb.electricity || 0) + (fb.heating || 0) + (fb.management_fee || 0) };
        }
        if (!platformFees.cleaning_fee_income) {
          platformFees = { ...platformFees, cleaning_fee_income: fb.cleaning || 0 };
        }
      }
    } catch { /* Not JSON */ }
  }

  // Fallback: Calculate NK from guest_total_payment if fewo_breakdown not available
  const cleaningCostForFallback = hasDog ? 125 : 100;
  if (!platformFees.nebenkosten_income && (platformFees.guest_total_payment || 0) > 0 && (platformFees.platform_service_fee || 0) > 0) {
    const calculatedNK = (platformFees.guest_total_payment || 0) - (booking.rental_price || 0) - cleaningCostForFallback - (platformFees.platform_service_fee || 0);
    if (calculatedNK > 0) {
      platformFees = { ...platformFees, nebenkosten_income: calculatedNK, cleaning_fee_income: cleaningCostForFallback };
    }
  }

  const nights = booking.arrival_date && booking.departure_date
    ? nightsBetween(booking.arrival_date, booking.departure_date)
    : 0;

  // === ZENTRALE FINANZBERECHNUNG ===
  // Alle Berechnungen erfolgen in financeCalculations.ts
  const financeResult = calculateBookingFinances({
    arrivalDate: booking.arrival_date,
    departureDate: booking.departure_date,
    adults: booking.adults || 2,
    rentalPrice: booking.rental_price || 0,
    platform: booking.platform,
    hasDog,
    isPrivate,
    skipNk: false,
    isCleaningCash,
    isUtilitiesCash,
    platformFees: platformFees as PlatformFees,
  });

  // === Alle Werte aus der zentralen Berechnung (NUR ANZEIGE!) ===
  const {
    utilityCosts,
    baseCosts,
    kurtaxe,
    cleaningCost,
    basisMiete,
    mieterlos,
    provision,
    nkEinnahmen,
    reinigungEinnahmen,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
    gesamtauszahlung,
    barNk,
    barReinigung,
    gesamteinzahlung,
    totalNkCosts,
    gesamtkosten,
    gesamtertrag,
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,
  } = financeResult;

  // Zahlungsstatus
  const rentalIncome = booking.rental_price || 0;
  const depositAmount = booking.deposit_amount || 0;
  const finalPaymentAmount = rentalIncome - depositAmount;
  const ronaldPaymentsSum = ronaldPayments.reduce((sum, p) => sum + p.amount, 0);
  const depositVerified = ronaldPaymentsSum >= depositAmount || booking.deposit_paid === 1;
  const fullyPaid = ronaldPaymentsSum >= rentalIncome || (booking.deposit_paid === 1 && booking.final_payment_paid === 1);

  return (
    <div className="space-y-4">
      {/* Header mit Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold text-gray-900">
            {formatDate(booking.arrival_date)} - {formatDate(booking.departure_date)}
          </h4>
          <span className="text-sm text-gray-500">({nights} Nächte)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              booking.status === 'active'
                ? 'bg-green-100 text-green-700'
                : booking.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : booking.status === 'cancelled'
                    ? 'bg-red-100 text-red-700'
                    : booking.status === 'refunded'
                      ? 'bg-orange-100 text-orange-700'
                      : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
            }`}
          >
            {booking.status === 'active' ? 'Aktiv'
              : booking.status === 'completed' ? 'Abgeschlossen'
              : booking.status === 'cancelled' ? 'Storniert'
              : booking.status === 'refunded' ? 'Erstattet'
              : booking.status === 'pending' ? 'Ausstehend'
              : 'Aktiv'}
          </span>
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bearbeiten">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onStatusChange && booking.status !== 'completed' && (
            <button
              onClick={() => onStatusChange('completed')}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="Als abgeschlossen markieren"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {onStatusChange && booking.status === 'completed' && (
            <button
              onClick={() => onStatusChange('active')}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
              title="Wieder aktivieren"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Erste Zeile: Buchungsdetails & Gast-Zahlung */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Buchungsdetails */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h5 className="font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Buchungsdetails
            {booking.booking_number && (
              <span className="text-sm font-mono text-gray-500 ml-auto">#{booking.booking_number}</span>
            )}
          </h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Personen:</span>
              <span className="font-medium">
                {booking.adults} Erw.{booking.children > 0 && `, ${booking.children} Ki.`}
              </span>
            </div>
            {booking.pets && (
              <div className="flex justify-between">
                <span className="text-gray-600">Haustiere:</span>
                <span className="font-medium">{booking.pets}</span>
              </div>
            )}
            {booking.platform && (
              <div className="flex justify-between">
                <span className="text-gray-600">Plattform:</span>
                <span className="font-medium">{booking.platform}</span>
              </div>
            )}
            {/* Mieterlös-Berechnung mit Aufschlüsselung */}
            <div className="pt-2 border-t border-gray-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Miete:</span>
                <span className="font-medium">{formatCurrency(basisMiete)}</span>
              </div>
              {paymentProcessingFee > 0 && anteiligeMietgebuehr > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>./. Zahlungsgeb. ({formatCurrency(basisMiete)}/{formatCurrency(gesamtauszahlung)} = {(mietAnteil * 100).toFixed(1)}% von {formatCurrency(paymentProcessingFee)}):</span>
                  <span>-{formatCurrency(anteiligeMietgebuehr)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-gray-700 font-medium">= Mieterlös:</span>
                <span className="font-bold text-lg text-green-700">{formatCurrency(mieterlos)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Provision (10% v. Mieterlös):</span>
                <span>{formatCurrency(provision)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gast-Zahlung (Plattform) - nur wenn Daten vorhanden */}
        {(platformFees.payout_amount || 0) > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
            <h5 className="font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Zahlungsdetails (Plattform)
            </h5>
            {/* Gesamtzahlung des Gastes an erster Stelle - berechnet wenn nicht vorhanden */}
            {(() => {
              // guest_total_payment = payout + service_fee + payment_fee (rückgerechnet)
              const guestTotal = (platformFees.guest_total_payment || 0) > 0
                ? (platformFees.guest_total_payment || 0)
                : (platformFees.payout_amount || 0) + (platformFees.platform_service_fee || 0) + paymentProcessingFee;
              return guestTotal > 0 ? (
                <div className="flex justify-between pt-1">
                  <span className="text-gray-700">Gesamtzahlung des Gastes:</span>
                  <span className="font-medium">{formatCurrency(guestTotal)}</span>
                </div>
              ) : null;
            })()}
            {/* Gebühren als Abzüge */}
            {(platformFees.platform_service_fee || 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>./. Servicegebühr für Gäste:</span>
                <span>-{formatCurrency(platformFees.platform_service_fee || 0)}</span>
              </div>
            )}
            {paymentProcessingFee > 0 && (
              <div className="flex justify-between text-red-600">
                <span>./. Zahlungsbearbeitungsgebühr:</span>
                <span>-{formatCurrency(paymentProcessingFee)}</span>
              </div>
            )}
            {/* Gesamtauszahlung - direkt aus den importierten Daten */}
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="font-medium text-gray-900">Gesamtauszahlung:</span>
              <span className="font-bold text-green-700">{formatCurrency(platformFees.payout_amount || 0)}</span>
            </div>
            {/* Aufschlüsselung der Auszahlung */}
            {((platformFees.nebenkosten_income || 0) > 0 || (platformFees.cleaning_fee_income || 0) > 0 || (platformFees.kurtaxe_income || 0) > 0) && (
              <div className="pt-2 border-t border-blue-100 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>davon Miete:</span>
                  <span>{formatCurrency(rentalIncome || ((platformFees.payout_amount || 0) - (platformFees.nebenkosten_income || 0) - (platformFees.cleaning_fee_income || 0) - (platformFees.kurtaxe_income || 0)))}</span>
                </div>
                {(platformFees.nebenkosten_income || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>davon NK (W/S/H):</span>
                    <span>{formatCurrency(platformFees.nebenkosten_income || 0)}</span>
                  </div>
                )}
                {(platformFees.cleaning_fee_income || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>davon Reinigung:</span>
                    <span>{formatCurrency(platformFees.cleaning_fee_income || 0)}</span>
                  </div>
                )}
                {(platformFees.kurtaxe_income || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>davon Kurtaxe:</span>
                    <span>{formatCurrency(platformFees.kurtaxe_income || 0)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zweite Zeile: Kosten & Ertrag + Zahlungsstatus */}
      <BookingFinancialDetails
        utilityCosts={utilityCosts}
        baseCosts={baseCosts}
        kurtaxe={kurtaxe}
        cleaningCost={cleaningCost}
        basisMiete={basisMiete}
        mieterlos={mieterlos}
        provision={provision}
        nkEinnahmen={nkEinnahmen}
        reinigungEinnahmen={reinigungEinnahmen}
        paymentProcessingFee={paymentProcessingFee}
        mietAnteil={mietAnteil}
        anteiligeMietgebuehr={anteiligeMietgebuehr}
        gesamtauszahlung={gesamtauszahlung}
        barNk={barNk}
        barReinigung={barReinigung}
        gesamteinzahlung={gesamteinzahlung}
        totalNkCosts={totalNkCosts}
        gesamtkosten={gesamtkosten}
        gesamtertrag={gesamtertrag}
        isBookingCom={isBookingCom}
        isAirbnb={isAirbnb}
        isPlatformWithIncludedCosts={isPlatformWithIncludedCosts}
        isPrivate={isPrivate}
        isCleaningCash={isCleaningCash}
        isUtilitiesCash={isUtilitiesCash}
        platformFees={platformFees as PlatformFees}
        rentalIncome={rentalIncome}
        transactions={transactions}
        payoutDate={payoutDate}
        ronaldPayments={ronaldPayments}
        depositAmount={depositAmount}
        depositVerified={depositVerified}
        fullyPaid={fullyPaid}
        finalPaymentAmount={finalPaymentAmount}
        ronaldPaymentsSum={ronaldPaymentsSum}
        depositPaid={booking.deposit_paid}
        finalPaymentPaid={booking.final_payment_paid}
        onTogglePaymentStatus={onTogglePaymentStatus}
        onUpdateTransactions={onUpdateTransactions}
      />

      {/* Dokumente */}
      <div className="bg-gray-50 rounded-lg p-4">
        <BookingDocuments
          document={document}
          bookingDocuments={bookingDocuments}
          onUploadDocument={onUploadDocument}
        />
      </div>

      {/* Dritte Zeile: Kommunikation (aufklappbar) */}
      {(communication || communications.length > 0) && (
        <CommunicationSection communication={communication} communications={communications} />
      )}
    </div>
  );
}

export function GuestBookingsTab({ guest, bookings, ronaldPayments, documents = [], loading, onAddBooking, onUpdateBookingStatus, onEditBooking, onToggleCleaningCash, onTogglePaymentStatus, onUpdateTransactions, onUploadDocument }: GuestBookingsTabProps) {
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
          ronaldPayments={ronaldPayments}
          bookingDocuments={getBookingDocuments(currentBooking.id)}
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
