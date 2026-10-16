'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Check, Loader2, X } from 'lucide-react';

import {
  differs,
  formatRange,
  type HutData,
  nightsOf,
  type NightSuggestion,
  type PeriodRow,
} from '@/lib/pricing/dynamicPricing';

import { euro } from './api';

// Einen Zeitraum einer Hütte ansehen und ändern: Vorschläge übernehmen oder
// eigene Werte setzen. Geschrieben wird nur, was sich wirklich ändert.

export interface ManualValues {
  price: number | null;
  minStay: number | null;
  includeBlocked: boolean;
  remember: boolean;
}

interface Props {
  row: PeriodRow;
  hut: HutData;
  suggestions: Record<string, NightSuggestion> | null;
  busy: boolean;
  error: string;
  message: string;
  onApplySuggestions: () => void;
  onApplyManual: (values: ManualValues) => void;
  onClose: () => void;
}

interface Run {
  from: string;
  to: string;
  nights: number;
  blocked: boolean;
  price?: number;
  minStay?: number;
  suggestion?: NightSuggestion;
  changes: boolean;
}

export function manualTargets(
  hut: HutData,
  from: string,
  to: string,
  values: ManualValues,
): { night: string; price1?: number; minStay?: number }[] {
  const targets: { night: string; price1?: number; minStay?: number }[] = [];
  for (const night of nightsOf(from, to)) {
    const day = hut.days[night];
    if (!day || (day.a === 0 && !values.includeBlocked)) continue;
    const priceChange =
      values.price !== null && (day.p === undefined || Math.abs(day.p - values.price) >= 0.5);
    const stayChange = values.minStay !== null && (day.m ?? 1) !== values.minStay;
    if (!priceChange && !stayChange) continue;
    const target: { night: string; price1?: number; minStay?: number } = { night };
    if (values.price !== null) target.price1 = values.price;
    if (values.minStay !== null) target.minStay = values.minStay;
    targets.push(target);
  }
  return targets;
}

export default function EditPeriodDialog({
  row,
  hut,
  suggestions,
  busy,
  error,
  message,
  onApplySuggestions,
  onApplyManual,
  onClose,
}: Props) {
  const [price, setPrice] = useState('');
  const [minStay, setMinStay] = useState('');
  const [includeBlocked, setIncludeBlocked] = useState(false);
  const [remember, setRemember] = useState(true);

  const runs = useMemo(() => {
    const list: Run[] = [];
    for (const night of nightsOf(row.from, row.to)) {
      const day = hut.days[night];
      if (!day) continue;
      const s = suggestions?.[night];
      const blocked = day.a === 0;
      const changes = !blocked && !!s && differs(day, s);
      const last = list.at(-1);
      if (
        last &&
        last.blocked === blocked &&
        last.price === day.p &&
        last.minStay === day.m &&
        last.suggestion?.price === s?.price &&
        last.suggestion?.minStay === s?.minStay
      ) {
        last.to = night;
        last.nights += 1;
        continue;
      }
      list.push({
        from: night,
        to: night,
        nights: 1,
        blocked,
        price: day.p,
        minStay: day.m,
        suggestion: s,
        changes,
      });
    }
    return list;
  }, [row, hut, suggestions]);

  const suggestionNights = runs.filter((r) => r.changes).reduce((sum, r) => sum + r.nights, 0);

  const parsedPrice = price.trim() === '' ? null : Number(price.replace(',', '.'));
  const parsedStay = minStay.trim() === '' ? null : Math.round(Number(minStay));
  const priceValid = parsedPrice === null || (Number.isFinite(parsedPrice) && parsedPrice > 0);
  const stayValid = parsedStay === null || (Number.isFinite(parsedStay) && parsedStay >= 1);
  const manual: ManualValues = {
    price: priceValid ? parsedPrice : null,
    minStay: stayValid ? parsedStay : null,
    includeBlocked,
    remember,
  };
  const manualNights =
    priceValid && stayValid && (parsedPrice !== null || parsedStay !== null)
      ? manualTargets(hut, row.from, row.to, manual).length
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded-xl shadow-xl">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500">{hut.name}</p>
            <p className="text-base font-semibold text-gray-900">{row.label}</p>
            <p className="text-xs text-gray-500">
              {formatRange(row.from, row.to)}
              {row.reasons.length > 0 && ` · ${row.reasons.join(' · ')}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Aktuell bei Beds24</p>
            <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 text-sm max-h-64 overflow-y-auto">
              {runs.length === 0 && <p className="p-3 text-xs text-gray-500">Keine Daten</p>}
              {runs.map((r) => (
                <div key={r.from} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="w-48 text-gray-700">
                    {formatRange(r.from, r.to)}
                    <span className="text-xs text-gray-400"> · {r.nights} N.</span>
                  </span>
                  {r.blocked ? (
                    <span className="text-xs text-gray-500">belegt / gesperrt</span>
                  ) : (
                    <span className="text-gray-900">
                      {r.price !== undefined ? euro(r.price) : '—'}
                      <span className="text-xs text-gray-500"> · min. {r.minStay ?? 1}</span>
                    </span>
                  )}
                  {!r.blocked && r.suggestion && (
                    <span
                      className={`flex items-center gap-1 text-xs ml-auto ${
                        r.changes ? 'text-purple-700' : 'text-gray-400'
                      }`}
                      title={r.suggestion.basis}
                    >
                      {r.changes ? (
                        <ArrowRight className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      {euro(r.suggestion.price)} · min. {r.suggestion.minStay}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {suggestions && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onApplySuggestions}
                disabled={busy || suggestionNights === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Vorschläge übernehmen
              </button>
              <span className="text-xs text-gray-500">
                {suggestionNights === 0
                  ? 'Alle freien Nächte entsprechen schon den Regeln'
                  : `${suggestionNights} freie Nächte werden geändert`}
              </span>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Eigene Werte für den ganzen Zeitraum
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-500">
                € / Nacht
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="unverändert"
                  className={`block w-32 mt-1 px-2 py-1.5 text-sm border rounded-lg ${
                    priceValid ? 'border-gray-200' : 'border-red-400'
                  }`}
                />
              </label>
              <label className="text-xs text-gray-500">
                Nächte min.
                <input
                  type="number"
                  min={1}
                  value={minStay}
                  onChange={(e) => setMinStay(e.target.value)}
                  placeholder="unverändert"
                  className={`block w-28 mt-1 px-2 py-1.5 text-sm border rounded-lg ${
                    stayValid ? 'border-gray-200' : 'border-red-400'
                  }`}
                />
              </label>
              <button
                onClick={() => onApplyManual(manual)}
                disabled={busy || manualNights === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Werte setzen
              </button>
            </div>
            <div className="mt-2 space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={includeBlocked}
                  onChange={(e) => setIncludeBlocked(e.target.checked)}
                />
                auch belegte und gesperrte Nächte (Verfügbarkeit bleibt unverändert)
              </label>
              {suggestions && (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  als festen Zeitraum in die Preisregeln übernehmen (sonst überschreibt der nächste
                  Vorschlag ihn wieder)
                </label>
              )}
              {manualNights > 0 && (
                <p className="text-xs text-gray-500">{manualNights} Nächte werden geändert</p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Vor jeder Änderung wird der Zeitraum gesichert — die letzte Übernahme lässt sich in der
            Übersicht rückgängig machen. Beds24 gibt Preise und Mindestaufenthalt an alle
            verbundenen Portale weiter.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
