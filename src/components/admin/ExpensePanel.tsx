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
} from './expense-panel/types';
import { DEFAULT_SETTINGS, MONTH_NAMES, FULL_MONTH_NAMES, CALCULATED_CATEGORIES } from './expense-panel/constants';
import { SettingsPanel } from './expense-panel/SettingsPanel';
import { OrtstaxePopup } from './expense-panel/OrtstaxePopup';
import { AddCategoryForm } from './expense-panel/AddCategoryForm';
import { MonthlyOverview } from './expense-panel/MonthlyOverview';

interface ExpensePanelProps {
  adminPassword: string;
}

type Guest = ExpenseGuest;

export default function ExpensePanel({ adminPassword }: ExpensePanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [ortstaxePopupMonth, setOrtstaxePopupMonth] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expenseRes, guestRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/expenses?year=${selectedYear}`),
        fetch('/api/admin/guests'),
        fetch('/api/admin/settings'),
      ]);

      const expenseData = (await expenseRes.json()) as { expenses?: ExpenseRecord[]; categories?: ExpenseCategory[] };
      setExpenses(expenseData.expenses || []);
      setCategories(expenseData.categories || []);

      const guestData = (await guestRes.json()) as { guests?: Guest[] };
      setGuests(guestData.guests || []);

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
      return guests
        .filter((g) => {
          if (!g.arrival_date || g.status === 'cancelled') return false;
          const arrivalDate = new Date(g.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .reduce((sum, g) => {
          const commissionBase = g.net_rent ?? g.rental_price ?? 0;
          return sum + commissionBase * settings.commission_rate;
        }, 0);
    },
    [guests, selectedYear, settings.commission_rate]
  );

  const getMonthlyKurtaxe = useCallback(
    (month: number): number => {
      return guests
        .filter((g) => {
          if (!g.arrival_date || !g.departure_date || g.status === 'cancelled') return false;
          const arrivalDate = new Date(g.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .reduce((sum, g) => {
          const arrival = new Date(g.arrival_date!);
          const departure = new Date(g.departure_date!);
          const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
          const adults = g.adults || 2;
          return sum + settings.kurtaxe_rate * days * adults;
        }, 0);
    },
    [guests, selectedYear, settings.kurtaxe_rate]
  );

  const getKurtaxeContributingBookings = useCallback(
    (month: number): KurtaxeBooking[] => {
      return guests
        .filter((g) => {
          if (!g.arrival_date || !g.departure_date || g.status === 'cancelled') return false;
          const arrivalDate = new Date(g.arrival_date);
          return arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() + 1 === month;
        })
        .map((g) => {
          const arrival = new Date(g.arrival_date!);
          const departure = new Date(g.departure_date!);
          const days = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
          const adults = g.adults || 2;
          const amount = settings.kurtaxe_rate * days * adults;
          return {
            id: g.id,
            arrival: g.arrival_date!,
            departure: g.departure_date!,
            adults,
            days,
            amount,
          };
        });
    },
    [guests, selectedYear, settings.kurtaxe_rate]
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
      <div className="bg-white rounded-xl shadow-sm p-6">
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

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">Gesamtausgaben {selectedYear}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(getGrandTotal())}</p>
        </div>
      </div>

      {error && (
        <div className="bg-white border-l-4 border-red-500 p-4 rounded-r shadow-sm">
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                        const isClickable = isOrtstaxe && value > 0;
                        return (
                          <td key={month} className="px-1 py-1 relative">
                            <div
                              className={`w-full px-2 py-1 text-right text-sm rounded ${
                                value > 0 ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-400'
                              } ${isClickable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                              onClick={
                                isClickable
                                  ? () => setOrtstaxePopupMonth(ortstaxePopupMonth === month ? null : month)
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        <AddCategoryForm onAdd={addCategory} />
      </div>

      {/* Monthly Overview */}
      <MonthlyOverview year={selectedYear} getColumnTotal={getColumnTotal} />
    </div>
  );
}
