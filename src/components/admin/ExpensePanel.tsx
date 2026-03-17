'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Save,
  TrendingDown,
  Calculator,
  Printer,
  Lock,
  Settings,
} from 'lucide-react';
import type {
  ExpenseRecord,
  ExpenseCategory,
  ExpenseGuest,
  KurtaxeRatePeriod,
  PricingSettings,
  KurtaxeBooking,
  ProvisionBooking,
} from './expense-panel/types';
import { DEFAULT_SETTINGS, MONTH_NAMES, FULL_MONTH_NAMES, CALCULATED_CATEGORIES } from './expense-panel/constants';
import { SettingsPanel } from './expense-panel/SettingsPanel';
import { OrtstaxePopup } from './expense-panel/OrtstaxePopup';
import { ProvisionPopup } from './expense-panel/ProvisionPopup';
import { AddCategoryForm } from './expense-panel/AddCategoryForm';
import { MonthlyOverview } from './expense-panel/MonthlyOverview';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseKomfortpaketFromJson,
  parseChildrenAges,
  parsePrivateConfig,
} from '@/lib/utils/financeCalculations';
import { roundDemoAmount } from '@/lib/utils/demoMode';
import type { PricingSettings as UtilityPricingSettings } from './utility-costs';

interface ExpensePanelProps {
  adminPassword: string;
  demoMode?: boolean;
}

type Guest = ExpenseGuest & {
  // Booking financial data
  booking_additional_costs?: string | null;
  utilities_cash?: number;
  cleaning_cash?: number;
};

// Booking data from API
interface BookingData {
  id: number;
  guest_id: number;
  arrival_date: string | null;
  departure_date: string | null;
  rental_price?: number;
  additional_costs: string | null;
  utilities_cash?: number;
  cleaning_cash?: number;
  final_cleaning?: string | null;
  adults?: number;
  children?: number;
  children_ages?: string | null;
  pets?: string | null;
  platform?: string | null;
  is_private?: number;
  private_config?: string | null;
  no_nebenkosten?: number;
}

export default function ExpensePanel({ adminPassword, demoMode = false }: ExpensePanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allBookings, setAllBookings] = useState<BookingData[]>([]);
  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [ortstaxePopupMonth, setOrtstaxePopupMonth] = useState<number | null>(null);
  const [provisionPopupMonth, setProvisionPopupMonth] = useState<number | null>(null);
  const [utilityPricing, setUtilityPricing] = useState<UtilityPricingSettings | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expenseRes, guestRes, settingsRes, bookingsRes] = await Promise.all([
        fetch(`/api/admin/expenses?year=${selectedYear}`, {
          headers: { 'x-admin-password': adminPassword }
        }),
        fetch('/api/admin/guests', {
          headers: { 'x-admin-password': adminPassword }
        }),
        fetch('/api/admin/settings', {
          headers: { 'x-admin-password': adminPassword }
        }),
        fetch('/api/admin/bookings', {
          headers: { 'x-admin-password': adminPassword }
        }),
      ]);

      const expenseData = (await expenseRes.json()) as { expenses?: ExpenseRecord[]; categories?: ExpenseCategory[] };
      setExpenses(expenseData.expenses || []);
      setCategories(expenseData.categories || []);

      const guestData = (await guestRes.json()) as { guests?: Guest[] };
      const bookingsData = (await bookingsRes.json()) as { bookings?: BookingData[] };

      // Store ALL bookings for commission/kurtaxe calculations
      const bookings = bookingsData.bookings || [];
      setAllBookings(bookings);

      // Create a map of booking data by guest_id (newest booking per guest) - for display purposes only
      const bookingsByGuestId = new Map<number, BookingData>();
      for (const booking of bookings) {
        if (!bookingsByGuestId.has(booking.guest_id)) {
          bookingsByGuestId.set(booking.guest_id, booking);
        }
      }

      // Merge guests with booking financial data - NUR BUCHUNGSDATEN!
      const guestsWithBookingData = (guestData.guests || []).map(guest => {
        const bookingData = bookingsByGuestId.get(guest.id);
        return {
          ...guest,
          // === NUR BUCHUNGSDATEN - KEINE FALLBACKS auf guests! ===
          rental_price: bookingData?.rental_price ?? 0,
          arrival_date: bookingData?.arrival_date ?? null,
          departure_date: bookingData?.departure_date ?? null,
          adults: bookingData?.adults ?? 2,
          children: bookingData?.children ?? 0,
          children_ages: bookingData?.children_ages ?? null,
          pets: bookingData?.pets ?? null,
          platform: bookingData?.platform ?? null,
          is_private: bookingData?.is_private ?? 0,
          no_nebenkosten: bookingData?.no_nebenkosten ?? 0,
          booking_additional_costs: bookingData?.additional_costs ?? null,
          utilities_cash: bookingData?.utilities_cash ?? 0,
          cleaning_cash: bookingData?.cleaning_cash ?? 0,
        };
      });
      setGuests(guestsWithBookingData);

      const settingsData = (await settingsRes.json()) as { settings?: Record<string, string> };
      if (settingsData.settings) {
        let kurtaxeRates = DEFAULT_SETTINGS.kurtaxe_rates;
        if (settingsData.settings.kurtaxe_rates) {
          try {
            kurtaxeRates = JSON.parse(settingsData.settings.kurtaxe_rates) as KurtaxeRatePeriod[];
          } catch (e) {
            console.error('Error parsing kurtaxe_rates:', e);
          }
        }

        const loadedSettings: PricingSettings = {
          kurtaxe_rate: parseFloat(settingsData.settings.kurtaxe_rate) || DEFAULT_SETTINGS.kurtaxe_rate,
          kurtaxe_rates: kurtaxeRates,
          holz_rate: parseFloat(settingsData.settings.holz_rate) || DEFAULT_SETTINGS.holz_rate,
          water_rate: parseFloat(settingsData.settings.water_rate) || DEFAULT_SETTINGS.water_rate,
          trash_rate: parseFloat(settingsData.settings.trash_rate) || DEFAULT_SETTINGS.trash_rate,
          electricity_rate: parseFloat(settingsData.settings.electricity_rate) || DEFAULT_SETTINGS.electricity_rate,
          commission_rate: parseFloat(settingsData.settings.commission_rate) || DEFAULT_SETTINGS.commission_rate,
          reinigung_rate: parseFloat(settingsData.settings.reinigung_rate) || DEFAULT_SETTINGS.reinigung_rate,
        };
        setSettings(loadedSettings);
        setEditedSettings(loadedSettings);

        // Also set utility pricing for calculateBookingFinances
        // Include kurtaxeRates for date-based rate calculations
        setUtilityPricing({
          kurtaxe: loadedSettings.kurtaxe_rate,
          kurtaxeRates: loadedSettings.kurtaxe_rates?.map(r => ({
            from: r.from,
            to: r.to,
            rate: r.rate,
          })),
          holz: loadedSettings.holz_rate,
          water: loadedSettings.water_rate,
          trash: loadedSettings.trash_rate,
          electricity: loadedSettings.electricity_rate,
          reinigung: loadedSettings.reinigung_rate,
        });
      }

      setEditedCells(new Map());
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Fehler beim Laden der Ausgaben');
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyCommission = useCallback(
    (month: number): number => {
      // Iterate over ALL BOOKINGS, not guests - to catch all bookings including multiple per guest
      return allBookings
        .filter((b) => {
          if (!b.arrival_date) return false;
          const arrivalDate = new Date(b.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .reduce((sum, b) => {
          // Use central calculation function - consistent with FinanceOverview
          const hasDog = b.pets?.toLowerCase().includes('hund') ?? false;
          const isCleaningCash = b.cleaning_cash === 1 || (b.final_cleaning?.includes('vor Ort') ?? false);
          const isUtilitiesCash = b.utilities_cash === 1;
          const additionalCostsJson = b.additional_costs;
          const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
          const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);
          const childrenAges = parseChildrenAges(b.children_ages);

          const financeResult = calculateBookingFinances({
            arrivalDate: b.arrival_date,
            departureDate: b.departure_date,
            adults: b.adults || 2,
            rentalPrice: b.rental_price ?? 0,
            platform: b.platform ?? null,
            hasDog,
            isPrivate: b.is_private === 1,
            privateConfig: parsePrivateConfig(b.private_config),
            skipNk: b.no_nebenkosten === 1,
            isCleaningCash,
            isUtilitiesCash,
            platformFees,
            pricingSettings: utilityPricing,
            komfortpaket,
            childrenAges,
          });

          return sum + financeResult.provision;
        }, 0);
    },
    [allBookings, selectedYear, utilityPricing]
  );

  const getMonthlyKurtaxe = useCallback(
    (month: number): number => {
      // Use central calculation function for consistent Kurtaxe with date-based rates
      return allBookings
        .filter((b) => {
          if (!b.arrival_date || !b.departure_date) return false;
          const arrivalDate = new Date(b.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .reduce((sum, b) => {
          // Skip private bookings (no Kurtaxe)
          if (b.is_private === 1 || b.no_nebenkosten === 1) return sum;

          const hasDog = b.pets?.toLowerCase().includes('hund') ?? false;
          const isCleaningCash = b.cleaning_cash === 1 || (b.final_cleaning?.includes('vor Ort') ?? false);
          const isUtilitiesCash = b.utilities_cash === 1;
          const additionalCostsJson = b.additional_costs;
          const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
          const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);
          const childrenAges = parseChildrenAges(b.children_ages);

          const financeResult = calculateBookingFinances({
            arrivalDate: b.arrival_date,
            departureDate: b.departure_date,
            adults: b.adults || 2,
            rentalPrice: b.rental_price ?? 0,
            platform: b.platform ?? null,
            hasDog,
            isPrivate: b.is_private === 1,
            privateConfig: parsePrivateConfig(b.private_config),
            skipNk: b.no_nebenkosten === 1,
            isCleaningCash,
            isUtilitiesCash,
            platformFees,
            pricingSettings: utilityPricing,
            komfortpaket,
            childrenAges,
          });

          return sum + financeResult.kurtaxe;
        }, 0);
    },
    [allBookings, selectedYear, utilityPricing]
  );

  const getKurtaxeContributingBookings = useCallback(
    (month: number): KurtaxeBooking[] => {
      // Use central calculation function for consistent Kurtaxe with date-based rates
      return allBookings
        .filter((b) => {
          if (!b.arrival_date || !b.departure_date) return false;
          if (b.is_private === 1 || b.no_nebenkosten === 1) return false;
          const arrivalDate = new Date(b.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .map((b) => {
          const arrival = new Date(b.arrival_date!);
          const departure = new Date(b.departure_date!);
          const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
          const hasDog = b.pets?.toLowerCase().includes('hund') ?? false;
          const isCleaningCash = b.cleaning_cash === 1 || (b.final_cleaning?.includes('vor Ort') ?? false);
          const isUtilitiesCash = b.utilities_cash === 1;
          const additionalCostsJson = b.additional_costs;
          const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
          const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);
          const childrenAges = parseChildrenAges(b.children_ages);

          const financeResult = calculateBookingFinances({
            arrivalDate: b.arrival_date,
            departureDate: b.departure_date,
            adults: b.adults || 2,
            rentalPrice: b.rental_price ?? 0,
            platform: b.platform ?? null,
            hasDog,
            isPrivate: b.is_private === 1,
            privateConfig: parsePrivateConfig(b.private_config),
            skipNk: b.no_nebenkosten === 1,
            isCleaningCash,
            isUtilitiesCash,
            platformFees,
            pricingSettings: utilityPricing,
            komfortpaket,
            childrenAges,
          });

          return {
            id: b.id,
            arrival: b.arrival_date!,
            departure: b.departure_date!,
            adults: financeResult.kurtaxePersons || (b.adults || 2),
            days,
            amount: financeResult.kurtaxe,
          };
        });
    },
    [allBookings, selectedYear, utilityPricing]
  );

  const getProvisionContributingBookings = useCallback(
    (month: number): ProvisionBooking[] => {
      // Create a map of guest names by guest_id
      const guestNameById = new Map<number, string>();
      for (const g of guests) {
        guestNameById.set(g.id, (g as { guest_name?: string }).guest_name || `Gast #${g.id}`);
      }

      // Iterate over ALL BOOKINGS
      return allBookings
        .filter((b) => {
          if (!b.arrival_date) return false;
          const arrivalDate = new Date(b.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .map((b) => {
          const hasDog = b.pets?.toLowerCase().includes('hund') ?? false;
          const isCleaningCash = b.cleaning_cash === 1 || (b.final_cleaning?.includes('vor Ort') ?? false);
          const isUtilitiesCash = b.utilities_cash === 1;
          const additionalCostsJson = b.additional_costs;
          const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
          const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);
          const childrenAges = parseChildrenAges(b.children_ages);

          const financeResult = calculateBookingFinances({
            arrivalDate: b.arrival_date,
            departureDate: b.departure_date,
            adults: b.adults || 2,
            rentalPrice: b.rental_price ?? 0,
            platform: b.platform ?? null,
            hasDog,
            isPrivate: b.is_private === 1,
            privateConfig: parsePrivateConfig(b.private_config),
            skipNk: b.no_nebenkosten === 1,
            isCleaningCash,
            isUtilitiesCash,
            platformFees,
            pricingSettings: utilityPricing,
            komfortpaket,
            childrenAges,
          });

          return {
            id: b.id,
            guestName: guestNameById.get(b.guest_id) || `Gast #${b.guest_id}`,
            arrival: b.arrival_date!,
            departure: b.departure_date || b.arrival_date!,
            platform: b.platform ?? null,
            rentalPrice: b.rental_price ?? 0,
            mieterlos: financeResult.mieterlos,
            provision: financeResult.provision,
          };
        });
    },
    [allBookings, guests, selectedYear, utilityPricing]
  );

  const saveSettings = async () => {
    setSavingSettings(true);
    setError('');
    try {
      const settingsToSave = [
        { key: 'kurtaxe_rate', value: editedSettings.kurtaxe_rate.toString() },
        { key: 'kurtaxe_rates', value: JSON.stringify(editedSettings.kurtaxe_rates) },
        { key: 'holz_rate', value: editedSettings.holz_rate.toString() },
        { key: 'water_rate', value: editedSettings.water_rate.toString() },
        { key: 'trash_rate', value: editedSettings.trash_rate.toString() },
        { key: 'electricity_rate', value: editedSettings.electricity_rate.toString() },
        { key: 'commission_rate', value: editedSettings.commission_rate.toString() },
        { key: 'reinigung_rate', value: editedSettings.reinigung_rate.toString() },
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
          body: JSON.stringify(setting),
        });
      }

      setSettings(editedSettings);
      setShowSettings(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Fehler beim Speichern der Einstellungen');
    } finally {
      setSavingSettings(false);
    }
  };

  const isCalculatedCategory = (categoryName: string): boolean => {
    return CALCULATED_CATEGORIES.includes(categoryName);
  };

  const getCalculatedAmount = (categoryName: string, month: number): number => {
    if (categoryName === 'Malte & Eike (Provision)') return getMonthlyCommission(month);
    if (categoryName === 'Ortstaxe') return getMonthlyKurtaxe(month);
    return 0;
  };

  const getExpenseAmount = useCallback(
    (category: string, month: number): number => {
      if (isCalculatedCategory(category)) return getCalculatedAmount(category, month);
      const key = `${category}-${month}`;
      if (editedCells.has(key)) return editedCells.get(key) || 0;
      const expense = expenses.find((e) => e.category === category && e.month === month);
      return expense?.amount || 0;
    },
    [expenses, editedCells]
  );

  const handleCellChange = (category: string, month: number, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    const key = `${category}-${month}`;
    const newEdited = new Map(editedCells);
    newEdited.set(key, numValue);
    setEditedCells(newEdited);
  };

  const saveChanges = async () => {
    if (editedCells.size === 0) return;
    setSaving(true);
    setError('');
    try {
      for (const [key, amount] of editedCells.entries()) {
        const [category, monthStr] = key.split('-');
        const month = parseInt(monthStr);
        await fetch('/api/admin/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
          body: JSON.stringify({ year: selectedYear, month, category, amount }),
        });
      }
      await loadData();
    } catch (err) {
      console.error('Error saving expenses:', err);
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (name: string) => {
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ name }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Fehler beim Hinzufügen der Kategorie');
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Diese Kategorie und alle zugehörigen Ausgaben wirklich löschen?')) return;
    try {
      await fetch(`/api/admin/expenses?categoryId=${categoryId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword },
      });
      await loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Fehler beim Löschen der Kategorie');
    }
  };

  const getRowTotal = (category: string): number => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getExpenseAmount(category, month);
    }
    return total;
  };

  const getColumnTotal = (month: number): number => {
    return categories.reduce((sum, cat) => sum + getExpenseAmount(cat.name, month), 0);
  };

  const getGrandTotal = (): number => {
    return categories.reduce((sum, cat) => sum + getRowTotal(cat.name), 0);
  };

  const formatCurrency = (amount: number) => {
    if (demoMode) {
      return `~${roundDemoAmount(amount).toLocaleString('de-DE')} €`;
    }
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    expenses.forEach((e) => years.add(e.year));
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() - 1);
    years.add(new Date().getFullYear() + 1);
    return Array.from(years).sort((a, b) => b - a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3">Lade Ausgaben...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-red-600" />
              Ausgaben {selectedYear}
            </h2>
            <p className="text-gray-600 mt-1">Monatliche Betriebskosten verwalten</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors print:hidden ${
                showSettings ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-5 h-5" />
              Preise
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors print:hidden"
            >
              <Printer className="w-5 h-5" />
              Drucken
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-lg"
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

            {editedCells.size > 0 && (
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Speichern ({editedCells.size})
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">Gesamtausgaben {selectedYear}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(getGrandTotal())}</p>
        </div>
      </div>

      {error && (
        <div className="bg-white border-l-4 border-red-500 p-4 rounded-r">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          editedSettings={editedSettings}
          savingSettings={savingSettings}
          onEditedSettingsChange={setEditedSettings}
          onSave={saveSettings}
          onCancel={() => {
            setEditedSettings(settings);
            setShowSettings(false);
          }}
        />
      )}

      {/* Expense Table */}
      <div className="bg-white rounded-xl overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-100 min-w-[180px]">
                  Kategorie
                </th>
                {MONTH_NAMES.map((month, idx) => (
                  <th
                    key={idx}
                    className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[90px]"
                  >
                    {month}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase bg-gray-200 min-w-[100px]">
                  Jahres-Summe
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-400 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category) => {
                const isCalculated = isCalculatedCategory(category.name);
                return (
                  <tr key={category.id} className={`hover:bg-gray-50 ${isCalculated ? 'bg-gray-50' : ''}`}>
                    <td
                      className={`px-3 py-2 font-medium sticky left-0 ${isCalculated ? 'bg-gray-50 text-gray-700' : 'bg-white text-gray-900'}`}
                    >
                      <div className="flex items-center gap-2">
                        {category.name}
                        {isCalculated && (
                          <span className="text-xs text-gray-500 flex items-center gap-1" title="Automatisch berechnet">
                            <Lock className="w-3 h-3" />
                            auto
                          </span>
                        )}
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                      const key = `${category.name}-${month}`;
                      const isEdited = editedCells.has(key);
                      const value = getExpenseAmount(category.name, month);

                      if (isCalculated) {
                        const isOrtstaxe = category.name === 'Ortstaxe';
                        const isProvision = category.name === 'Malte & Eike (Provision)';
                        const isClickable = (isOrtstaxe || isProvision) && value > 0;
                        return (
                          <td key={month} className="px-1 py-1 relative">
                            <div
                              className={`w-full px-2 py-1 text-right text-sm rounded ${
                                value > 0 ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-400'
                              } ${isClickable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                              onClick={
                                isClickable
                                  ? () => {
                                      if (isOrtstaxe) {
                                        setOrtstaxePopupMonth(ortstaxePopupMonth === month ? null : month);
                                        setProvisionPopupMonth(null);
                                      } else if (isProvision) {
                                        setProvisionPopupMonth(provisionPopupMonth === month ? null : month);
                                        setOrtstaxePopupMonth(null);
                                      }
                                    }
                                  : undefined
                              }
                            >
                              {value === 0 ? '-' : value.toFixed(2).replace('.', ',')}
                            </div>
                            {isOrtstaxe && ortstaxePopupMonth === month && (
                              <OrtstaxePopup
                                month={month}
                                monthName={FULL_MONTH_NAMES[month - 1]}
                                year={selectedYear}
                                bookings={getKurtaxeContributingBookings(month)}
                                kurtaxeRate={settings.kurtaxe_rate}
                                totalAmount={value}
                                onClose={() => setOrtstaxePopupMonth(null)}
                              />
                            )}
                            {isProvision && provisionPopupMonth === month && (
                              <ProvisionPopup
                                month={month}
                                monthName={FULL_MONTH_NAMES[month - 1]}
                                year={selectedYear}
                                bookings={getProvisionContributingBookings(month)}
                                totalAmount={value}
                                onClose={() => setProvisionPopupMonth(null)}
                              />
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={month} className="px-1 py-1">
                          <input
                            type="text"
                            value={value === 0 ? '' : value.toFixed(2).replace('.', ',')}
                            onChange={(e) => handleCellChange(category.name, month, e.target.value)}
                            placeholder="-"
                            className={`w-full px-2 py-1 text-right text-sm border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                              isEdited ? 'bg-yellow-50 border-yellow-300' : 'border-gray-200'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td
                      className={`px-3 py-2 text-right font-bold ${isCalculated ? 'text-gray-700 bg-gray-100' : 'text-gray-900 bg-gray-50'}`}
                    >
                      {formatCurrency(getRowTotal(category.name))}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!isCalculated && (
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Kategorie löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-200 font-bold">
              <tr>
                <td className="px-3 py-3 text-gray-900 sticky left-0 bg-gray-200">Summe</td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                  <td key={month} className="px-2 py-3 text-right text-red-800">
                    {formatCurrency(getColumnTotal(month))}
                  </td>
                ))}
                <td className="px-3 py-3 text-right text-red-900 bg-red-100">{formatCurrency(getGrandTotal())}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add Category */}
      <div className="bg-white rounded-xl p-6">
        <AddCategoryForm onAdd={addCategory} />
      </div>

      {/* Monthly Overview */}
      <MonthlyOverview year={selectedYear} getColumnTotal={getColumnTotal} />
    </div>
  );
}
