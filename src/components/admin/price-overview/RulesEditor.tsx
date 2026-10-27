'use client';

import { Calculator, Loader2, Plus, Save, Trash2, X } from 'lucide-react';

import { DEMAND_COLOR } from '@/lib/demand/scoring';
import { type FixedPeriod, LEVEL_NAMES, type PriceRules } from '@/lib/pricing/dynamicPricing';

import { GermanDateInput } from '../shared/GermanDateInput';

// Preisregeln einer Hütte bearbeiten. Die Tabelle darunter rechnet mit dem
// Entwurf sofort neu — gespeichert wird erst mit „Speichern“ (bzw. beim
// Übernehmen von Vorschlägen).

interface Props {
  hutName: string;
  rules: PriceRules;
  dirty: boolean;
  saving: boolean;
  error: string;
  onChange: (rules: PriceRules) => void;
  onDerive: () => void;
  onSave: () => void;
  onClose: () => void;
}

const LEVEL_HINT = [
  'keine besonderen Ferien oder Feiertage',
  'einzelne Ferienregionen, Feiertage',
  'große Ferien in AT/DE, Saisonspitzen',
  'Weihnachten, Semesterferien, Ostern',
];

const inputClass =
  'px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400';

function numberValue(value: string): number {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function optionalNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export default function RulesEditor({
  hutName,
  rules,
  dirty,
  saving,
  error,
  onChange,
  onDerive,
  onSave,
  onClose,
}: Props) {
  const set = (patch: Partial<PriceRules>) => onChange({ ...rules, ...patch });

  const setLevel = (key: 'levelPrice' | 'levelMinStay', index: number, value: number) => {
    const next = [...rules[key]] as PriceRules['levelPrice'];
    next[index] = value;
    set({ [key]: next });
  };

  const setFixed = (index: number, patch: Partial<FixedPeriod>) => {
    set({ fixed: rules.fixed.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  };

  const addFixed = () => {
    const today = new Date().toISOString().slice(0, 10);
    set({
      fixed: [...rules.fixed, { from: today, to: today, price: null, minStay: null, label: '' }],
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/60">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Preisregeln {hutName}</p>
          <p className="text-xs text-gray-500">
            Grundlage ist die Nachfrage je Nacht (Ferien, Feiertage, Saison am Falkert). Die
            Übersicht rechnet beim Tippen sofort neu.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">
            Preis und Mindestaufenthalt je Nachfrage
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left font-normal pb-1">Nachfrage</th>
                <th className="text-left font-normal pb-1 w-28">€ / Nacht</th>
                <th className="text-left font-normal pb-1 w-24">Nächte min.</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_NAMES.map((name, i) => (
                <tr key={name}>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-gray-300"
                        style={{ background: i === 0 ? '#ffffff' : DEMAND_COLOR[i as 1 | 2 | 3] }}
                      />
                      <div>
                        <p className="text-gray-900">{name}</p>
                        <p className="text-[11px] text-gray-500 leading-tight">{LEVEL_HINT[i]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      value={rules.levelPrice[i]}
                      onChange={(e) => setLevel('levelPrice', i, numberValue(e.target.value))}
                      className={`${inputClass} w-full`}
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      min={1}
                      value={rules.levelMinStay[i]}
                      onChange={(e) =>
                        setLevel(
                          'levelMinStay',
                          i,
                          Math.max(1, Math.round(numberValue(e.target.value))),
                        )
                      }
                      className={`${inputClass} w-full`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Wochenende</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Freitag- und Samstagnächte
              <input
                type="number"
                value={rules.weekendPct}
                onChange={(e) => set({ weekendPct: numberValue(e.target.value) })}
                className={`${inputClass} w-20`}
              />
              % Aufschlag
            </label>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Last Minute</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              In den letzten
              <input
                type="number"
                min={0}
                value={rules.lastMinuteDays}
                onChange={(e) =>
                  set({ lastMinuteDays: Math.max(0, Math.round(numberValue(e.target.value))) })
                }
                className={`${inputClass} w-16`}
              />
              Tagen (0 = aus):
              <input
                type="number"
                min={0}
                value={rules.lastMinutePct}
                onChange={(e) => set({ lastMinutePct: numberValue(e.target.value) })}
                className={`${inputClass} w-16`}
              />
              % Rabatt, höchstens
              <input
                type="number"
                min={0}
                value={rules.lastMinuteMinStay}
                onChange={(e) =>
                  set({ lastMinuteMinStay: Math.max(0, Math.round(numberValue(e.target.value))) })
                }
                className={`${inputClass} w-16`}
              />
              Nächte min. (0 = unverändert)
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Untergrenze
              <input
                type="number"
                min={0}
                value={rules.minPrice}
                onChange={(e) => set({ minPrice: numberValue(e.target.value) })}
                className={`${inputClass} w-20`}
              />
              €
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Runden auf
              <select
                value={rules.rounding}
                onChange={(e) => set({ rounding: Number(e.target.value) })}
                className={`${inputClass} w-24`}
              >
                <option value={1}>1 €</option>
                <option value={5}>5 €</option>
                <option value={10}>10 €</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-700">
            Feste Zeiträume{' '}
            <span className="font-normal text-gray-500">— gehen allen Regeln vor</span>
          </p>
          <button
            onClick={addFixed}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <Plus className="w-3.5 h-3.5" />
            Zeitraum
          </button>
        </div>
        {rules.fixed.length === 0 ? (
          <p className="text-xs text-gray-500">
            Keine. Werte, die in der Übersicht von Hand gesetzt werden, landen auf Wunsch hier.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.fixed.map((f, i) => (
              <div
                key={i}
                className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_6rem_5rem_1.5fr_auto] gap-2 items-center"
              >
                <GermanDateInput
                  value={f.from}
                  onChange={(v) => setFixed(i, { from: v })}
                  className={`${inputClass} w-full pr-8`}
                />
                <GermanDateInput
                  value={f.to}
                  onChange={(v) => setFixed(i, { to: v })}
                  className={`${inputClass} w-full pr-8`}
                />
                <input
                  type="number"
                  placeholder="€"
                  value={f.price ?? ''}
                  onChange={(e) => setFixed(i, { price: optionalNumber(e.target.value) })}
                  className={`${inputClass} w-full`}
                />
                <input
                  type="number"
                  placeholder="min."
                  value={f.minStay ?? ''}
                  onChange={(e) => setFixed(i, { minStay: optionalNumber(e.target.value) })}
                  className={`${inputClass} w-full`}
                />
                <input
                  type="text"
                  placeholder="Bezeichnung"
                  value={f.label ?? ''}
                  onChange={(e) => setFixed(i, { label: e.target.value })}
                  className={`${inputClass} w-full`}
                />
                <button
                  onClick={() => set({ fixed: rules.fixed.filter((_, j) => j !== i) })}
                  className="p-1.5 text-gray-400 hover:text-red-600 justify-self-start"
                  title="Entfernen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-6">
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Regeln speichern
        </button>
        <button
          onClick={onDerive}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-white"
        >
          <Calculator className="w-3.5 h-3.5" />
          Aus aktuellen Beds24-Preisen ableiten
        </button>
        {dirty && <span className="text-xs text-amber-700">Nicht gespeichert</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
