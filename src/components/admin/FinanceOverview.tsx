'use client';

import { useState } from 'react';
import {
  Euro,
  ChevronLeft,
  ChevronRight,
  Loader2,
  HelpCircle,
  Printer,
} from 'lucide-react';
import {
  BookingDetailPopup,
  CalculationExplanationPopup,
  FinancePrintView,
  FinanceSummaryCards,
  FinanceQuarterlyTable,
  useFinanceData,
} from './finance-overview';
import { getAvailableYears } from './finance-overview/utils';
import type { FinanceGuest } from './finance-overview';

interface FinanceOverviewProps {
  adminPassword: string;
  onNavigateToGuest?: (guestId: number) => void;
}

export default function FinanceOverview({ adminPassword, onNavigateToGuest }: FinanceOverviewProps) {
  // Default to 2026 as we're almost there
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedBooking, setSelectedBooking] = useState<FinanceGuest | null>(null);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    loading,
    allGuests,
    quarterData,
    pricing,
    platformFees,
    getQuarterExpenses,
    getYearlyExpenses,
  } = useFinanceData({ adminPassword, selectedYear });

  const toggleQuarter = (quarter: number) => {
    const newExpanded = new Set(expandedQuarters);
    if (newExpanded.has(quarter)) {
      newExpanded.delete(quarter);
    } else {
      newExpanded.add(quarter);
    }
    setExpandedQuarters(newExpanded);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate yearly totals including NK
  const yearlyTotals = quarterData.reduce(
    (acc, q) => {
      const quarterNk = q.months.reduce((sum, m) =>
        sum + m.guests.reduce((s, g) => s + (g.ancillary_costs_amount || 0), 0), 0);
      return {
        revenue: acc.revenue + q.totalRevenue,
        nk: acc.nk + quarterNk,
        commission: acc.commission + q.commission,
        guestCount: acc.guestCount + q.guestCount,
      };
    },
    { revenue: 0, nk: 0, commission: 0, guestCount: 0 }
  );

  const yearlyExpenses = getYearlyExpenses();
  const totalPlatformFees = platformFees.platform_service_fee + platformFees.payment_processing_fee;
  const yearlyTotalIncome = yearlyTotals.revenue + yearlyTotals.nk;
  const yearlyProfit = yearlyTotalIncome - yearlyExpenses - yearlyTotals.commission - totalPlatformFees;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3">Lade Finanzdaten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              Finanzübersicht {selectedYear}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Monatliche und quartalsweise Übersicht</p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
            <button
              onClick={() => setShowExplanation(true)}
              className="p-2 sm:px-4 sm:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors print:hidden"
              title="Berechnungserklärung"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="hidden sm:inline ml-2">Erklärung</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors print:hidden"
              title="Drucken"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden sm:inline ml-2">Drucken</span>
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-2 sm:px-4 py-2 border border-gray-300 rounded-lg font-semibold text-base sm:text-lg"
              >
                {getAvailableYears(allGuests).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Yearly Summary Cards */}
        <FinanceSummaryCards
          yearlyTotals={yearlyTotals}
          yearlyExpenses={yearlyExpenses}
          platformFees={platformFees}
        />
      </div>

      {/* Quarterly Table + Monthly Details */}
      <FinanceQuarterlyTable
        quarterData={quarterData}
        selectedYear={selectedYear}
        expandedQuarters={expandedQuarters}
        onToggleQuarter={toggleQuarter}
        onSelectBooking={setSelectedBooking}
        getQuarterExpenses={getQuarterExpenses}
        yearlyTotals={yearlyTotals}
        yearlyExpenses={yearlyExpenses}
        yearlyProfit={yearlyProfit}
        pricing={pricing}
      />

      {/* Booking Detail Popup */}
      {selectedBooking && (
        <BookingDetailPopup
          guest={selectedBooking}
          pricing={pricing}
          onClose={() => setSelectedBooking(null)}
          onNavigateToGuest={
            onNavigateToGuest
              ? () => {
                  const guestId = selectedBooking.id;
                  setSelectedBooking(null);
                  onNavigateToGuest(guestId);
                }
              : undefined
          }
        />
      )}

      {/* Calculation Explanation Popup */}
      {showExplanation && <CalculationExplanationPopup onClose={() => setShowExplanation(false)} />}

      {/* Print View - hidden on screen, shown when printing */}
      <FinancePrintView
        year={selectedYear}
        quarterData={quarterData}
        yearlyTotals={yearlyTotals}
        yearlyExpenses={yearlyExpenses}
        platformFees={platformFees}
        pricing={pricing}
      />
    </div>
  );
}
