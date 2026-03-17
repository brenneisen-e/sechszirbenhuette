'use client';

import { Calendar, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { calculateMiete, type PlatformFees as FinanceCalcPlatformFees } from '@/lib/utils/financeCalculations';
import { calculateUtilityCostsForBooking } from '../UtilityCostsCalculator';
import { QUARTER_LABELS } from './constants';
import { formatDate, getPlatformBadge } from './utils';
import type { QuarterData } from './types';
import type { PricingSettings } from '../utility-costs';

interface FinanceQuarterlyTableProps {
  quarterData: QuarterData[];
  selectedYear: number;
  expandedQuarters: Set<number>;
  onToggleQuarter: (quarter: number) => void;
  onSelectBooking: (guest: QuarterData['months'][0]['guests'][0]) => void;
  getQuarterExpenses: (quarter: number) => number;
  yearlyTotals: {
    revenue: number;
    nk: number;
    commission: number;
    guestCount: number;
  };
  yearlyExpenses: number;
  yearlyProfit: number;
  pricing: PricingSettings;
}

export function FinanceQuarterlyTable({
  quarterData,
  selectedYear,
  expandedQuarters,
  onToggleQuarter,
  onSelectBooking,
  getQuarterExpenses,
  yearlyTotals,
  yearlyExpenses,
  yearlyProfit,
  pricing,
}: FinanceQuarterlyTableProps) {
  return (
    <>
      {/* Quarters Overview Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden print:hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Quartalsübersicht {selectedYear}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">Quartal</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">Buch.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-green-600 uppercase">Miete</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-blue-600 uppercase">NK</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase bg-emerald-50">Σ</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-red-600 uppercase bg-red-50">Ausg.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-purple-600 uppercase bg-purple-50">
                  Prov.
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-600 uppercase bg-yellow-50">
                  Gewinn
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quarterData.map((q) => {
                const quarterExpenses = getQuarterExpenses(q.quarter);
                const quarterNk = q.months.reduce((sum, m) =>
                  sum + m.guests.reduce((s, g) => s + (g.ancillary_costs_amount || 0), 0), 0);
                const quarterTotalIncome = q.totalRevenue + quarterNk;
                const quarterProfit = quarterTotalIncome - quarterExpenses - q.commission;
                return (
                  <tr key={q.quarter} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{QUARTER_LABELS[q.quarter - 1]}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm text-gray-600">{q.guestCount}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-green-700">
                      {formatCurrency(q.totalRevenue)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-blue-700">
                      {formatCurrency(quarterNk)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50">
                      {formatCurrency(quarterTotalIncome)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-red-700 bg-red-50">
                      {formatCurrency(quarterExpenses)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50">
                      {formatCurrency(q.commission)}
                    </td>
                    <td
                      className={`px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold bg-yellow-50 ${quarterProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}
                    >
                      {formatCurrency(quarterProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-200 font-bold">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">Gesamt</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm text-gray-900">{yearlyTotals.guestCount}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-green-800">{formatCurrency(yearlyTotals.revenue)}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-blue-800">{formatCurrency(yearlyTotals.nk)}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-emerald-800 bg-emerald-100">{formatCurrency(yearlyTotals.revenue + yearlyTotals.nk)}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-red-800 bg-red-100">{formatCurrency(yearlyExpenses)}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-purple-800 bg-purple-100">
                  {formatCurrency(yearlyTotals.commission)}
                </td>
                <td
                  className={`px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm bg-yellow-100 ${yearlyProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}
                >
                  {formatCurrency(yearlyProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Monthly Details */}
      {quarterData.map((quarter) => (
        <div key={quarter.quarter} className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Quarter Header - Clickable */}
          <button
            onClick={() => onToggleQuarter(quarter.quarter)}
            className="w-full bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-6 py-3 sm:py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 hover:from-gray-100 hover:to-gray-150 transition-colors text-left"
          >
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">{QUARTER_LABELS[quarter.quarter - 1]}</h3>
                <span className="text-xs sm:text-sm text-gray-500">
                  ({quarter.guestCount} Buch.)
                </span>
              </div>
              <ChevronRight
                className={`sm:hidden w-5 h-5 text-gray-400 transition-transform ${expandedQuarters.has(quarter.quarter) ? 'rotate-90' : ''}`}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-green-700 font-semibold">M: {formatCurrency(quarter.totalRevenue)}</span>
              <span className="text-blue-700 font-semibold">NK: {formatCurrency(quarter.months.reduce((sum, m) => sum + m.guests.reduce((s, g) => s + (g.ancillary_costs_amount || 0), 0), 0))}</span>
              <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded">
                Σ {formatCurrency(quarter.totalRevenue + quarter.months.reduce((sum, m) => sum + m.guests.reduce((s, g) => s + (g.ancillary_costs_amount || 0), 0), 0))}
              </span>
              <ChevronRight
                className={`hidden sm:block w-5 h-5 text-gray-400 transition-transform ${expandedQuarters.has(quarter.quarter) ? 'rotate-90' : ''}`}
              />
            </div>
          </button>

          {/* Monthly Tables - Collapsible */}
          {expandedQuarters.has(quarter.quarter) && (
            <div className="divide-y divide-gray-200">
              {quarter.months.map((monthData) => (
                <div key={monthData.month}>
                  {/* Month Header */}
                  <div className="bg-blue-50 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <h4 className="text-sm sm:text-base font-semibold text-blue-900">
                      {monthData.monthName} {selectedYear}
                    </h4>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                      <span className="text-gray-600">
                        {monthData.guests.length} Buch.
                      </span>
                      <span className="text-green-700 font-medium">M: {formatCurrency(monthData.totalRevenue)}</span>
                      <span className="text-blue-700 font-medium">NK: {formatCurrency(monthData.guests.reduce((sum, g) => sum + (g.ancillary_costs_amount || 0), 0))}</span>
                      <span className="text-emerald-700 font-medium bg-emerald-100 px-2 py-0.5 rounded">
                        Σ {formatCurrency(monthData.totalRevenue + monthData.guests.reduce((sum, g) => sum + (g.ancillary_costs_amount || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Guest Table */}
                  {monthData.guests.length === 0 ? (
                    <div className="px-3 sm:px-6 py-3 sm:py-4 text-center text-gray-400 italic text-xs sm:text-sm">
                      Keine Buchungen in {monthData.monthName}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[600px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500">Gast</th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 hidden sm:table-cell">Plattform</th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-medium text-gray-500">Anreise</th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-green-600">
                              Miete
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-blue-600">
                              NK
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-purple-600">
                              Prov.
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50">
                              Gesamt
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {monthData.guests.map((guest) => {
                            // Parse booking_additional_costs for payout_amount
                            let platformFeesData: FinanceCalcPlatformFees = {};
                            if (guest.booking_additional_costs) {
                              try {
                                platformFeesData = JSON.parse(guest.booking_additional_costs);
                              } catch { /* ignore */ }
                            }

                            // Calculate NK - use actual ancillary_costs_amount, or calculate if paid cash
                            let nk = guest.ancillary_costs_amount || 0;
                            const hasDog = guest.pets?.toLowerCase().includes('hund') ?? false;
                            const isUtilitiesCash = guest.utilities_cash === 1;
                            const isCleaningCash = guest.cleaning_cash === 1 || (guest.final_cleaning?.includes('vor Ort') ?? false);
                            const isBookingCom = guest.platform?.toLowerCase() === 'booking.com';
                            const isAirbnb = guest.platform?.toLowerCase() === 'airbnb';

                            // Calculate costs for NK
                            let calculatedCosts = 0;
                            if (guest.arrival_date && guest.departure_date) {
                              const costCalc = calculateUtilityCostsForBooking(
                                guest.arrival_date,
                                guest.departure_date,
                                guest.adults || 2,
                                pricing,
                                hasDog
                              );
                              if (costCalc) {
                                // NK = costs - cleaning + kurtaxe
                                calculatedCosts = costCalc.costs - (costCalc.breakdown?.reinigung || 0) + costCalc.kurtaxe;
                                if (isUtilitiesCash && nk === 0) {
                                  nk = calculatedCosts;
                                }
                              }
                            }

                            // Add cleaning if paid cash
                            const cleaningCost = hasDog ? 125 : 100;
                            const barReinigung = isCleaningCash ? cleaningCost : 0;

                            // Use central calculateMiete for consistent calculation
                            const mieteResult = calculateMiete({
                              platformFees: platformFeesData,
                              rentalPrice: guest.rental_price || 0,
                              isBookingCom,
                              isAirbnb,
                              isCleaningCash,
                              isUtilitiesCash,
                              calculatedCosts,
                            });

                            const { basisMiete, provision } = mieteResult;
                            const gesamt = basisMiete + nk + barReinigung;
                            return (
                              <tr
                                key={guest.id}
                                className="hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={() => onSelectBooking(guest)}
                              >
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium text-gray-900 truncate max-w-[120px]">{guest.guest_name}</td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 hidden sm:table-cell">{getPlatformBadge(guest.platform)}</td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-center text-gray-600">{formatDate(guest.arrival_date)}</td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-green-700">
                                  {formatCurrency(basisMiete)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-blue-700">
                                  {formatCurrency(nk + barReinigung)}
                                  {(isUtilitiesCash || isCleaningCash) && <span className="text-xs text-gray-500 ml-0.5">(bar)</span>}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-purple-700">
                                  {formatCurrency(provision)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-emerald-700 bg-emerald-50">
                                  {formatCurrency(gesamt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {monthData.guests.length > 1 && (
                          <tfoot className="bg-gray-100">
                            {(() => {
                              // Calculate total NK including bar payments
                              const totalNk = monthData.guests.reduce((sum, g) => {
                                let nk = g.ancillary_costs_amount || 0;
                                const hasDog = g.pets?.toLowerCase().includes('hund') ?? false;
                                const isUtilitiesCash = g.utilities_cash === 1;
                                const isCleaningCash = g.cleaning_cash === 1 || (g.final_cleaning?.includes('vor Ort') ?? false);
                                const cleaningCost = hasDog ? 125 : 100;

                                if (isUtilitiesCash && g.arrival_date && g.departure_date && nk === 0) {
                                  const costCalc = calculateUtilityCostsForBooking(g.arrival_date, g.departure_date, g.adults || 2, pricing, hasDog);
                                  if (costCalc) {
                                    nk = costCalc.costs - (costCalc.breakdown?.reinigung || 0) + costCalc.kurtaxe;
                                  }
                                }
                                const barReinigung = isCleaningCash ? cleaningCost : 0;
                                return sum + nk + barReinigung;
                              }, 0);
                              return (
                                <tr>
                                  <td colSpan={3} className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-gray-600">
                                    Summe:
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-green-800 text-xs sm:text-sm">
                                    {formatCurrency(monthData.totalRevenue)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-blue-800 text-xs sm:text-sm">
                                    {formatCurrency(totalNk)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-purple-800 text-xs sm:text-sm">
                                    {formatCurrency(monthData.commission)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-emerald-800 bg-emerald-100 text-xs sm:text-sm">
                                    {formatCurrency(monthData.totalRevenue + totalNk)}
                                  </td>
                                </tr>
                              );
                            })()}
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Quarter Summary Row */}
              {(() => {
                // Calculate total NK including bar payments for quarter
                const quarterTotalNk = quarter.months.reduce((mSum, m) => mSum + m.guests.reduce((sum, g) => {
                  let nk = g.ancillary_costs_amount || 0;
                  const hasDog = g.pets?.toLowerCase().includes('hund') ?? false;
                  const isUtilitiesCash = g.utilities_cash === 1;
                  const isCleaningCash = g.cleaning_cash === 1 || (g.final_cleaning?.includes('vor Ort') ?? false);
                  const cleaningCost = hasDog ? 125 : 100;
                  if (isUtilitiesCash && g.arrival_date && g.departure_date && nk === 0) {
                    const costCalc = calculateUtilityCostsForBooking(g.arrival_date, g.departure_date, g.adults || 2, pricing, hasDog);
                    if (costCalc) nk = costCalc.costs - (costCalc.breakdown?.reinigung || 0) + costCalc.kurtaxe;
                  }
                  return sum + nk + (isCleaningCash ? cleaningCost : 0);
                }, 0), 0);
                return (
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-gray-900">Summe {QUARTER_LABELS[quarter.quarter - 1]}</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-sm font-bold text-green-800">M: {formatCurrency(quarter.totalRevenue)}</span>
                      <span className="text-sm font-bold text-blue-800">NK: {formatCurrency(quarterTotalNk)}</span>
                      <span className="text-sm sm:text-base font-bold text-emerald-800 bg-emerald-200 px-2 sm:px-3 py-0.5 sm:py-1 rounded">
                        Σ {formatCurrency(quarter.totalRevenue + quarterTotalNk)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
