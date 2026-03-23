'use client';

import { useState } from 'react';
import { Edit3, Save, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import type { PricingSettings } from './types';

interface PricingEditorProps {
  pricing: PricingSettings;
  onSave: (newPricing: PricingSettings) => Promise<void>;
}

export function PricingEditor({ pricing, onSave }: PricingEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPricing, setEditedPricing] = useState<PricingSettings>(pricing);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const startEditing = () => {
    setEditedPricing({ ...pricing });
    setIsEditing(true);
    setSaveError('');
  };

  const cancelEditing = () => {
    setEditedPricing({ ...pricing });
    setIsEditing(false);
    setSaveError('');
  };

  const handleSave = async () => {

    setSaving(true);
    setSaveError('');
    try {
      await onSave(editedPricing);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Preise</h3>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 print:hidden"
          >
            <Edit3 className="w-4 h-4" />
            Bearbeiten
          </button>
        )}
      </div>

      {saveError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>
      )}

      {isEditing ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kurtaxe (€/Tag/Erw.)</label>
              <input
                type="number"
                step="0.01"
                value={editedPricing.kurtaxe}
                onChange={(e) => setEditedPricing((p) => ({ ...p, kurtaxe: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Holz (€/Bündel)</label>
              <input
                type="number"
                step="0.01"
                value={editedPricing.holz}
                onChange={(e) => setEditedPricing((p) => ({ ...p, holz: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Wasser (€/P./Wo.)</label>
              <input
                type="number"
                step="0.01"
                value={editedPricing.water}
                onChange={(e) => setEditedPricing((p) => ({ ...p, water: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Müll (€/Sack)</label>
              <input
                type="number"
                step="0.01"
                value={editedPricing.trash}
                onChange={(e) => setEditedPricing((p) => ({ ...p, trash: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Strom (€/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={editedPricing.electricity}
                onChange={(e) => setEditedPricing((p) => ({ ...p, electricity: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reinigung (€/Buchung)</label>
              <input
                type="number"
                step="1"
                value={editedPricing.reinigung}
                onChange={(e) => setEditedPricing((p) => ({ ...p, reinigung: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Kurtaxe:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(pricing.kurtaxe)}/Tag</span>
          </div>
          <div>
            <span className="text-gray-500">Holz:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(pricing.holz)}/Bündel</span>
          </div>
          <div>
            <span className="text-gray-500">Wasser:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(pricing.water)}/P./Wo.</span>
          </div>
          <div>
            <span className="text-gray-500">Müll:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(pricing.trash)}/Sack</span>
          </div>
          <div>
            <span className="text-gray-500">Strom:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(pricing.electricity)}/kWh</span>
          </div>
          <div>
            <span className="text-gray-500">Reinigung:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(pricing.reinigung)}/Buchung</span>
          </div>
        </div>
      )}
    </div>
  );
}
