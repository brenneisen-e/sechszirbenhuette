'use client';

import { formatCurrency } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseKomfortpaketFromJson,
  parseChildrenAges,
  parsePrivateConfig,
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
    guestTotalPayment: number;
    platformFeesTotal: number;
    gesamteinzahlung: number;
    kalkKosten: number;
    mieterlos: number;
  };
  yearlyExpenses: number;
  platformFees: { platform_service_fee: number; payment_processing_fee: number };
  pricing?: PricingSettings;
}

function BookingPrintCard({ guest, pricing }: { guest: FinanceGuest; pricing?: PricingSettings }) {
  const hasDog = guest.pets?.toLowerCase().includes('hund') ?? false;
  const skipNk = guest.no_nebenkosten === 1;
  const isCleaningCash = guest.cleaning_cash === 1 || (guest.final_cleaning?.includes('vor Ort') ?? false);
  const isUtilitiesCash = guest.utilities_cash === 1;
  const isKurtaxeCash = guest.kurtaxe_cash === 1;

  const pFees = parsePlatformFeesFromJson(guest.booking_additional_costs);
  const komfortpaket = parseKomfortpaketFromJson(guest.booking_additional_costs);
  const childrenAges = parseChildrenAges(guest.children_ages);

  const financeResult = calculateBookingFinances({
    arrivalDate: guest.arrival_date,
    departureDate: guest.departure_date,
    adults: guest.adults || 2,
    rentalPrice: guest.rental_price ?? 0,
    platform: guest.platform ?? null,
    hasDog,
    isPrivate: guest.is_private === 1,
    privateConfig: parsePrivateConfig(guest.private_config),
    skipNk,
    isCleaningCash,
    isUtilitiesCash,
    isKurtaxeCash,
    platformFees: pFees as PlatformFees,
    pricingSettings: pricing,
    komfortpaket,
    childrenAges,
  });

  const {
    utilityCosts: costCalc,
    totalNkCosts: totalCalculatedCosts,
    cleaningCost,
    mieterlos,
    provision: commission,
    gesamteinzahlung,
    calculatedCostsForMieterlos,
    komfortpaketCosts,
    komfortpaketEnabled,
  } = financeResult;

  // Gesamtzahlung Gast / Gebühren Plattform
  const platformFeesTotal = (pFees.platform_service_fee || 0) + (pFees.payment_processing_fee || 0);
  const guestTotalPayment = (pFees.guest_total_payment && pFees.guest_total_payment > 0)
    ? pFees.guest_total_payment
    : gesamteinzahlung;
  const ueberschuss = mieterlos - commission;

  const fmtDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  return (
    <div className="border border-gray-300 rounded p-3 mb-3 text-xs break-inside-avoid">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-2 mb-2">
        <div>
          <div className="font-bold text-sm">{guest.guest_name}</div>
          <div className="text-gray-600">{fmtDate(guest.arrival_date)} – {fmtDate(guest.departure_date)}</div>
          <div className="text-gray-500">
            {guest.adults} Erw.{guest.children > 0 ? `, ${guest.children} Kind.` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">{guest.platform || '-'}</div>
          {guest.booking_number && <div className="text-gray-500">#{guest.booking_number}</div>}
        </div>
      </div>

      {/* Financial Flow - same logic as table columns */}
      <table className="w-full text-xs">
        <tbody>
          {/* 1. Gesamtzahlung Gast */}
          <tr className="font-medium">
            <td className="py-0.5">Gesamtzahlung Gast:</td>
            <td className="text-right py-0.5 text-blue-700">{formatCurrency(guestTotalPayment)}</td>
          </tr>

          {/* 2. Gebühren Plattform */}
          {platformFeesTotal > 0 && (
            <>
              <tr>
                <td className="py-0.5">Gebühren Plattform:</td>
                <td className="text-right py-0.5 text-gray-600">-{formatCurrency(platformFeesTotal)}</td>
              </tr>
              {(pFees.platform_service_fee || 0) > 0 && (
                <tr className="text-gray-400">
                  <td className="pl-3 text-[10px]">Service-Gebühr:</td>
                  <td className="text-right text-[10px]">{formatCurrency(pFees.platform_service_fee || 0)}</td>
                </tr>
              )}
              {(pFees.payment_processing_fee || 0) > 0 && (
                <tr className="text-gray-400">
                  <td className="pl-3 text-[10px]">Zahlungsabwicklung:</td>
                  <td className="text-right text-[10px]">{formatCurrency(pFees.payment_processing_fee || 0)}</td>
                </tr>
              )}
            </>
          )}

          {/* 3. Gesamteinzahlung */}
          <tr className="font-medium border-t">
            <td className="py-0.5">Gesamteinzahlung:</td>
            <td className="text-right py-0.5 text-green-700">{formatCurrency(gesamteinzahlung)}</td>
          </tr>

          {/* 4. Kalkulatorische Kosten (with drill-down) */}
          <tr className="font-medium">
            <td className="py-0.5">Kalkulatorische Kosten:</td>
            <td className="text-right py-0.5 text-gray-700">{formatCurrency(calculatedCostsForMieterlos)}</td>
          </tr>
          {/* Drill-down */}
          {!skipNk && totalCalculatedCosts > 0 && (
            <>
              <tr className="text-gray-400">
                <td className="pl-3 text-[10px]">NK (kalk.){isUtilitiesCash && ' (bar)'}:</td>
                <td className="text-right text-[10px]">{formatCurrency(totalCalculatedCosts)}</td>
              </tr>
              {costCalc && (
                <>
                  {costCalc.breakdown.kurtaxe > 0 && <tr className="text-gray-400"><td className="pl-6 text-[10px]">Kurtaxe ({costCalc.breakdown.kurtaxeDetails}):</td><td className="text-right text-[10px]">{formatCurrency(costCalc.breakdown.kurtaxe)}</td></tr>}
                  {costCalc.breakdown.holz > 0 && <tr className="text-gray-400"><td className="pl-6 text-[10px]">Holz ({costCalc.breakdown.holzBuendel} Bündel):</td><td className="text-right text-[10px]">{formatCurrency(costCalc.breakdown.holz)}</td></tr>}
                  {costCalc.breakdown.water > 0 && <tr className="text-gray-400"><td className="pl-6 text-[10px]">Wasser:</td><td className="text-right text-[10px]">{formatCurrency(costCalc.breakdown.water)}</td></tr>}
                  {costCalc.breakdown.trash > 0 && <tr className="text-gray-400"><td className="pl-6 text-[10px]">Müll ({costCalc.breakdown.trashBags} Säcke):</td><td className="text-right text-[10px]">{formatCurrency(costCalc.breakdown.trash)}</td></tr>}
                  {costCalc.breakdown.electricity > 0 && <tr className="text-gray-400"><td className="pl-6 text-[10px]">Strom ({costCalc.breakdown.electricityKwh} kWh inkl.):</td><td className="text-right text-[10px]">{formatCurrency(costCalc.breakdown.electricity)}</td></tr>}
                </>
              )}
            </>
          )}
          {cleaningCost > 0 && (
            <tr className="text-gray-400">
              <td className="pl-3 text-[10px]">Reinigung{isCleaningCash && ' (bar)'}:</td>
              <td className="text-right text-[10px]">{formatCurrency(cleaningCost)}</td>
            </tr>
          )}
          {komfortpaketEnabled && komfortpaketCosts > 0 && (
            <tr className="text-gray-400">
              <td className="pl-3 text-[10px]">Komfortpaket ({komfortpaket?.persons || 0} Pers.):</td>
              <td className="text-right text-[10px]">{formatCurrency(komfortpaketCosts)}</td>
            </tr>
          )}

          {/* 5. Mieterlös */}
          <tr className="font-medium border-t">
            <td className="py-0.5">Mieterlös:</td>
            <td className="text-right py-0.5 text-purple-700">{formatCurrency(mieterlos)}</td>
          </tr>
          <tr className="text-gray-400">
            <td colSpan={2} className="text-[10px]">
              = {formatCurrency(gesamteinzahlung)} - {formatCurrency(calculatedCostsForMieterlos)}
            </td>
          </tr>

          {/* 6. Provision */}
          <tr className="font-medium">
            <td className="py-0.5">Provision (10%):</td>
            <td className="text-right py-0.5 text-purple-700">-{formatCurrency(commission)}</td>
          </tr>

          {/* 7. Überschuss */}
          <tr className="border-t-2 font-bold">
            <td className="py-1">Überschuss:</td>
            <td className={`text-right py-1 ${ueberschuss >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(ueberschuss)}</td>
          </tr>
        </tbody>
      </table>

      {guest.other_notes && <div className="mt-2 pt-2 border-t text-gray-600 italic">{guest.other_notes}</div>}
    </div>
  );
}

/**
 * Berechnet die Finanzdaten eines Gastes für die Druckansicht.
 * Verwendet die zentrale calculateBookingFinances-Funktion.
 */
function calculateGuestFinanceForPrint(guest: FinanceGuest, pricing?: PricingSettings) {
  const hasDog = guest.pets?.toLowerCase().includes('hund') ?? false;
  const isCleaningCash = guest.cleaning_cash === 1 || (guest.final_cleaning?.includes('vor Ort') ?? false);
  const isUtilitiesCash = guest.utilities_cash === 1;
  const isKurtaxeCash = guest.kurtaxe_cash === 1;
  const additionalCostsJson = guest.booking_additional_costs || guest.additional_costs;
  const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
  const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);
  const childrenAges = parseChildrenAges(guest.children_ages);

  const financeResult = calculateBookingFinances({
    arrivalDate: guest.arrival_date,
    departureDate: guest.departure_date,
    adults: guest.adults || 2,
    rentalPrice: guest.rental_price ?? 0,
    platform: guest.platform ?? null,
    hasDog,
    isPrivate: guest.is_private === 1,
    privateConfig: parsePrivateConfig(guest.private_config),
    skipNk: guest.no_nebenkosten === 1,
    isCleaningCash,
    isUtilitiesCash,
    isKurtaxeCash,
    platformFees: platformFees as PlatformFees,
    pricingSettings: pricing,
    komfortpaket,
    childrenAges,
  });

  return {
    platformFeesTotal: (platformFees.platform_service_fee || 0) + (platformFees.payment_processing_fee || 0),
    guestTotalPayment: (platformFees.guest_total_payment && platformFees.guest_total_payment > 0)
      ? platformFees.guest_total_payment
      : financeResult.gesamteinzahlung,
    gesamteinzahlung: financeResult.gesamteinzahlung,
    calculatedCostsForMieterlos: financeResult.calculatedCostsForMieterlos,
    mieterlos: financeResult.mieterlos,
    provision: financeResult.provision,
    gesamtertrag: financeResult.gesamtertrag,
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

function getPlatformShort(platform: string | null): string {
  if (!platform) return '-';
  const p = platform.toLowerCase();
  if (p === 'booking.com') return 'Booking.com';
  if (p === 'airbnb') return 'Airbnb';
  if (p.includes('fewo')) return 'FeWo';
  if (p.includes('feratel')) return 'Feratel';
  if (p.includes('mail') || p.includes('e-mail')) return 'Mail';
  return platform;
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

  // Quarter label helper
  const QUARTER_MONTH_LABELS = ['Jan-Mär', 'Apr-Jun', 'Jul-Sep', 'Okt-Dez'];
  const MONTH_NAMES = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];

  return (
    <div className="hidden print:block p-4 text-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">Finanzübersicht {year}</h1>
        <div className="text-gray-500">Sechszirbenhütte</div>
      </div>

      {/* Year KPIs */}
      <div className="mb-6 p-4 border-2 border-gray-400 rounded-lg">
        <h2 className="font-bold text-lg mb-3">Jahres-Kennzahlen {year}</h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-blue-700">{formatCurrency(yearlyTotals.guestTotalPayment)}</div>
            <div className="text-[10px] text-gray-600">Gesamt. Gast</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">-{formatCurrency(yearlyTotals.platformFeesTotal)}</div>
            <div className="text-[10px] text-gray-600">Geb. Plattform</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-700">{formatCurrency(yearlyTotals.gesamteinzahlung)}</div>
            <div className="text-[10px] text-gray-600">Gesamteinzahlung</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">{formatCurrency(yearlyTotals.kalkKosten)}</div>
            <div className="text-[10px] text-gray-600">Kalk. Kosten</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-700">{formatCurrency(yearlyTotals.mieterlos)}</div>
            <div className="text-[10px] text-gray-600">Mieterlös</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-700">-{formatCurrency(yearlyTotals.commission)}</div>
            <div className="text-[10px] text-gray-600">Provision</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-700">{formatCurrency(yearlyTotals.mieterlos - yearlyTotals.commission)}</div>
            <div className="text-[10px] text-gray-600">Überschuss</div>
            <div className="text-[8px] text-gray-400">vor Steuern & Versicherung</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t text-center text-sm">
          <div>
            <span className="text-gray-600">Buchungen:</span>{' '}
            <span className="font-bold">{yearlyTotals.guestCount}</span>
          </div>
        </div>
      </div>

      {/* Monthly Tables – Spalten: Gesamtzahlung, Kalk. Kosten, Mieterlös, Provision, Gewinn */}
      {quarterData.map((q) => (
        <div key={q.quarter} className="mb-4">
          {q.months.map((month) => {
            if (month.guests.length === 0) return null;

            // Calculate finance for all guests in this month
            const guestFinances = month.guests.map(guest => ({
              guest,
              finance: calculateGuestFinanceForPrint(guest, pricing),
            }));

            // Calculate month totals
            const monthTotals = guestFinances.reduce((acc, { finance }) => ({
              guestTotalPayment: acc.guestTotalPayment + finance.guestTotalPayment,
              platformFeesTotal: acc.platformFeesTotal + finance.platformFeesTotal,
              gesamteinzahlung: acc.gesamteinzahlung + finance.gesamteinzahlung,
              calculatedCosts: acc.calculatedCosts + finance.calculatedCostsForMieterlos,
              mieterlos: acc.mieterlos + finance.mieterlos,
              provision: acc.provision + finance.provision,
              gewinn: acc.gewinn + finance.gesamtertrag,
            }), { guestTotalPayment: 0, platformFeesTotal: 0, gesamteinzahlung: 0, calculatedCosts: 0, mieterlos: 0, provision: 0, gewinn: 0 });

            return (
              <div key={month.month} className="mb-4">
                {/* Month Header */}
                <div className="flex items-center justify-between bg-gray-100 px-2 py-1 border-b border-gray-300">
                  <h3 className="font-bold text-sm">{MONTH_NAMES[month.month]} {year}</h3>
                  <span className="text-xs text-gray-600">{month.guests.length} Buchungen</span>
                </div>

                {/* Guest Table */}
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500">Gast</th>
                      <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500">Plattform</th>
                      <th className="px-2 py-1 text-center text-[10px] font-medium text-gray-500">Anreise</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-blue-600">Ges. Gast</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-gray-500">Geb. Platf.</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-green-600">Gesamt&shy;einz.</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-gray-500">Kalk. K.</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-purple-600 bg-purple-50">Mieterlös</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-purple-600">Prov.</th>
                      <th className="px-1 py-1 text-right text-[10px] font-medium text-emerald-600 bg-emerald-50">Gewinn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestFinances.map(({ guest, finance }) => (
                      <tr key={guest.id} className="border-b border-gray-100">
                        <td className="px-2 py-1 font-medium text-gray-900 truncate max-w-[120px]">{guest.guest_name}</td>
                        <td className="px-2 py-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            guest.platform?.toLowerCase() === 'booking.com' ? 'bg-blue-100 text-blue-800' :
                            guest.platform?.toLowerCase() === 'airbnb' ? 'bg-red-100 text-red-800' :
                            guest.platform?.toLowerCase()?.includes('fewo') ? 'bg-orange-100 text-orange-800' :
                            guest.platform?.toLowerCase()?.includes('feratel') ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getPlatformShort(guest.platform)}
                          </span>
                        </td>
                        <td className="px-1 py-1 text-center text-gray-600">{formatDate(guest.arrival_date)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-blue-700">{formatCurrency(finance.guestTotalPayment)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-gray-500">{finance.platformFeesTotal > 0 ? `-${formatCurrency(finance.platformFeesTotal)}` : formatCurrency(0)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-green-700">{formatCurrency(finance.gesamteinzahlung)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-gray-600">{formatCurrency(finance.calculatedCostsForMieterlos)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-purple-700 bg-purple-50">{formatCurrency(finance.mieterlos)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-purple-700">{formatCurrency(finance.provision)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-emerald-700 bg-emerald-50">{formatCurrency(finance.gesamtertrag)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {month.guests.length > 1 && (
                    <tfoot>
                      <tr className="bg-gray-100 font-bold border-t border-gray-300">
                        <td colSpan={3} className="px-1 py-1 text-right text-[10px] text-gray-600">Summe:</td>
                        <td className="px-1 py-1 text-right text-blue-800">{formatCurrency(monthTotals.guestTotalPayment)}</td>
                        <td className="px-1 py-1 text-right text-gray-600">-{formatCurrency(monthTotals.platformFeesTotal)}</td>
                        <td className="px-1 py-1 text-right text-green-800">{formatCurrency(monthTotals.gesamteinzahlung)}</td>
                        <td className="px-1 py-1 text-right text-gray-700">{formatCurrency(monthTotals.calculatedCosts)}</td>
                        <td className="px-1 py-1 text-right text-purple-800 bg-purple-100">{formatCurrency(monthTotals.mieterlos)}</td>
                        <td className="px-1 py-1 text-right text-purple-800">{formatCurrency(monthTotals.provision)}</td>
                        <td className="px-1 py-1 text-right text-emerald-800 bg-emerald-100">{formatCurrency(monthTotals.gewinn)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            );
          })}

          {/* Quarter Summary */}
          {(() => {
            const quarterFinances = q.months.flatMap(m =>
              m.guests.map(guest => calculateGuestFinanceForPrint(guest, pricing))
            );
            const qTotals = quarterFinances.reduce((acc, f) => ({
              gesamteinzahlung: acc.gesamteinzahlung + f.gesamteinzahlung,
              calculatedCosts: acc.calculatedCosts + f.calculatedCostsForMieterlos,
              mieterlos: acc.mieterlos + f.mieterlos,
              provision: acc.provision + f.provision,
              gewinn: acc.gewinn + f.gesamtertrag,
            }), { gesamteinzahlung: 0, calculatedCosts: 0, mieterlos: 0, provision: 0, gewinn: 0 });

            return (
              <div className="bg-gray-50 px-2 py-1 border-t-2 border-gray-400 flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-gray-900">Summe Q{q.quarter} ({QUARTER_MONTH_LABELS[q.quarter - 1]})</span>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-green-700">M: {formatCurrency(qTotals.mieterlos)}</span>
                  <span className="text-gray-700">NK: {formatCurrency(qTotals.calculatedCosts)}</span>
                  <span className="text-purple-700">P: {formatCurrency(qTotals.provision)}</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Σ {formatCurrency(qTotals.gesamteinzahlung)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      ))}

      {/* Detail Breakdown per Booking */}
      {quarterData.map((q) => (
        <div key={`detail-${q.quarter}`} className="mb-6 break-before-page">
          <h2 className="font-bold text-lg mb-3 border-b-2 pb-1">
            Q{q.quarter} – Detail
          </h2>
          {q.months.map((month) => (
            month.guests.length > 0 && (
              <div key={month.month} className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">{MONTH_NAMES[month.month]} {year}</h3>
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
