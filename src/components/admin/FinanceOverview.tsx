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
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { anonymizeGuestName, roundDemoAmount } from '@/lib/utils/demoMode';
import { getEffectiveBookingStatus } from './guest-database/helpers';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseKomfortpaketFromJson,
  parseChildrenAges,
  parsePrivateConfig,
  type PlatformFees as FinanceCalcPlatformFees,
} from '@/lib/utils/financeCalculations';
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
  onNavigateToGuest?: (guestId: number) => void;
  demoMode?: boolean;
}

export default function FinanceOverview({ onNavigateToGuest, demoMode = false }: FinanceOverviewProps) {
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
  const [settingPayoutDates, setSettingPayoutDates] = useState(false);
  const [payoutDatesResult, setPayoutDatesResult] = useState<{ success: boolean; message: string } | null>(null);

  // Demo mode helpers
  const demoFormat = (amount: number): string => {
    if (!demoMode) return formatCurrency(amount);
    return `~${roundDemoAmount(amount).toLocaleString('de-DE')} €`;
  };
  const demoName = (name: string): string => {
    if (!demoMode) return name;
    return anonymizeGuestName(name);
  };

  // Set payout dates for FeWo/Booking bookings
  const handleSetPayoutDates = async () => {
    if (!confirm('Soll für alle FeWo- und Booking.com-Buchungen ohne Auszahlungsdatum das Abreisedatum als Auszahlungsdatum gesetzt werden?')) {
      return;
    }
    setSettingPayoutDates(true);
    setPayoutDatesResult(null);
    try {
      const response = await fetch('/api/admin/bookings/set-payout-dates', {
        method: 'POST',
      });
      const data = await response.json() as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        setPayoutDatesResult({ success: true, message: data.message || 'Auszahlungsdaten gesetzt' });
        // Reload data to reflect changes
        loadData();
      } else {
        setPayoutDatesResult({ success: false, message: data.error || 'Fehler' });
      }
    } catch (error) {
      setPayoutDatesResult({ success: false, message: 'Netzwerkfehler' });
    } finally {
      setSettingPayoutDates(false);
      // Clear result after 5 seconds
      setTimeout(() => setPayoutDatesResult(null), 5000);
    }
  };

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

      // Create a map of guest data by guest_id for name lookup
      const bookings = bookingsData.bookings || [];
      const guestById = new Map<number, FinanceGuest>();
      for (const guest of guestsData.guests || []) {
        guestById.set(guest.id, guest);
      }

      // Create one entry per BOOKING (not per guest) - ensures all bookings are counted
      // This fixes the issue where guests with multiple bookings only had one counted
      const allBookingsWithGuestData: FinanceGuest[] = bookings.map(booking => {
        const guest = guestById.get(booking.guest_id);
        return {
          // Use guest_id for navigation
          id: booking.guest_id,
          guest_name: guest?.guest_name ?? 'Unbekannt',
          // === ALLE DATEN AUS BUCHUNG ===
          rental_price: (booking as { rental_price?: number }).rental_price ?? 0,
          booking_number: (booking as { booking_number?: string | null }).booking_number ?? null,
          arrival_date: booking.arrival_date ?? null,
          departure_date: (booking as { departure_date?: string | null }).departure_date ?? null,
          adults: (booking as { adults?: number }).adults ?? 2,
          children: (booking as { children?: number }).children ?? 0,
          children_ages: (booking as { children_ages?: string | null }).children_ages ?? null,
          pets: (booking as { pets?: string | null }).pets ?? null,
          platform: (booking as { platform?: string | null }).platform ?? null,
          is_private: (booking as { is_private?: number }).is_private ?? 0,
          private_config: (booking as { private_config?: string | null }).private_config ?? null,
          no_nebenkosten: (booking as { no_nebenkosten?: number }).no_nebenkosten ?? 0,
          booking_additional_costs: booking.additional_costs ?? null,
          additional_costs: booking.additional_costs ?? null,
          utilities_cash: booking.utilities_cash ?? 0,
          cleaning_cash: booking.cleaning_cash ?? 0,
          kurtaxe_cash: (booking as { kurtaxe_cash?: number }).kurtaxe_cash ?? 0,
          final_cleaning: (booking as { final_cleaning?: string | null }).final_cleaning ?? null,
          // Deprecated - nicht mehr verwendet
          net_rent: null,
          ancillary_costs_amount: 0,
          final_cleaning_amount: 0,
          // Required by FinanceGuest type but not used for calculations
          deposit_amount: guest?.deposit_amount ?? 0,
          deposit_paid: guest?.deposit_paid ?? 0,
          final_payment: guest?.final_payment ?? 0,
          final_payment_paid: guest?.final_payment_paid ?? 0,
          electricity_flat: guest?.electricity_flat ?? 0,
          additional_payment: guest?.additional_payment ?? 0,
          security_deposit: guest?.security_deposit ?? 0,
          status: getEffectiveBookingStatus(
            (booking as { status?: string }).status ?? guest?.status ?? '',
            (booking as { departure_date?: string | null }).departure_date ?? null,
            (booking as { arrival_date?: string | null }).arrival_date ?? null
          ),
        };
      });

      setAllGuests(allBookingsWithGuestData);
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

      // Load pricing settings - load kurtaxeRates from DB like ExpensePanel does
      if (settingsData.settings) {
        // Parse kurtaxeRates from database (same as ExpensePanel)
        let kurtaxeRates = DEFAULT_PRICING.kurtaxeRates;
        if (settingsData.settings.kurtaxe_rates) {
          try {
            const parsed = JSON.parse(settingsData.settings.kurtaxe_rates);
            if (Array.isArray(parsed)) {
              kurtaxeRates = parsed.map((r: { from: string; to: string; rate: number }) => ({
                from: r.from,
                to: r.to,
                rate: r.rate,
              }));
            }
          } catch (e) {
            console.error('Error parsing kurtaxe_rates:', e);
          }
        }

        const loadedPricing: PricingSettings = {
          ...DEFAULT_PRICING,
          kurtaxe: parseFloat(settingsData.settings.kurtaxe_rate) || DEFAULT_PRICING.kurtaxe,
          kurtaxeRates: kurtaxeRates,
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

  // Helper: Calculate finance data for a single guest using central function
  const calculateGuestFinance = (g: FinanceGuest) => {
    const hasDog = g.pets?.toLowerCase().includes('hund') ?? false;
    const isCleaningCash = g.cleaning_cash === 1 || (g.final_cleaning?.includes('vor Ort') ?? false);
    const isUtilitiesCash = g.utilities_cash === 1;
    const isKurtaxeCash = g.kurtaxe_cash === 1;
    const additionalCostsJson = g.booking_additional_costs || g.additional_costs;
    const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
    const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);
    const childrenAges = parseChildrenAges(g.children_ages);

    // Use central calculation function - same as BookingDetailPopup
    const financeResult = calculateBookingFinances({
      arrivalDate: g.arrival_date,
      departureDate: g.departure_date,
      adults: g.adults || 2,
      rentalPrice: g.rental_price ?? 0,
      platform: g.platform ?? null,
      hasDog,
      isPrivate: g.is_private === 1,
      privateConfig: parsePrivateConfig(g.private_config),
      skipNk: g.no_nebenkosten === 1,
      isCleaningCash,
      isUtilitiesCash,
      isKurtaxeCash,
      platformFees,
      pricingSettings: pricing,
      komfortpaket,
      childrenAges,
    });

    // Gebühren Plattform = Service + Payment Processing Fees
    const platformFeesTotal = (platformFees.platform_service_fee || 0) + (platformFees.payment_processing_fee || 0);
    // Gesamtzahlung Gast = was der Gast zahlt
    // Fallback auf Gesamteinzahlung wenn kein guest_total_payment vorhanden (z.B. Feratel, FeWo)
    const guestTotalPayment = (platformFees.guest_total_payment && platformFees.guest_total_payment > 0)
      ? platformFees.guest_total_payment
      : financeResult.gesamteinzahlung;

    return {
      miete: financeResult.mieteResult.miete,
      basisMiete: financeResult.basisMiete,
      mieterlos: financeResult.mieterlos,
      calculatedCostsForMieterlos: financeResult.calculatedCostsForMieterlos,
      provision: financeResult.provision,
      nkCosts: financeResult.totalNkCosts,
      cleaningCost: financeResult.cleaningCost,
      barNk: financeResult.barNk,
      barReinigung: financeResult.barReinigung,
      gesamteinzahlung: financeResult.gesamteinzahlung,
      gesamtbelastung: financeResult.gesamtbelastung,
      gesamtertrag: financeResult.gesamtertrag,
      barKurtaxe: financeResult.barKurtaxe,
      guestTotalPayment,
      platformFeesTotal,
      isCleaningCash,
      isUtilitiesCash,
      isKurtaxeCash,
    };
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

        // Use central calculation for totals - consistent with BookingDetailPopup
        const monthTotals = monthGuests.reduce(
          (acc, g) => {
            const finance = calculateGuestFinance(g);
            return {
              totalRevenue: acc.totalRevenue + finance.miete,
              commission: acc.commission + finance.provision,
            };
          },
          { totalRevenue: 0, commission: 0 }
        );

        months.push({
          month: monthIndex,
          monthName: MONTH_NAMES[monthIndex],
          guests: monthGuests,
          totalRevenue: monthTotals.totalRevenue,
          commission: monthTotals.commission,
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

  // Helper: Calculate occupancy (Auslastung) for a specific month
  const calculateMonthOccupancy = (year: number, month: number): { bookedNights: number; availableNights: number; rate: number } => {
    const monthStart = new Date(year, month, 1);
    const nextMonthStart = new Date(year, month + 1, 1);
    const availableNights = Math.round((nextMonthStart.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));

    let bookedNights = 0;
    for (const guest of allGuests) {
      if (!guest.arrival_date || !guest.departure_date) continue;
      if (guest.status === 'cancelled') continue;

      const arrival = new Date(guest.arrival_date);
      const departure = new Date(guest.departure_date);

      // Calculate overlap of [arrival, departure) with [monthStart, nextMonthStart)
      const overlapStart = new Date(Math.max(arrival.getTime(), monthStart.getTime()));
      const overlapEnd = new Date(Math.min(departure.getTime(), nextMonthStart.getTime()));

      if (overlapStart < overlapEnd) {
        const nights = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
        bookedNights += nights;
      }
    }

    return {
      bookedNights,
      availableNights,
      rate: availableNights > 0 ? (bookedNights / availableNights) * 100 : 0,
    };
  };

  // Helper: Calculate quarterly occupancy
  const calculateQuarterOccupancy = (quarter: number): { bookedNights: number; availableNights: number; rate: number } => {
    const startMonth = (quarter - 1) * 3;
    let totalBooked = 0;
    let totalAvailable = 0;
    for (let m = 0; m < 3; m++) {
      const monthOcc = calculateMonthOccupancy(selectedYear, startMonth + m);
      totalBooked += monthOcc.bookedNights;
      totalAvailable += monthOcc.availableNights;
    }
    return {
      bookedNights: totalBooked,
      availableNights: totalAvailable,
      rate: totalAvailable > 0 ? (totalBooked / totalAvailable) * 100 : 0,
    };
  };

  // Helper: Calculate yearly occupancy
  const calculateYearlyOccupancy = (): { bookedNights: number; availableNights: number; rate: number } => {
    let totalBooked = 0;
    let totalAvailable = 0;
    for (let m = 0; m < 12; m++) {
      const monthOcc = calculateMonthOccupancy(selectedYear, m);
      totalBooked += monthOcc.bookedNights;
      totalAvailable += monthOcc.availableNights;
    }
    return {
      bookedNights: totalBooked,
      availableNights: totalAvailable,
      rate: totalAvailable > 0 ? (totalBooked / totalAvailable) * 100 : 0,
    };
  };

  // Helper: Color for occupancy rate text
  const getOccupancyColor = (rate: number): string => {
    if (rate >= 50) return 'text-teal-700';
    if (rate >= 25) return 'text-gray-600';
    return 'text-gray-400';
  };

  // Helper: Color for occupancy progress bar
  const getOccupancyBarColor = (rate: number): string => {
    if (rate >= 50) return 'bg-teal-500';
    if (rate >= 25) return 'bg-gray-400';
    return 'bg-gray-300';
  };

  // Calculate yearly totals including NK - using central function for consistency
  const yearlyTotals = quarterData.reduce(
    (acc, q) => {
      const quarterData2 = q.months.reduce((sum, m) =>
        m.guests.reduce((s, g) => {
          const finance = calculateGuestFinance(g);
          return {
            nk: s.nk + finance.nkCosts + finance.barNk + finance.barReinigung,
            guestTotalPayment: s.guestTotalPayment + finance.guestTotalPayment,
            platformFeesTotal: s.platformFeesTotal + finance.platformFeesTotal,
            gesamteinzahlung: s.gesamteinzahlung + finance.gesamteinzahlung,
            kalkKosten: s.kalkKosten + finance.calculatedCostsForMieterlos,
            mieterlos: s.mieterlos + finance.mieterlos,
          };
        }, sum), { nk: 0, guestTotalPayment: 0, platformFeesTotal: 0, gesamteinzahlung: 0, kalkKosten: 0, mieterlos: 0 });
      return {
        revenue: acc.revenue + q.totalRevenue,
        nk: acc.nk + quarterData2.nk,
        commission: acc.commission + q.commission,
        guestCount: acc.guestCount + q.guestCount,
        guestTotalPayment: acc.guestTotalPayment + quarterData2.guestTotalPayment,
        platformFeesTotal: acc.platformFeesTotal + quarterData2.platformFeesTotal,
        gesamteinzahlung: acc.gesamteinzahlung + quarterData2.gesamteinzahlung,
        kalkKosten: acc.kalkKosten + quarterData2.kalkKosten,
        mieterlos: acc.mieterlos + quarterData2.mieterlos,
      };
    },
    { revenue: 0, nk: 0, commission: 0, guestCount: 0, guestTotalPayment: 0, platformFeesTotal: 0, gesamteinzahlung: 0, kalkKosten: 0, mieterlos: 0 }
  );

  const yearlyExpenses = getYearlyExpenses();
  const totalPlatformFees = platformFees.platform_service_fee + platformFees.payment_processing_fee;
  const yearlyTotalIncome = yearlyTotals.revenue + yearlyTotals.nk;
  const yearlyProfit = yearlyTotalIncome - yearlyExpenses - yearlyTotals.commission - totalPlatformFees;
  const yearlyOccupancy = calculateYearlyOccupancy();

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
      <div className="p-4 sm:p-6 print:hidden">
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
              onClick={handleSetPayoutDates}
              disabled={settingPayoutDates}
              className="p-2 sm:px-4 sm:py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors print:hidden disabled:opacity-50"
              title="Auszahlungsdaten für FeWo/Booking setzen"
            >
              {settingPayoutDates ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              <span className="hidden sm:inline ml-2">Auszahlungsdaten</span>
            </button>
            {payoutDatesResult && (
              <span className={`text-xs px-2 py-1 rounded ${payoutDatesResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {payoutDatesResult.message}
              </span>
            )}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gesamt. Gast</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-blue-700 mt-1">{demoFormat(yearlyTotals.guestTotalPayment)}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Geb. Plattform</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-gray-600 mt-1">-{demoFormat(yearlyTotals.platformFeesTotal)}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gesamteinz.</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-green-700 mt-1">{demoFormat(yearlyTotals.gesamteinzahlung)}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kalk. Kosten</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-gray-600 mt-1">{demoFormat(yearlyTotals.kalkKosten)}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mieterlös</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-purple-700 mt-1">{demoFormat(yearlyTotals.mieterlos)}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Provision</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-purple-700 mt-1">-{demoFormat(yearlyTotals.commission)}</p>
          </div>

          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Überschuss</p>
            <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">{demoFormat(yearlyTotals.mieterlos - yearlyTotals.commission)}</p>
            <p className="text-[10px] text-gray-400 mt-1">vor Steuern & Versicherung</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-3 text-xs text-gray-500">
          <span>Buchungen: <span className="font-bold text-gray-700">{yearlyTotals.guestCount}</span></span>
        </div>
      </div>

      {/* Auslastung / Occupancy KPI */}
      <div className="border border-gray-200 rounded-lg overflow-hidden print:hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
              Auslastung {selectedYear}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-2xl sm:text-3xl font-bold ${getOccupancyColor(yearlyOccupancy.rate)}`}>
                {yearlyOccupancy.rate.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">
                ({yearlyOccupancy.bookedNights} / {yearlyOccupancy.availableNights} Nächte)
              </span>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(q => {
              const qOcc = calculateQuarterOccupancy(q);
              const startMonth = (q - 1) * 3;
              return (
                <div key={q} className="border border-gray-100 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{QUARTER_LABELS[q - 1]}</span>
                    <span className={`text-base sm:text-lg font-bold ${getOccupancyColor(qOcc.rate)}`}>
                      {qOcc.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all ${getOccupancyBarColor(qOcc.rate)}`}
                      style={{ width: `${Math.min(qOcc.rate, 100)}%` }}
                    ></div>
                  </div>
                  <div className="space-y-1.5">
                    {[0, 1, 2].map(m => {
                      const monthIdx = startMonth + m;
                      const monthOcc = calculateMonthOccupancy(selectedYear, monthIdx);
                      return (
                        <div key={m} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 w-16">{MONTH_NAMES[monthIdx].substring(0, 3)}</span>
                          <div className="flex items-center gap-2 flex-1 ml-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${getOccupancyBarColor(monthOcc.rate)}`}
                                style={{ width: `${Math.min(monthOcc.rate, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`font-medium w-10 text-right ${getOccupancyColor(monthOcc.rate)}`}>
                              {monthOcc.rate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                    {qOcc.bookedNights} / {qOcc.availableNights} Nächte
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quarters Overview Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden print:hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Quartalsübersicht {selectedYear}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">Quartal</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">Buch.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-blue-600 uppercase">Ges. Gast</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Geb. Platf.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-green-600 uppercase">Gesamteinz.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Kalk. K.</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-purple-600 uppercase bg-purple-50">Mieterlös</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-purple-600 uppercase">
                  Prov.
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase bg-emerald-50">
                  Gewinn
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quarterData.map((q) => {
                const quarterExpenses = getQuarterExpenses(q.quarter);
                // Use central function for calculations - consistent with all other views
                const qCalc = q.months.reduce((acc, m) =>
                  m.guests.reduce((a, g) => {
                    const finance = calculateGuestFinance(g);
                    return {
                      guestTotalPayment: a.guestTotalPayment + finance.guestTotalPayment,
                      platformFeesTotal: a.platformFeesTotal + finance.platformFeesTotal,
                      gesamteinzahlung: a.gesamteinzahlung + finance.gesamteinzahlung,
                      kalkKosten: a.kalkKosten + finance.calculatedCostsForMieterlos,
                      mieterlos: a.mieterlos + finance.mieterlos,
                      gewinn: a.gewinn + finance.gesamtertrag,
                    };
                  }, acc), { guestTotalPayment: 0, platformFeesTotal: 0, gesamteinzahlung: 0, kalkKosten: 0, mieterlos: 0, gewinn: 0 });
                return (
                  <tr key={q.quarter} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{QUARTER_LABELS[q.quarter - 1]}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm text-gray-600">{q.guestCount}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-blue-700">
                      {demoFormat(qCalc.guestTotalPayment)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-500">
                      -{demoFormat(qCalc.platformFeesTotal)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-green-700">
                      {demoFormat(qCalc.gesamteinzahlung)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-600">
                      {demoFormat(qCalc.kalkKosten)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50">
                      {demoFormat(qCalc.mieterlos)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-purple-700">
                      {demoFormat(q.commission)}
                    </td>
                    <td
                      className={`px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold bg-emerald-50 ${qCalc.gewinn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                    >
                      {demoFormat(qCalc.gewinn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-200 font-bold">
              {(() => {
                const yearCalc = quarterData.reduce((acc, q) =>
                  q.months.reduce((a, m) =>
                    m.guests.reduce((b, g) => {
                      const finance = calculateGuestFinance(g);
                      return {
                        guestTotalPayment: b.guestTotalPayment + finance.guestTotalPayment,
                        platformFeesTotal: b.platformFeesTotal + finance.platformFeesTotal,
                        gesamteinzahlung: b.gesamteinzahlung + finance.gesamteinzahlung,
                        kalkKosten: b.kalkKosten + finance.calculatedCostsForMieterlos,
                        mieterlos: b.mieterlos + finance.mieterlos,
                        gewinn: b.gewinn + finance.gesamtertrag,
                      };
                    }, a), acc), { guestTotalPayment: 0, platformFeesTotal: 0, gesamteinzahlung: 0, kalkKosten: 0, mieterlos: 0, gewinn: 0 });
                return (
                  <tr>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">Gesamt</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm text-gray-900">{yearlyTotals.guestCount}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-blue-800">{demoFormat(yearCalc.guestTotalPayment)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-gray-600">-{demoFormat(yearCalc.platformFeesTotal)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-green-800">{demoFormat(yearCalc.gesamteinzahlung)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-gray-700">{demoFormat(yearCalc.kalkKosten)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-purple-800 bg-purple-100">{demoFormat(yearCalc.mieterlos)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-purple-800">
                      {demoFormat(yearlyTotals.commission)}
                    </td>
                    <td
                      className={`px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm bg-emerald-100 ${yearCalc.gewinn >= 0 ? 'text-emerald-800' : 'text-red-800'}`}
                    >
                      {demoFormat(yearCalc.gewinn)}
                    </td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Monthly Details */}
      {quarterData.map((quarter) => (
        <div key={quarter.quarter} className="border border-gray-200 rounded-lg overflow-hidden print:hidden">
          {/* Quarter Header - Clickable */}
          <button
            onClick={() => toggleQuarter(quarter.quarter)}
            className="w-full px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 hover:bg-gray-50 transition-colors text-left"
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
            {(() => {
              // Calculate totals using central function for header display
              const headerTotals = quarter.months.reduce((acc, m) =>
                m.guests.reduce((a, g) => {
                  const finance = calculateGuestFinance(g);
                  return {
                    mieterlos: a.mieterlos + finance.mieterlos,
                    kalkKosten: a.kalkKosten + finance.calculatedCostsForMieterlos,
                    gesamteinzahlung: a.gesamteinzahlung + finance.gesamteinzahlung,
                  };
                }, acc), { mieterlos: 0, kalkKosten: 0, gesamteinzahlung: 0 });
              return (
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span className="text-green-700 font-semibold">M: {demoFormat(headerTotals.mieterlos)}</span>
                  <span className="text-gray-600 font-semibold">NK: {demoFormat(headerTotals.kalkKosten)}</span>
                  <span className="text-purple-700 font-semibold">P: {demoFormat(quarter.commission)}</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded">
                    Σ {demoFormat(headerTotals.gesamteinzahlung)}
                  </span>
                  <ChevronRight
                    className={`hidden sm:block w-5 h-5 text-gray-400 transition-transform ${expandedQuarters.has(quarter.quarter) ? 'rotate-90' : ''}`}
                  />
                </div>
              );
            })()}
          </button>

          {/* Monthly Tables - Collapsible */}
          {expandedQuarters.has(quarter.quarter) && (
            <div className="space-y-4">
              {quarter.months.map((monthData) => (
                <div key={monthData.month} className="border-t border-gray-200">
                  {/* Month Header */}
                  <div className="bg-gray-50 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between border-b border-gray-100">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900">
                      {monthData.monthName} {selectedYear}
                    </h4>
                    <span className="text-xs sm:text-sm text-gray-600">
                      {monthData.guests.length} Buchungen
                    </span>
                  </div>

                  {/* Guest Table */}
                  {monthData.guests.length === 0 ? (
                    <div className="px-3 sm:px-6 py-3 sm:py-4 text-center text-gray-400 italic text-xs sm:text-sm">
                      Keine Buchungen in {monthData.monthName}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[750px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500">Gast</th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 hidden sm:table-cell">Plattform</th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-medium text-gray-500">Anreise</th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-blue-600">
                              Ges. Gast
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-gray-500">
                              Geb. Platf.
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-green-600">
                              Gesamteinz.
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-gray-500">
                              Kalk. K.
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-purple-600 bg-purple-50">
                              Mieterlös
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-purple-600">
                              Prov.
                            </th>
                            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50">
                              Gewinn
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {monthData.guests.map((guest) => {
                            // Use central calculation - same as BookingDetailPopup
                            const finance = calculateGuestFinance(guest);
                            const { guestTotalPayment, platformFeesTotal, gesamteinzahlung, calculatedCostsForMieterlos, mieterlos, provision, gesamtertrag } = finance;
                            return (
                              <tr
                                key={guest.id}
                                className="hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={() => setSelectedBooking(guest)}
                              >
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium text-gray-900 truncate max-w-[120px]">{demoName(guest.guest_name)}</td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 hidden sm:table-cell">{getPlatformBadge(guest.platform)}</td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-center text-gray-600">{formatDate(guest.arrival_date)}</td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-blue-700">
                                  {demoFormat(guestTotalPayment)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-gray-500">
                                  {platformFeesTotal > 0 ? `-${demoFormat(platformFeesTotal)}` : demoFormat(0)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-green-700">
                                  {demoFormat(gesamteinzahlung)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-gray-600">
                                  {demoFormat(calculatedCostsForMieterlos)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-purple-700 bg-purple-50">
                                  {demoFormat(mieterlos)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-purple-700">
                                  {demoFormat(provision)}
                                </td>
                                <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-semibold text-emerald-700 bg-emerald-50">
                                  {demoFormat(gesamtertrag)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {monthData.guests.length > 1 && (
                          <tfoot className="bg-gray-100">
                            {(() => {
                              // Calculate totals using central function - consistent with row display
                              const totals = monthData.guests.reduce((acc, g) => {
                                const finance = calculateGuestFinance(g);
                                return {
                                  totalGuestTotalPayment: acc.totalGuestTotalPayment + finance.guestTotalPayment,
                                  totalPlatformFees: acc.totalPlatformFees + finance.platformFeesTotal,
                                  totalGesamteinzahlung: acc.totalGesamteinzahlung + finance.gesamteinzahlung,
                                  totalKalkKosten: acc.totalKalkKosten + finance.calculatedCostsForMieterlos,
                                  totalMieterlos: acc.totalMieterlos + finance.mieterlos,
                                  totalProvision: acc.totalProvision + finance.provision,
                                  totalGewinn: acc.totalGewinn + finance.gesamtertrag,
                                };
                              }, { totalGuestTotalPayment: 0, totalPlatformFees: 0, totalGesamteinzahlung: 0, totalKalkKosten: 0, totalMieterlos: 0, totalProvision: 0, totalGewinn: 0 });
                              return (
                                <tr>
                                  <td colSpan={3} className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-[10px] sm:text-xs font-medium text-gray-600">
                                    Summe:
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-blue-800 text-xs sm:text-sm">
                                    {demoFormat(totals.totalGuestTotalPayment)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-gray-600 text-xs sm:text-sm">
                                    -{demoFormat(totals.totalPlatformFees)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-green-800 text-xs sm:text-sm">
                                    {demoFormat(totals.totalGesamteinzahlung)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-gray-700 text-xs sm:text-sm">
                                    {demoFormat(totals.totalKalkKosten)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-purple-800 bg-purple-100 text-xs sm:text-sm">
                                    {demoFormat(totals.totalMieterlos)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-purple-800 text-xs sm:text-sm">
                                    {demoFormat(totals.totalProvision)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-bold text-emerald-800 bg-emerald-100 text-xs sm:text-sm">
                                    {demoFormat(totals.totalGewinn)}
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
                // Calculate totals using central function - consistent with all other calculations
                const qSummary = quarter.months.reduce((acc, m) =>
                  m.guests.reduce((a, g) => {
                    const finance = calculateGuestFinance(g);
                    return {
                      mieterlos: a.mieterlos + finance.mieterlos,
                      kalkKosten: a.kalkKosten + finance.calculatedCostsForMieterlos,
                      gesamteinzahlung: a.gesamteinzahlung + finance.gesamteinzahlung,
                    };
                  }, acc), { mieterlos: 0, kalkKosten: 0, gesamteinzahlung: 0 });
                return (
                  <div className="bg-gray-50 px-3 sm:px-6 py-2 sm:py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm font-medium text-gray-900">Summe {QUARTER_LABELS[quarter.quarter - 1]}</span>
                    <div className="flex items-center gap-3 sm:gap-4 text-sm">
                      <span className="font-medium text-green-700">M: {demoFormat(qSummary.mieterlos)}</span>
                      <span className="font-medium text-gray-600">NK: {demoFormat(qSummary.kalkKosten)}</span>
                      <span className="font-medium text-purple-700">P: {demoFormat(quarter.commission)}</span>
                      <span className="font-semibold text-emerald-700">
                        Σ {demoFormat(qSummary.gesamteinzahlung)}
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
