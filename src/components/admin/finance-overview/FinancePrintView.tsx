'use client';

import { formatCurrency } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseTransactionsFromJson,
  type PlatformFees,
} from '@/lib/utils/financeCalculations';
import type { FinanceGuest, QuarterData } from './types';
import type { PricingSettings } from '../utility-costs';

// ============================================================================
// WICHTIG: Keine Finanzberechnungen in dieser Komponente!
// Alle Berechnungen erfolgen zentral in lib/utils/financeCalculations.ts
// Diese Komponente zeigt nur die Ergebnisse an.
// ============================================================================

interface FinancePrintViewProps {
  year: number;
  quarterData: QuarterData[];
  yearlyTotals: {
    revenue: number;
    nk: number;
    commission: number;
    guestCount: number;
  };
  yearlyExpenses: number;
  platformFees: { platform_service_fee: number; payment_processing_fee: number };
  pricing?: PricingSettings;
}

function BookingPrintCard({ guest, pricing }: { guest: FinanceGuest; pricing?: PricingSettings }) {
  // === Basis-Flags ===
  const hasDog = guest.pets?.toLowerCase().includes('hund') ?? false;
  const skipNk = guest.no_nebenkosten === 1;
  const isCleaningCashFromBooking = guest.cleaning_cash === 1;
  const isCleaningCash = isCleaningCashFromBooking || (guest.final_cleaning?.includes('vor Ort') ?? false);
  const isUtilitiesCash = guest.utilities_cash === 1;

  // === Parse additional_costs JSON (zentrale Hilfsfunktionen) ===
  const platformFees = parsePlatformFeesFromJson(guest.booking_additional_costs);
  const transactions = parseTransactionsFromJson(guest.booking_additional_costs);

  // === ZENTRALE FINANZBERECHNUNG ===
  const financeResult = calculateBookingFinances({
    arrivalDate: guest.arrival_date,
    departureDate: guest.departure_date,
    adults: guest.adults || 2,
    rentalPrice: guest.rental_price ?? 0,
    platform: guest.platform ?? null,
    hasDog,
    isPrivate: false,
    skipNk,
    isCleaningCash,
    isUtilitiesCash,
    platformFees: platformFees as PlatformFees,
    pricingSettings: pricing,
  });

  // === Alle Werte aus der zentralen Berechnung (NUR ANZEIGE!) ===
  const {
    utilityCosts: costCalc,
    baseCosts,
    kurtaxe,
    cleaningCost,
    basisMiete,
    mieterlos,
    nkEinnahmen,
    reinigungEinnahmen,
    provision: commission,
    barNk,
    barReinigung,
    gesamteinzahlung,
    totalNkCosts: totalCalculatedCosts,
    gesamtkosten,
    gesamtertrag,
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,
  } = financeResult;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="border border-gray-300 rounded p-3 mb-3 text-xs break-inside-avoid">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-2 mb-2">
        <div>
          <div className="font-bold text-sm">{guest.guest_name}</div>
          <div className="text-gray-600">
            {formatDate(guest.arrival_date)} – {formatDate(guest.departure_date)}
          </div>
          <div className="text-gray-500">
            {guest.adults} Erw.{guest.children > 0 ? `, ${guest.children} Kind.` : ''}
            {hasDog && ' 🐕'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">{guest.platform || '-'}</div>
          {guest.booking_number && <div className="text-gray-500">#{guest.booking_number}</div>}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-medium mb-1">Einzahlungen</div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td>Miete:</td>
                <td className="text-right text-green-700">{formatCurrency(basisMiete)}</td>
              </tr>
              {(nkEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                <tr>
                  <td>NK:</td>
                  <td className="text-right text-green-700">
                    {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(nkEinnahmen)}
                  </td>
                </tr>
              )}
              {barNk > 0 && (
                <tr>
                  <td>NK + Kurtaxe (bar):</td>
                  <td className="text-right text-green-700">{formatCurrency(barNk)}</td>
                </tr>
              )}
              {(reinigungEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                <tr>
                  <td>Reinigung:</td>
                  <td className="text-right text-green-700">
                    {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(reinigungEinnahmen)}
                  </td>
                </tr>
              )}
              {barReinigung > 0 && (
                <tr>
                  <td>Reinigung (bar):</td>
                  <td className="text-right text-green-700">{formatCurrency(barReinigung)}</td>
                </tr>
              )}
              <tr className="border-t font-medium">
                <td>= Gesamt:</td>
                <td className="text-right text-green-700">{formatCurrency(gesamteinzahlung)}</td>
              </tr>
            </tbody>
          </table>

          <div className="font-medium mb-1 mt-2">Kosten</div>
          <table className="w-full text-xs">
            <tbody>
              {!skipNk && (
                <tr>
                  <td>NK (kalk.){isUtilitiesCash && ' (bar)'}:</td>
                  <td className="text-right text-red-600">{formatCurrency(totalCalculatedCosts)}</td>
                </tr>
              )}
              <tr>
                <td>Reinigung{isCleaningCash && ' (bar)'}:</td>
                <td className="text-right text-red-600">{formatCurrency(cleaningCost)}</td>
              </tr>
              <tr>
                <td>Provision:</td>
                <td className="text-right text-red-600">{formatCurrency(commission)}</td>
              </tr>
              <tr className="border-t font-medium">
                <td>= Gesamt:</td>
                <td className="text-right text-red-600">{formatCurrency(gesamtkosten)}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full text-xs mt-2">
            <tbody>
              <tr className="border-t-2 font-bold">
                <td>Ertrag:</td>
                <td className={`text-right ${gesamtertrag >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(gesamtertrag)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div>
            <div className="font-medium mb-1">Zahlungen</div>
            <table className="w-full text-xs">
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={idx} className={t.type === 'refund' ? 'text-orange-600' : ''}>
                    <td>{t.date}</td>
                    <td className="text-right">
                      {t.type === 'refund' ? '-' : ''}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {guest.other_notes && (
        <div className="mt-2 pt-2 border-t text-gray-600 italic">
          {guest.other_notes}
        </div>
      )}
    </div>
  );
}

export function FinancePrintView({
  year,
  quarterData,
  yearlyTotals,
  yearlyExpenses,
  platformFees,
  pricing,
}: FinancePrintViewProps) {
  const totalPlatformFees = platformFees.platform_service_fee + platformFees.payment_processing_fee;
  const yearlyTotalIncome = yearlyTotals.revenue + yearlyTotals.nk;
  const yearlyProfit = yearlyTotalIncome - yearlyExpenses - yearlyTotals.commission - totalPlatformFees;

  return (
    <div className="hidden print:block p-4 text-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">Finanzübersicht {year}</h1>
        <div className="text-gray-500">Natberger Hütte</div>
      </div>

      {/* Year KPIs */}
      <div className="mb-6 p-4 border-2 border-gray-400 rounded-lg">
        <h2 className="font-bold text-lg mb-3">Jahres-Kennzahlen {year}</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(yearlyTotals.revenue)}</div>
            <div className="text-xs text-gray-600">Mieteinnahmen</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(yearlyTotals.nk)}</div>
            <div className="text-xs text-gray-600">Nebenkosten (bar)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-700">-{formatCurrency(yearlyTotals.commission)}</div>
            <div className="text-xs text-gray-600">Provision</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(yearlyProfit)}</div>
            <div className="text-xs text-gray-600">Gewinn</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <span className="text-gray-600">Buchungen:</span>{' '}
            <span className="font-bold">{yearlyTotals.guestCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Ausgaben:</span>{' '}
            <span className="font-bold text-red-600">-{formatCurrency(yearlyExpenses)}</span>
          </div>
          <div>
            <span className="text-gray-600">Plattformgebühren:</span>{' '}
            <span className="font-bold text-red-600">-{formatCurrency(totalPlatformFees)}</span>
          </div>
        </div>
      </div>

      {/* Quarterly Breakdown */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3">Quartalsübersicht</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Quartal</th>
              <th className="border p-2 text-right">Buchungen</th>
              <th className="border p-2 text-right">Mieteinnahmen</th>
              <th className="border p-2 text-right">Provision</th>
            </tr>
          </thead>
          <tbody>
            {quarterData.map((q) => (
              <tr key={q.quarter}>
                <td className="border p-2 font-medium">Q{q.quarter}</td>
                <td className="border p-2 text-right">{q.guestCount}</td>
                <td className="border p-2 text-right text-green-700">{formatCurrency(q.totalRevenue)}</td>
                <td className="border p-2 text-right text-purple-600">-{formatCurrency(q.commission)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="border p-2">Gesamt</td>
              <td className="border p-2 text-right">{yearlyTotals.guestCount}</td>
              <td className="border p-2 text-right text-green-700">{formatCurrency(yearlyTotals.revenue)}</td>
              <td className="border p-2 text-right text-purple-600">-{formatCurrency(yearlyTotals.commission)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* All Bookings by Quarter */}
      {quarterData.map((q) => (
        <div key={q.quarter} className="mb-6 break-before-page">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-1">
            Q{q.quarter} – {q.guestCount} Buchungen – {formatCurrency(q.totalRevenue)}
          </h2>

          {q.months.map((month) => (
            month.guests.length > 0 && (
              <div key={month.month} className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">{month.monthName}</h3>
                {month.guests.map((guest) => (
                  <BookingPrintCard key={guest.id} guest={guest} pricing={pricing} />
                ))}
              </div>
            )
          ))}
        </div>
      ))}
    </div>
  );
}
