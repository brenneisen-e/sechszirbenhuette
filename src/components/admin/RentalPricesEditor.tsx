'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, X, Plus, Loader2, AlertTriangle, Calendar, Users, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface RentalPrice {
  id: number;
  name: string;
  date_from: string;
  date_to: string;
  price_per_night: number;
  nebenkosten_pro_person: number;
  mindestaufenthalt: number;
  aktiv: number;
}

interface RentalPricesEditorProps {
  demoMode?: boolean;
}

const EMPTY_FORM = {
  name: '',
  date_from: '',
  date_to: '',
  price_per_night: '',
  nebenkosten_pro_person: '',
  mindestaufenthalt: '3',
  aktiv: true,
};

export default function RentalPricesEditor({ demoMode = false }: RentalPricesEditorProps) {
  const [prices, setPrices] = useState<RentalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  // Bulk edit state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    name: '',
    date_from: '',
    date_to: '',
    price_per_night: '',
    nebenkosten_pro_person: '',
    mindestaufenthalt: '3',
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  // Nebenkosten calculator state
  const [calcAdults, setCalcAdults] = useState(2);
  const [calcNights, setCalcNights] = useState(7);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rental-prices');
      const data = await res.json() as { prices?: RentalPrice[]; tableExists?: boolean };
      setPrices(data.prices || []);
      setTableExists(data.tableExists !== false);
    } catch (err) {
      console.error('Failed to fetch rental prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const startEdit = (price: RentalPrice) => {
    setEditingId(price.id);
    setEditForm({
      name: price.name,
      date_from: price.date_from,
      date_to: price.date_to,
      price_per_night: price.price_per_night.toFixed(2),
      nebenkosten_pro_person: price.nebenkosten_pro_person.toFixed(2),
      mindestaufenthalt: String(price.mindestaufenthalt),
      aktiv: !!price.aktiv,
    });
    setShowAdd(false);
  };

  const startAdd = () => {
    setShowAdd(true);
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
  };

  const savePrice = async () => {
    setSaving(true);
    try {
      const body = {
        id: editingId || undefined,
        name: editForm.name,
        date_from: editForm.date_from,
        date_to: editForm.date_to,
        price_per_night: parseFloat(editForm.price_per_night),
        nebenkosten_pro_person: parseFloat(editForm.nebenkosten_pro_person) || 0,
        mindestaufenthalt: parseInt(editForm.mindestaufenthalt) || 3,
        aktiv: editForm.aktiv,
      };

      const method = editingId ? 'PUT' : 'POST';
      await fetch('/api/admin/rental-prices', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      cancelEdit();
      await fetchPrices();
    } catch (err) {
      console.error('Failed to save rental price:', err);
    } finally {
      setSaving(false);
    }
  };

  const deletePrice = async (id: number) => {
    if (!confirm('Preiszeitraum wirklich löschen?')) return;
    try {
      await fetch(`/api/admin/rental-prices?id=${id}`, { method: 'DELETE' });
      await fetchPrices();
    } catch (err) {
      console.error('Failed to delete rental price:', err);
    }
  };

  const saveBulk = async () => {
    if (!bulkForm.name || !bulkForm.date_from || !bulkForm.date_to || !bulkForm.price_per_night) return;

    setBulkSaving(true);
    try {
      // Check for existing overlapping periods and update or create
      const overlapping = prices.filter(p => {
        return p.date_from <= bulkForm.date_to && p.date_to >= bulkForm.date_from;
      });

      // Delete overlapping periods first
      for (const p of overlapping) {
        await fetch(`/api/admin/rental-prices?id=${p.id}`, { method: 'DELETE' });
      }

      // Create the new period
      await fetch('/api/admin/rental-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bulkForm.name,
          date_from: bulkForm.date_from,
          date_to: bulkForm.date_to,
          price_per_night: parseFloat(bulkForm.price_per_night),
          nebenkosten_pro_person: parseFloat(bulkForm.nebenkosten_pro_person) || 0,
          mindestaufenthalt: parseInt(bulkForm.mindestaufenthalt) || 3,
          aktiv: true,
        }),
      });

      setShowBulk(false);
      setBulkForm({ name: '', date_from: '', date_to: '', price_per_night: '', nebenkosten_pro_person: '', mindestaufenthalt: '3' });
      await fetchPrices();
    } catch (err) {
      console.error('Failed to save bulk rental price:', err);
    } finally {
      setBulkSaving(false);
    }
  };

  // Find the current price for the calculator
  const today = new Date().toISOString().split('T')[0];
  const currentPrice = prices.find(p => p.aktiv && p.date_from <= today && p.date_to >= today);

  // Calculate Nebenkosten for display
  const calculateTotal = (price: RentalPrice | undefined, adults: number, nights: number) => {
    if (!price) return null;
    const rent = price.price_per_night * nights;
    const nebenkosten = price.nebenkosten_pro_person * adults * nights;
    return { rent, nebenkosten, total: rent + nebenkosten };
  };

  const calcResult = calculateTotal(currentPrice, calcAdults, calcNights);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Lade Mietpreise...</span>
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Mietpreise-Tabelle nicht vorhanden</p>
            <p className="text-xs text-amber-600 mt-1">Bitte laden Sie die Admin-Seite erneut, um die Datenbank-Migration durchzuführen.</p>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none";
  const numberInputClass = "border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 text-right font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none";

  const renderFormRow = (
    form: typeof editForm,
    setForm: (fn: (prev: typeof editForm) => typeof editForm) => void,
    onSave: () => void,
    onCancel: () => void,
    isSaving: boolean
  ) => (
    <>
      <td className="px-4 py-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          className={inputClass}
          placeholder="z.B. Nebensaison"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          value={form.date_from}
          onChange={(e) => setForm(prev => ({ ...prev, date_from: e.target.value }))}
          className={inputClass}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          value={form.date_to}
          onChange={(e) => setForm(prev => ({ ...prev, date_to: e.target.value }))}
          className={inputClass}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 justify-end">
          <input
            type="number"
            step="0.01"
            value={form.price_per_night}
            onChange={(e) => setForm(prev => ({ ...prev, price_per_night: e.target.value }))}
            className={numberInputClass}
            placeholder="0.00"
          />
          <span className="text-xs text-gray-400">&euro;</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 justify-end">
          <input
            type="number"
            step="0.01"
            value={form.nebenkosten_pro_person}
            onChange={(e) => setForm(prev => ({ ...prev, nebenkosten_pro_person: e.target.value }))}
            className={numberInputClass}
            placeholder="0.00"
          />
          <span className="text-xs text-gray-400">&euro;</span>
        </div>
      </td>
      <td className="px-4 py-2 text-center">
        <input
          type="number"
          min="1"
          value={form.mindestaufenthalt}
          onChange={(e) => setForm(prev => ({ ...prev, mindestaufenthalt: e.target.value }))}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-14 text-center font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={onSave} disabled={isSaving} className="text-green-600 hover:bg-green-50 rounded p-1 transition-colors">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-medium">OK</span>}
          </button>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mietpreise</h2>
          <p className="text-sm text-gray-500 mt-0.5">Nachtpreise und Nebenkosten pro Person verwalten</p>
        </div>
      </div>

      {/* Nebenkosten Calculator */}
      <div className="border border-gray-200 rounded-lg p-5 bg-gray-50/50">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Preisrechner</h3>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Erwachsene</label>
            <select
              value={calcAdults}
              onChange={(e) => setCalcAdults(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={n}>{n} Personen</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nächte</label>
            <input
              type="number"
              min="1"
              max="30"
              value={calcNights}
              onChange={(e) => setCalcNights(parseInt(e.target.value) || 1)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-20 bg-white font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>

          {calcResult ? (
            <div className="flex items-center gap-6 ml-4">
              <div>
                <span className="block text-xs text-gray-500">Miete</span>
                <span className="text-sm font-mono font-medium text-gray-900">{demoMode ? '***' : formatCurrency(calcResult.rent)}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Nebenkosten</span>
                <span className="text-sm font-mono font-medium text-gray-900">{demoMode ? '***' : formatCurrency(calcResult.nebenkosten)}</span>
              </div>
              <div className="border-l border-gray-300 pl-6">
                <span className="block text-xs text-gray-500 font-medium">Gesamt</span>
                <span className="text-base font-mono font-semibold text-green-700">{demoMode ? '***' : formatCurrency(calcResult.total)}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 ml-4 py-2">
              Kein aktiver Preiszeitraum für heute gefunden.
            </div>
          )}
        </div>

        {currentPrice && (
          <div className="mt-3 text-xs text-gray-500">
            Aktueller Zeitraum: <span className="font-medium text-gray-700">{currentPrice.name}</span>
            {' '}({new Date(currentPrice.date_from).toLocaleDateString('de-DE')} &ndash; {new Date(currentPrice.date_to).toLocaleDateString('de-DE')})
            {' '}&middot; {demoMode ? '***' : formatCurrency(currentPrice.price_per_night)}/Nacht
            {currentPrice.nebenkosten_pro_person > 0 && (
              <> + {demoMode ? '***' : formatCurrency(currentPrice.nebenkosten_pro_person)}/Person/Nacht NK</>
            )}
          </div>
        )}
      </div>

      {/* Bulk Edit Section */}
      <div className="border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">Massenänderung</h3>
          </div>
          {!showBulk && (
            <button
              onClick={() => setShowBulk(true)}
              className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              Zeitraum anlegen
            </button>
          )}
        </div>

        {showBulk && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Definieren Sie einen Zeitraum mit einheitlichem Preis. Bestehende überlappende Einträge werden ersetzt.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bezeichnung</label>
                <input
                  type="text"
                  value={bulkForm.name}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                  placeholder="z.B. Nebensaison Winter"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Von</label>
                <input
                  type="date"
                  value={bulkForm.date_from}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, date_from: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bis</label>
                <input
                  type="date"
                  value={bulkForm.date_to}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, date_to: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Preis pro Nacht</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={bulkForm.price_per_night}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, price_per_night: e.target.value }))}
                    className={inputClass}
                    placeholder="0.00"
                  />
                  <span className="text-xs text-gray-400 shrink-0">&euro;</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nebenkosten pro Person/Nacht</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={bulkForm.nebenkosten_pro_person}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, nebenkosten_pro_person: e.target.value }))}
                    className={inputClass}
                    placeholder="0.00"
                  />
                  <span className="text-xs text-gray-400 shrink-0">&euro;</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mindestaufenthalt (Nächte)</label>
                <input
                  type="number"
                  min="1"
                  value={bulkForm.mindestaufenthalt}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, mindestaufenthalt: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Preview of overlapping periods */}
            {bulkForm.date_from && bulkForm.date_to && (() => {
              const overlapping = prices.filter(p =>
                p.date_from <= bulkForm.date_to && p.date_to >= bulkForm.date_from
              );
              if (overlapping.length === 0) return null;
              return (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">
                        {overlapping.length} bestehende{overlapping.length === 1 ? 'r' : ''} Zeitraum{overlapping.length > 1 ? 'räume' : ''} wird ersetzt:
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {overlapping.map(p => (
                          <li key={p.id} className="text-xs text-amber-700">
                            {p.name} ({new Date(p.date_from).toLocaleDateString('de-DE')} &ndash; {new Date(p.date_to).toLocaleDateString('de-DE')})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-2">
              <button
                onClick={saveBulk}
                disabled={bulkSaving || !bulkForm.name || !bulkForm.date_from || !bulkForm.date_to || !bulkForm.price_per_night}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Zeitraum speichern
              </button>
              <button
                onClick={() => setShowBulk(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {!showBulk && (
          <p className="text-xs text-gray-400">
            Legen Sie schnell einen Preiszeitraum an, z.B. &quot;01.01.2026 &ndash; 31.03.2026 = 150 &euro;/Nacht&quot;.
            Bestehende überlappende Einträge werden automatisch ersetzt.
          </p>
        )}
      </div>

      {/* Prices Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
          Alle Preiszeiträume
        </h3>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Bezeichnung</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Von</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Bis</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Preis/Nacht</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">NK/Person/Nacht</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Min. Nächte</th>
                  <th className="w-20 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {prices.map((price) => (
                  <tr key={price.id} className={`admin-row hover:bg-gray-50 transition-colors ${!price.aktiv ? 'opacity-50' : ''}`}>
                    {editingId === price.id ? (
                      renderFormRow(editForm, setEditForm, savePrice, cancelEdit, saving)
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{price.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(price.date_from).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(price.date_to).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 text-right tabular-nums">
                          {demoMode ? '***' : formatCurrency(price.price_per_night)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 text-right tabular-nums">
                          {demoMode ? '***' : price.nebenkosten_pro_person > 0 ? formatCurrency(price.nebenkosten_pro_person) : <span className="text-gray-300">&ndash;</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 text-center tabular-nums">
                          {price.mindestaufenthalt}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end admin-row-actions">
                            <button
                              onClick={() => startEdit(price)}
                              className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePrice(price.id)}
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
                    {renderFormRow(editForm, setEditForm, savePrice, cancelEdit, saving)}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {prices.length === 0 && !showAdd && (
            <div className="text-center py-8 text-sm text-gray-400">
              Noch keine Preiszeiträume angelegt. Nutzen Sie die Massenänderung oder fügen Sie einzelne Einträge hinzu.
            </div>
          )}
        </div>

        {/* Add button */}
        {!showAdd && (
          <button
            onClick={startAdd}
            className="admin-add-button w-full flex items-center justify-center gap-2 mt-3"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Einzelnen Preiszeitraum hinzufügen</span>
          </button>
        )}
      </div>
    </div>
  );
}
