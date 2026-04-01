'use client';

import { Loader2, Save, Settings, Plus, Trash2 } from 'lucide-react';
import type { PricingSettings } from './types';
import { formatCurrency } from '@/lib/utils/formatting';

interface SettingsPanelProps {
  settings: PricingSettings;
  editedSettings: PricingSettings;
  savingSettings: boolean;
  onEditedSettingsChange: (settings: PricingSettings) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function SettingsPanel({
  settings,
  editedSettings,
  savingSettings,
  onEditedSettingsChange,
  onSave,
  onCancel,
}: SettingsPanelProps) {
  const updateSetting = <K extends keyof PricingSettings>(key: K, value: PricingSettings[K]) => {
    onEditedSettingsChange({ ...editedSettings, [key]: value });
  };

  const addKurtaxePeriod = () => {
    onEditedSettingsChange({
      ...editedSettings,
      kurtaxe_rates: [...editedSettings.kurtaxe_rates, { from: '', to: '', rate: 2.7 }],
    });
  };

  const removeKurtaxePeriod = (index: number) => {
    const updated = editedSettings.kurtaxe_rates.filter((_, i) => i !== index);
    onEditedSettingsChange({ ...editedSettings, kurtaxe_rates: updated });
  };

  const updateKurtaxePeriod = (index: number, field: 'from' | 'to' | 'rate', value: string | number) => {
    const updated = [...editedSettings.kurtaxe_rates];
    const existing = updated[index];
    if (!existing) return;
    updated[index] = { ...existing, [field]: value };
    onEditedSettingsChange({ ...editedSettings, kurtaxe_rates: updated });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          Preiseinstellungen
        </h3>
        <p className="text-sm text-gray-500">Änderungen wirken sich auf alle Berechnungen aus</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Kurtaxe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kurtaxe (€/Tag/Erw.)</label>
          <input
            type="number"
            step="0.01"
            value={editedSettings.kurtaxe_rate}
            onChange={(e) => updateSetting('kurtaxe_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Holz */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Holz (€/Bündel)</label>
          <input
            type="number"
            step="0.01"
            value={editedSettings.holz_rate}
            onChange={(e) => updateSetting('holz_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Wasser */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wasser (€/P./Wo.)</label>
          <input
            type="number"
            step="0.01"
            value={editedSettings.water_rate}
            onChange={(e) => updateSetting('water_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Müll */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Müll (€/Sack)</label>
          <input
            type="number"
            step="0.01"
            value={editedSettings.trash_rate}
            onChange={(e) => updateSetting('trash_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Strom */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Strom (€/kWh)</label>
          <input
            type="number"
            step="0.01"
            value={editedSettings.electricity_rate}
            onChange={(e) => updateSetting('electricity_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Provision */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provision (%)</label>
          <input
            type="number"
            step="1"
            value={Math.round(editedSettings.commission_rate * 100)}
            onChange={(e) => updateSetting('commission_rate', (parseFloat(e.target.value) || 0) / 100)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Reinigung */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reinigung (€/Buchung)</label>
          <input
            type="number"
            step="1"
            value={editedSettings.reinigung_rate}
            onChange={(e) => updateSetting('reinigung_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Kurtaxe Rate Periods */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Kurtaxe-Sätze nach Zeitraum</h4>
          <button
            onClick={addKurtaxePeriod}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <Plus className="w-3 h-3" />
            Zeitraum hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {editedSettings.kurtaxe_rates.map((period, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Von</label>
                  <input
                    type="date"
                    value={period.from}
                    onChange={(e) => updateKurtaxePeriod(idx, 'from', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bis</label>
                  <input
                    type="date"
                    value={period.to}
                    onChange={(e) => updateKurtaxePeriod(idx, 'to', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Satz (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={period.rate}
                    onChange={(e) => updateKurtaxePeriod(idx, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
              <button
                onClick={() => removeKurtaxePeriod(idx)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Entfernen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Current values info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <span className="font-medium text-gray-900">Aktuelle Werte: </span>
        <span className="text-gray-600">
          Kurtaxe: {formatCurrency(settings.kurtaxe_rate)} | Holz: {formatCurrency(settings.holz_rate)} | Wasser:{' '}
          {formatCurrency(settings.water_rate)} | Müll: {formatCurrency(settings.trash_rate)} | Strom:{' '}
          {formatCurrency(settings.electricity_rate)} | Provision: {(settings.commission_rate * 100).toFixed(0)}% |
          Reinigung: {formatCurrency(settings.reinigung_rate)}
        </span>
      </div>

      {/* Save/Cancel buttons */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onSave}
          disabled={savingSettings}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
