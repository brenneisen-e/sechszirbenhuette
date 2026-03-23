'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, X, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface KurtaxeRate {
  id: number;
  valid_from: string;
  valid_to: string | null;
  rate_per_person_per_day: number;
  min_age: number;
}

interface KurtaxeRatesEditorProps {
}

export default function KurtaxeRatesEditor({}: KurtaxeRatesEditorProps) {
  const [rates, setRates] = useState<KurtaxeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    valid_from: '',
    valid_to: '',
    rate_per_person_per_day: '',
    min_age: '16',
  });

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kurtaxe-rates');
      const data = await res.json() as { rates?: KurtaxeRate[]; tableExists?: boolean };
      setRates(data.rates || []);
      setTableExists(data.tableExists !== false);
    } catch (err) {
      console.error('Failed to fetch kurtaxe rates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const startEdit = (rate: KurtaxeRate) => {
    setEditingId(rate.id);
    setEditForm({
      valid_from: rate.valid_from,
      valid_to: rate.valid_to || '',
      rate_per_person_per_day: rate.rate_per_person_per_day.toFixed(2),
      min_age: String(rate.min_age),
    });
    setShowAdd(false);
  };

  const startAdd = () => {
    setShowAdd(true);
    setEditingId(null);
    setEditForm({
      valid_from: '',
      valid_to: '',
      rate_per_person_per_day: '',
      min_age: '16',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
  };

  const saveRate = async () => {
    setSaving(true);
    try {
      const body = {
        id: editingId || undefined,
        valid_from: editForm.valid_from,
        valid_to: editForm.valid_to || null,
        rate_per_person_per_day: parseFloat(editForm.rate_per_person_per_day),
        min_age: parseInt(editForm.min_age),
      };

      const method = editingId ? 'PUT' : 'POST';
      await fetch('/api/admin/kurtaxe-rates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      cancelEdit();
      await fetchRates();
    } catch (err) {
      console.error('Failed to save kurtaxe rate:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (id: number) => {
    if (!confirm('Satz wirklich löschen?')) return;
    try {
      await fetch(`/api/admin/kurtaxe-rates?id=${id}`, {
        method: 'DELETE',
        });
      await fetchRates();
    } catch (err) {
      console.error('Failed to delete kurtaxe rate:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Lade Kurtaxe-Sätze...</span>
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Kurtaxe-Tabelle nicht vorhanden</p>
            <p className="text-xs text-amber-600 mt-1">Bitte führen Sie die Datenbank-Migration im System-Tab aus.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
        Kurtaxe-Sätze (Ortstaxe)
      </h3>

      {/* Rates Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Gültig ab</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Gültig bis</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Satz pro Person/Tag</th>
              <th className="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rates.map((rate) => (
              <tr key={rate.id} className="admin-row hover:bg-gray-50 transition-colors">
                {editingId === rate.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editForm.valid_from}
                        onChange={(e) => setEditForm(prev => ({ ...prev, valid_from: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editForm.valid_to}
                        onChange={(e) => setEditForm(prev => ({ ...prev, valid_to: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                        placeholder="unbegrenzt"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.rate_per_person_per_day}
                          onChange={(e) => setEditForm(prev => ({ ...prev, rate_per_person_per_day: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 text-right font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                        />
                        <span className="text-xs text-gray-400">€</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={saveRate} disabled={saving} className="text-green-600 hover:bg-green-50 rounded p-1 transition-colors">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-medium">OK</span>}
                        </button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(rate.valid_from).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {rate.valid_to
                        ? new Date(rate.valid_to).toLocaleDateString('de-DE')
                        : <span className="text-gray-400">–</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 text-right tabular-nums">
                      {formatCurrency(rate.rate_per_person_per_day)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end admin-row-actions">
                        <button
                          onClick={() => startEdit(rate)}
                          className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRate(rate.id)}
                          className="text-gray-400 hover:text-red-500 rounded p-1 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Add row */}
            {showAdd && (
              <tr className="bg-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={editForm.valid_from}
                    onChange={(e) => setEditForm(prev => ({ ...prev, valid_from: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={editForm.valid_to}
                    onChange={(e) => setEditForm(prev => ({ ...prev, valid_to: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.rate_per_person_per_day}
                      onChange={(e) => setEditForm(prev => ({ ...prev, rate_per_person_per_day: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 text-right font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-gray-400">€</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={saveRate} disabled={saving} className="text-green-600 hover:bg-green-50 rounded p-1 transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-medium">OK</span>}
                    </button>
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {!showAdd && (
        <button
          onClick={startAdd}
          className="admin-add-button w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Neuen Satz hinzufügen</span>
        </button>
      )}

      {/* Min age info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Mindestalter für Kurtaxepflicht:</span>
        <span className="font-mono font-medium text-gray-900">16 Jahre</span>
      </div>
    </div>
  );
}
