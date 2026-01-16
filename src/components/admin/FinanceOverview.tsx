'use client';

import { useState, useEffect } from 'react';
import {
  Euro,
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Users,
  Printer,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { calculateMiete, type PlatformFees as FinanceCalcPlatformFees } from '@/lib/utils/financeCalculations';
import { calculateUtilityCostsForBooking } from './UtilityCostsCalculator';
import {
  BookingDetailPopup,
  CalculationExplanationPopup,
  FinancePrintView,
  MONTH_NAMES,
  QUARTER_LABELS,
} from './finance-overview';
import type { FinanceGuest, MonthData, QuarterData, ExpenseRecord, BookingWithFees, PlatformFees } from './finance-overview';
import type { PricingSettings } from './utility-costs';
import { DEFAULT_PRICING } from './utility-costs';

interface FinanceOverviewProps {
  adminPassword: string;
  onNavigateToGuest?: (guestId: number) => void;
}

export default function FinanceOverview({ adminPassword, onNavigateToGuest }: FinanceOverviewProps) {
  const [loading, setLoading] = useState(true);
  // Default to 2026 as we're almost there
  const [selectedYear, setSelectedYear] = useState(2026);
  const [allGuests, setAllGuests] = useState<FinanceGuest[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<FinanceGuest | null>(null);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [quarterData, setQuarterData] = useState<QuarterData[]>([]);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [showExplanation, setShowExplanation] = useState(false);
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [platformFees, setPlatformFees] = useState<PlatformFees>({ platform_service_fee: 0, payment_processing_fee: 0 });

  // Load data when year changes
  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Recalculate data when year or guests change
  useEffect(() => {
    calculateFinanceData();
  }, [selectedYear, allGuests]);

  // Get expenses for a specific month
  const getMonthExpenses = (month: number): number => {
    return allExpenses.filter((e) => e.year === selectedYear && e.month === month).reduce((sum, e) => sum + e.amount, 0);
  };

  // Get expenses for a quarter (months 1-3, 4-6, 7-9, 10-12)
  const getQuarterExpenses = (quarter: number): number => {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return allExpenses
      .filter((e) => e.year === selectedYear && e.month >= startMonth && e.month <= endMonth)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // Get total yearly expenses
  const getYearlyExpenses = (): number => {
    return allExpenses.filter((e) => e.year === selectedYear).reduce((sum, e) => sum + e.amount, 0);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Helper function to parse platform fees from additional_costs JSON
  // Now supports both old format (platform_service_fee + payment_processing_fee)
  // and new format (transactions with individual fees)
  const parsePlatformFees = (additionalCosts: string | null): PlatformFees => {
    if (!additionalCosts) return { platform_service_fee: 0, payment_processing_fee: 0 };
    try {
      const parsed = JSON.parse(additionalCosts);

      // Check if we have transactions with fees (new format)
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        const totalFeesFromTransactions = parsed.transactions.reduce(
          (sum: number, t: { fee?: number }) => sum + (t.fee || 0),
          0
        );
        if (totalFeesFromTransactions > 0) {
          return {
            platform_service_fee: totalFeesFromTransactions,
            payment_processing_fee: 0, // Combined into platform_service_fee
          };
        }
      }

      // Fallback to old format
      return {
        platform_service_fee: parsed.platform_service_fee || 0,
        payment_processing_fee: parsed.payment_processing_fee || 0,
      };
    } catch {
      return { platform_service_fee: 0, payment_processing_fee: 0 };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [guestsRes, expensesRes, settingsRes, bookingsRes] = await Promise.all([
        fetch('/api/admin/guests'),
        fetch(`/api/admin/expenses?year=${selectedYear}`),
        fetch('/api/admin/settings'),
        fetch('/api/admin/bookings'),
      ]);
      const guestsData = (await guestsRes.json()) as { guests?: FinanceGuest[] };
      const expensesData = (await expensesRes.json()) as { expenses?: ExpenseRecord[] };
      const settingsData = (await settingsRes.json()) as { settings?: Record<string, string> };
      const bookingsData = (await bookingsRes.json()) as { bookings?: BookingWithFees[] };

      // Create a map of booking data by guest_id (keep only the NEWEST booking per guest)
      // Bookings are ordered by arrival_date DESC, so first one for each guest_id is newest
      const bookings = bookingsData.bookings || [];
      const bookingsByGuestId = new Map<number, { additional_costs: string | null; utilities_cash?: number; cleaning_cash?: number }>();
      for (const booking of bookings) {
        // Only store if we don't already have data for this guest (first = newest)
        if (!bookingsByGuestId.has(booking.guest_id)) {
          bookingsByGuestId.set(booking.guest_id, {
            additional_costs: booking.additional_costs,
            utilities_cash: booking.utilities_cash,
            cleaning_cash: booking.cleaning_cash,
          });
        }
      }

      // Merge guests with booking financial data
      const guestsWithBookingData = (guestsData.guests || []).map(guest => {
        const bookingData = bookingsByGuestId.get(guest.id);
        return {
          ...guest,
          booking_additional_costs: bookingData?.additional_costs || null,
          utilities_cash: bookingData?.utilities_cash,
          cleaning_cash: bookingData?.cleaning_cash,
        };
      });

      setAllGuests(guestsWithBookingData);
      setAllExpenses(expensesData.expenses || []);

      // Calculate platform fees from bookings for the selected year
      const yearlyFees = bookings
        .filter(b => {
          if (!b.arrival_date) return false;
          return new Date(b.arrival_date).getFullYear() === selectedYear;
        })
        .reduce((acc, booking) => {
          const fees = parsePlatformFees(booking.additional_costs);
          return {
            platform_service_fee: acc.platform_service_fee + fees.platform_service_fee,
            payment_processing_fee: acc.payment_processing_fee + fees.payment_processing_fee,
          };
        }, { platform_service_fee: 0, payment_processing_fee: 0 });
      setPlatformFees(yearlyFees);

      // Load pricing settings - merge with defaults to keep kurtaxeRates
      if (settingsData.settings) {
        const loadedPricing: PricingSettings = {
          ...DEFAULT_PRICING, // Keep defaults including kurtaxeRates
          kurtaxe: parseFloat(settingsData.settings.kurtaxe_rate) || DEFAULT_PRICING.kurtaxe,
          holz: parseFloat(settingsData.settings.holz_rate) || DEFAULT_PRICING.holz,
          water: parseFloat(settingsData.settings.water_rate) || DEFAULT_PRICING.water,
          trash: parseFloat(settingsData.settings.trash_rate) || DEFAULT_PRICING.trash,
          electricity: parseFloat(settingsData.settings.electricity_rate) || DEFAULT_PRICING.electricity,
          reinigung: parseFloat(settingsData.settings.reinigung_rate) || DEFAULT_PRICING.reinigung,
        };
        setPricing(loadedPricing);
      }
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinanceData = () => {
    const quarters: QuarterData[] = [];

    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const months: MonthData[] = [];

      for (let m = 0; m < 3; m++) {
        const monthIndex = startMonth + m;

        // Filter guests for this month based on arrival_date, sorted by ascending date
        const monthGuests = allGuests
          .filter((g) => {
            if (!g.arrival_date) return false;
            const arrivalDate = new Date(g.arrival_date);
            return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() === monthIndex;
          })
          .sort((a, b) => {
            const dateA = new Date(a.arrival_date || '').getTime();
            const dateB = new Date(b.arrival_date || '').getTime();
            return dateA - dateB; // Ascending order (earliest first)
          });

        // Calculate revenue (payout_amount from bookings, fallback to rental_price)
        const totalRevenue = monthGuests.reduce((sum, g) => {
          let payoutAmount = 0;
          if (g.booking_additional_costs) {
            try {
              const parsed = JSON.parse(g.booking_additional_costs);
              // Try payout_amount first, then calculate from guest_total_payment - fees
              if (parsed.payout_amount && parsed.payout_amount > 0) {
                payoutAmount = parsed.payout_amount;
              } else if (parsed.guest_total_payment && parsed.guest_total_payment > 0) {
                const fees = parsed.platform_service_fee || 0;
                payoutAmount = parsed.guest_total_payment - fees;
              }
            } catch { /* ignore */ }
          }
          return sum + (payoutAmount > 0 ? payoutAmount : (g.rental_price || 0));
        }, 0);
        // Commission for Malte & Eike:
        // - FeWo: 10% vom Mietanteil (Auszahlung - NK-Ertrag - Reinigungsgebühr)
        // - Booking.com/andere: 10% vom net_rent (nach Abzug der kalkulatorischen Kosten)
        const commission = monthGuests.reduce((sum, g) => {
          const isFeWo = g.platform?.toLowerCase() === 'fewo' ||
                         g.platform?.toLowerCase() === 'fewo-direkt' ||
                         g.platform?.toLowerCase().includes('vrbo');

          // Parse booking_additional_costs for platform fees (from bookings table)
          let platformFees = { payout_amount: 0, nebenkosten_income: 0, cleaning_fee_income: 0, guest_total_payment: 0, platform_service_fee: 0 };
          if (g.booking_additional_costs) {
            try {
              const parsed = JSON.parse(g.booking_additional_costs);
              platformFees = { ...platformFees, ...parsed };
            } catch {
              // Not JSON
            }
          }

          // Calculate effective payout amount
          let effectivePayout = 0;
          if (platformFees.payout_amount > 0) {
            effectivePayout = platformFees.payout_amount;
          } else if (platformFees.guest_total_payment > 0) {
            effectivePayout = platformFees.guest_total_payment - platformFees.platform_service_fee;
          }

          let provisionBasis: number;
          if (isFeWo) {
            // Bei FeWo: 10% vom Mietanteil (Auszahlung - NK-Ertrag - Reinigung)
            if (effectivePayout > 0) {
              provisionBasis = effectivePayout - platformFees.nebenkosten_income - platformFees.cleaning_fee_income;
            } else {
              provisionBasis = g.rental_price ?? 0;
            }
          } else {
            // Bei anderen: 10% vom net_rent (nach Kostenabzug)
            provisionBasis = g.net_rent ?? g.rental_price ?? 0;
          }
          return sum + (provisionBasis * 0.1);
        }, 0);

        months.push({
          month: monthIndex,
          monthName: MONTH_NAMES[monthIndex],
          guests: monthGuests,
          totalRevenue,
          commission,
        });
      }

      const quarterRevenue = months.reduce((sum, m) => sum + m.totalRevenue, 0);
      const quarterCommission = months.reduce((sum, m) => sum + m.commission, 0);
      const quarterGuestCount = months.reduce((sum, m) => sum + m.guests.length, 0);

      quarters.push({
        quarter: q,
        months,
        totalRevenue: quarterRevenue,
        commission: quarterCommission,
        guestCount: quarterGuestCount,
      });
    }

    setQuarterData(quarters);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    allGuests.forEach((g) => {
      if (g.arrival_date) {
        years.add(new Date(g.arrival_date).getFullYear());
      }
    });
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() + 1);
    return Array.from(years).sort((a, b) => b - a);
  };

  const toggleQuarter = (quarter: number) => {
    const newExpanded = new Set(expandedQuarters);
    if (newExpanded.has(quarter)) {
      newExpanded.delete(quarter);
    } else {
      newExpanded.add(quarter);
    }
    setExpandedQuarters(newExpanded);
  };

  // Platform display names and colors (same as GuestDatabase)
  const getPlatformDisplay = (platform: string | null): { name: string; classes: string } => {
    if (!platform) return { name: '-', classes: 'bg-gray-100 text-gray-800' };
    const lower = platform.toLowerCase();

    if (lower.includes('booking')) {
      return { name: 'Booking.com', classes: 'bg-blue-100 text-blue-800' };
    }
    if (lower.includes('fewo') || lower.includes('vrbo')) {
      return { name: 'FeWo', classes: 'bg-orange-100 text-orange-800' };
    }
    if (lower.includes('feratel')) {
      return { name: 'Feratel', classes: 'bg-yellow-100 text-yellow-800' };
    }
    if (lower.includes('airbnb')) {
      return { name: 'Airbnb', classes: 'bg-pink-100 text-pink-800' };
    }
    if (lower === 'mail' || lower === 'direkt' || lower === 'telefon' || lower === 'e-mail') {
      return { name: 'Mail', classes: 'bg-green-100 text-green-800' };
    }
    return { name: platform, classes: 'bg-gray-100 text-gray-800' };
  };

  const getPlatformBadge = (platform: string | null) => {
    const { name, classes } = getPlatformDisplay(platform);
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${classes}`}>{name}</span>;
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
                {getAvailableYears().map((year) => (
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
      </div>

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
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-emerald-800 bg-emerald-100">{formatCurrency(yearlyTotalIncome)}</td>
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
            onClick={() => toggleQuarter(quarter.quarter)}
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
                            // Parse booking_additional_costs for payout_amount (zentrale Utility)
                            let platformFees: FinanceCalcPlatformFees = {};
                            if (guest.booking_additional_costs) {
                              try {
                                platformFees = JSON.parse(guest.booking_additional_costs);
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
                              platformFees,
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
                                onClick={() => setSelectedBooking(guest)}
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
