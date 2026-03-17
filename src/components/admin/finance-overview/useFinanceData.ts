import { useState, useEffect } from 'react';
import { calculateUtilityCostsForBooking } from '../UtilityCostsCalculator';
import { MONTH_NAMES } from './constants';
import type { FinanceGuest, MonthData, QuarterData, ExpenseRecord, BookingWithFees, PlatformFees } from './types';
import type { PricingSettings } from '../utility-costs';
import { DEFAULT_PRICING } from '../utility-costs';

interface UseFinanceDataProps {
  adminPassword: string;
  selectedYear: number;
}

interface UseFinanceDataReturn {
  loading: boolean;
  allGuests: FinanceGuest[];
  allExpenses: ExpenseRecord[];
  quarterData: QuarterData[];
  pricing: PricingSettings;
  platformFees: PlatformFees;
  loadData: () => Promise<void>;
  getMonthExpenses: (month: number) => number;
  getQuarterExpenses: (quarter: number) => number;
  getYearlyExpenses: () => number;
}

export function useFinanceData({ adminPassword, selectedYear }: UseFinanceDataProps): UseFinanceDataReturn {
  const [loading, setLoading] = useState(true);
  const [allGuests, setAllGuests] = useState<FinanceGuest[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [quarterData, setQuarterData] = useState<QuarterData[]>([]);
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
          let platformFeesLocal = { payout_amount: 0, nebenkosten_income: 0, cleaning_fee_income: 0, guest_total_payment: 0, platform_service_fee: 0 };
          if (g.booking_additional_costs) {
            try {
              const parsed = JSON.parse(g.booking_additional_costs);
              platformFeesLocal = { ...platformFeesLocal, ...parsed };
            } catch {
              // Not JSON
            }
          }

          // Calculate effective payout amount
          let effectivePayout = 0;
          if (platformFeesLocal.payout_amount > 0) {
            effectivePayout = platformFeesLocal.payout_amount;
          } else if (platformFeesLocal.guest_total_payment > 0) {
            effectivePayout = platformFeesLocal.guest_total_payment - platformFeesLocal.platform_service_fee;
          }

          let provisionBasis: number;
          if (isFeWo) {
            // Bei FeWo: 10% vom Mietanteil (Auszahlung - NK-Ertrag - Reinigung)
            if (effectivePayout > 0) {
              provisionBasis = effectivePayout - platformFeesLocal.nebenkosten_income - platformFeesLocal.cleaning_fee_income;
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

  const getMonthExpenses = (month: number): number => {
    return allExpenses.filter((e) => e.year === selectedYear && e.month === month).reduce((sum, e) => sum + e.amount, 0);
  };

  const getQuarterExpenses = (quarter: number): number => {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return allExpenses
      .filter((e) => e.year === selectedYear && e.month >= startMonth && e.month <= endMonth)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getYearlyExpenses = (): number => {
    return allExpenses.filter((e) => e.year === selectedYear).reduce((sum, e) => sum + e.amount, 0);
  };

  return {
    loading,
    allGuests,
    allExpenses,
    quarterData,
    pricing,
    platformFees,
    loadData,
    getMonthExpenses,
    getQuarterExpenses,
    getYearlyExpenses,
  };
}
