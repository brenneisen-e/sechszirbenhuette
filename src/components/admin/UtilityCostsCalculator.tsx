'use client';

import { useState, useEffect } from 'react';
import { Calculator, Sun, Snowflake, Calendar, Printer, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import {
  CostTable,
  DayBasedCostTable,
  PricingEditor,
  DEFAULT_PRICING,
  WALLI_VALUES,
  calculateUtilityCostsForBooking,
} from './utility-costs';
import type { PricingSettings, KurtaxeRatePeriod, Season, WeeksCount } from './utility-costs';

// Re-export for backward compatibility
export { WALLI_VALUES, calculateUtilityCostsForBooking };
export type { CostBreakdownDetailed } from './utility-costs';

interface UtilityCostsCalculatorProps {
  adminPassword?: string;
  demoMode?: boolean;
}

// Kurtaxe rates
const KURTAXE_ALT = 2.7;  // bis 31.10.2026
const KURTAXE_NEU = 4.5;  // ab 01.11.2026

export default function UtilityCostsCalculator({ adminPassword, demoMode = false }: UtilityCostsCalculatorProps) {
  const [selectedSeason, setSelectedSeason] = useState<Season>('summer');
  const [selectedWeeks, setSelectedWeeks] = useState<WeeksCount>(1);
  const [viewMode, setViewMode] = useState<'weeks' | 'days'>('weeks');
  const [selectedDays, setSelectedDays] = useState<number>(5);
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [selectedKurtaxe, setSelectedKurtaxe] = useState<'alt' | 'neu'>('alt');

  // Override kurtaxe based on selection
  const effectivePricing = {
    ...pricing,
    kurtaxe: selectedKurtaxe === 'alt' ? KURTAXE_ALT : KURTAXE_NEU,
  };

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          headers: adminPassword ? { 'x-admin-password': adminPassword } : {}
        });
        const data = (await res.json()) as { settings?: Record<string, string> };
        if (data.settings) {
          // Parse kurtaxe rates JSON if available
          let kurtaxeRates: KurtaxeRatePeriod[] | undefined;
          if (data.settings.kurtaxe_rates) {
            try {
              kurtaxeRates = JSON.parse(data.settings.kurtaxe_rates) as KurtaxeRatePeriod[];
            } catch (e) {
              console.error('Error parsing kurtaxe_rates:', e);
            }
          }

          const loadedPricing: PricingSettings = {
            kurtaxe: parseFloat(data.settings.kurtaxe_rate) || DEFAULT_PRICING.kurtaxe,
            kurtaxeRates,
            holz: parseFloat(data.settings.holz_rate) || DEFAULT_PRICING.holz,
            water: parseFloat(data.settings.water_rate) || DEFAULT_PRICING.water,
            trash: parseFloat(data.settings.trash_rate) || DEFAULT_PRICING.trash,
            electricity: parseFloat(data.settings.electricity_rate) || DEFAULT_PRICING.electricity,
            reinigung: parseFloat(data.settings.reinigung_rate) || DEFAULT_PRICING.reinigung,
          };
          setPricing(loadedPricing);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePricing = async (newPricing: PricingSettings) => {
    if (!adminPassword) {
      throw new Error('Keine Admin-Berechtigung');
    }

    const settingsToSave = [
      { key: 'kurtaxe_rate', value: newPricing.kurtaxe.toString() },
      { key: 'holz_rate', value: newPricing.holz.toString() },
      { key: 'water_rate', value: newPricing.water.toString() },
      { key: 'trash_rate', value: newPricing.trash.toString() },
      { key: 'electricity_rate', value: newPricing.electricity.toString() },
      { key: 'reinigung_rate', value: newPricing.reinigung.toString() },
    ];

    for (const setting of settingsToSave) {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify(setting),
      });
    }

    setPricing(newPricing);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3">Lade Preise...</span>
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
              <Calculator className="w-6 h-6 text-purple-600" />
              Nebenkosten (kalkulatorisch)
            </h2>
            <p className="text-gray-600 mt-1">Kalkulatorische Nebenkosten für Gäste (2-8 Personen) · Kurtaxe: 2,70€ bis 31.10.2026, ab 01.11.2026 dann 4,50€</p>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors print:hidden"
            title="Drucken"
          >
            <Printer className="w-5 h-5" />
            Drucken
          </button>
        </div>

        {/* Pricing Info Card */}
        <PricingEditor pricing={pricing} adminPassword={adminPassword} onSave={handleSavePricing} />
      </div>

      {/* Season/Week Selector */}
      <div className="bg-white rounded-xl p-6 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Saison:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => setSelectedSeason('summer')}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                  selectedSeason === 'summer' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Sun className="w-4 h-4" />
                Sommer
              </button>
              <button
                onClick={() => setSelectedSeason('winter')}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                  selectedSeason === 'winter' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Snowflake className="w-4 h-4" />
                Winter
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Ansicht:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => setViewMode('weeks')}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'weeks' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Wochen
              </button>
              <button
                onClick={() => setViewMode('days')}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'days' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Tage
              </button>
            </div>
          </div>

          {viewMode === 'weeks' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Dauer:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  onClick={() => setSelectedWeeks(1)}
                  className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                    selectedWeeks === 1 ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  1 Woche
                </button>
                <button
                  onClick={() => setSelectedWeeks(2)}
                  className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                    selectedWeeks === 2 ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  2 Wochen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Anzahl Tage:</span>
              <input
                type="number"
                min="1"
                max="30"
                value={selectedDays}
                onChange={(e) => setSelectedDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <span className="text-sm text-gray-500">({(selectedDays / 7).toFixed(1)} Wochen)</span>
            </div>
          )}

          {/* Kurtaxe Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Kurtaxe:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => setSelectedKurtaxe('alt')}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                  selectedKurtaxe === 'alt' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                2,70€ (bis 31.10.26)
              </button>
              <button
                onClick={() => setSelectedKurtaxe('neu')}
                className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                  selectedKurtaxe === 'neu' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                4,50€ (ab 01.11.26)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Table (for interactive view) */}
      <div className="print:hidden">
        {viewMode === 'weeks' ? (
          <CostTable season={selectedSeason} weeks={selectedWeeks} pricing={effectivePricing} />
        ) : (
          <DayBasedCostTable season={selectedSeason} days={selectedDays} pricing={effectivePricing} />
        )}
      </div>

      {/* All Tables (for print) */}
      <div className="hidden print:block space-y-6">
        <h3 className="text-lg font-bold">Sommer (Mai bis Oktober)</h3>
        <CostTable season="summer" weeks={1} pricing={pricing} />
        <CostTable season="summer" weeks={2} pricing={pricing} />

        <h3 className="text-lg font-bold mt-8">Winter (November bis April)</h3>
        <CostTable season="winter" weeks={1} pricing={pricing} />
        <CostTable season="winter" weeks={2} pricing={pricing} />
      </div>

      {/* Notes */}
      <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-600">
        <h4 className="font-semibold text-gray-800 mb-2">Hinweise:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Kurtaxe wird pro Erwachsenen und Nacht berechnet ({formatCurrency(pricing.kurtaxe)})</li>
          <li>Holz: Im Sommer weniger Verbrauch (2 Bündel/Woche), im Winter mehr (5 Bündel/Woche)</li>
          <li>Müllsäcke: Anzahl variiert je nach Personenzahl (1-4 Säcke)</li>
          <li>Strom: Inklusiv-kWh variiert je nach Saison, Dauer und Personenzahl (150-900 kWh)</li>
          <li>Kinder unter 15 Jahren sind bei der Kurtaxe ermäßigt (hier nicht berücksichtigt)</li>
          <li>Preise können im Admin-Center unter &quot;Ausgaben → Preise&quot; angepasst werden</li>
        </ul>
      </div>
    </div>
  );
}
