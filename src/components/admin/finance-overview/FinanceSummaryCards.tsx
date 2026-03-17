'use client';

import { Euro, TrendingUp, TrendingDown, PiggyBank, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import type { PlatformFees } from './types';

interface YearlyTotals {
  revenue: number;
  nk: number;
  commission: number;
  guestCount: number;
}

interface FinanceSummaryCardsProps {
  yearlyTotals: YearlyTotals;
  yearlyExpenses: number;
  platformFees: PlatformFees;
}

export function FinanceSummaryCards({
  yearlyTotals,
  yearlyExpenses,
  platformFees,
}: FinanceSummaryCardsProps) {
  const totalPlatformFees = platformFees.platform_service_fee + platformFees.payment_processing_fee;
  const yearlyTotalIncome = yearlyTotals.revenue + yearlyTotals.nk;
  const yearlyProfit = yearlyTotalIncome - yearlyExpenses - yearlyTotals.commission - totalPlatformFees;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
      <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-green-700 mb-1">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Miete</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold text-green-800">{formatCurrency(yearlyTotals.revenue)}</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-blue-700 mb-1">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">NK</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold text-blue-800">{formatCurrency(yearlyTotals.nk)}</p>
      </div>

      <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700 mb-1">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Σ Einnahmen</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold text-emerald-800">{formatCurrency(yearlyTotalIncome)}</p>
      </div>

      <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-purple-700 mb-1">
          <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Provision</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold text-purple-800">{formatCurrency(yearlyTotals.commission)}</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-blue-700 mb-1">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Buchungen</span>
        </div>
        <p className="text-xl sm:text-3xl font-bold text-blue-800">{yearlyTotals.guestCount}</p>
      </div>

      <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
        <div className="flex items-center gap-1.5 sm:gap-2 text-red-700 mb-1">
          <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Ausgaben</span>
        </div>
        <p className="text-xl sm:text-3xl font-bold text-red-800">{formatCurrency(yearlyExpenses)}</p>
      </div>

      {/* Platform Fees Card - only show if there are fees */}
      {totalPlatformFees > 0 && (
        <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200">
          <div className="flex items-center gap-1.5 sm:gap-2 text-orange-700 mb-1">
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Plattform</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-800">{formatCurrency(totalPlatformFees)}</p>
          <p className="text-[10px] sm:text-xs text-orange-600 mt-0.5">
            Service: {formatCurrency(platformFees.platform_service_fee)} | Zahlung: {formatCurrency(platformFees.payment_processing_fee)}
          </p>
        </div>
      )}

      <div
        className={`col-span-2 sm:col-span-1 rounded-lg p-3 sm:p-4 border ${yearlyProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}
      >
        <div className={`flex items-center gap-1.5 sm:gap-2 mb-1 ${yearlyProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
          <Euro className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Gewinn/Verlust</span>
        </div>
        <p className={`text-xl sm:text-3xl font-bold ${yearlyProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>
          {formatCurrency(yearlyProfit)}
        </p>
      </div>
    </div>
  );
}
