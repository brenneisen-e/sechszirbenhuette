'use client';

import { useState } from 'react';
import { CalendarRange, Loader2, X } from 'lucide-react';

import { formatRange, type HutData, nightsOf, summarize } from '@/lib/pricing/dynamicPricing';
import { type SeasonPlan, templatePrices } from '@/lib/pricing/seasonPlan';

import { euroList } from './api';

// Saisonpreise eines Jahres auf einen Blick: Zeiträume mit Vorlage,
// aktuellem Beds24-Preis und neuem Tagespreis. Der Preis für Januar/Februar
// bei Booking.com bestimmt alle anderen im Verhältnis der Vorlagen; jeder
// Wert lässt sich vor dem Übernehmen noch ändern.

export interface PlanRowValue {
  from: string;
  to: string;
  label: string;
  price: number;
  minStay?: number;
}

interface Props {
  plan: SeasonPlan;
  hut: HutData;
  hasRules: boolean;
  busy: boolean;
  error: string;
  message: string;
  onApply: (rows: PlanRowValue[], remember: boolean) => void;
  onClose: () => void;
}

const inputClass =
  'px-2 py-1 text-sm border rounded-lg focus:outline-none focus:border-gray-400 tabular-nums';

export default function SeasonPlanPanel({
  plan,
  hut,
  hasRules,
  busy,
  error,
  message,
  onApply,
  onClose,
}: Props) {
  const [anchor, setAnchor] = useState(String(plan.defaultAnchor));
  // Von Hand geänderte Werte je Zeile (sonst gilt der Wert der Vorlage)
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [stays, setStays] = useState<Record<number, string>>({});
  const [remember, setRemember] = useState(true);

  const anchorValue = Number(anchor.replace(',', '.'));
  const anchorValid = Number.isFinite(anchorValue) && anchorValue > 0;
  const byTemplate = templatePrices(plan, anchorValid ? anchorValue : plan.defaultAnchor);
  const label = (key: string) => plan.templates.find((t) => t.key === key)?.label ?? key;

  const rows = plan.rows.map((row, i) => {
    const template = plan.templates.find((t) => t.key === row.template);
    const priceText = prices[i] ?? String(byTemplate[row.template] ?? '');
    const stayText = stays[i] ?? (template?.minStay ? String(template.minStay) : '');
    const price = Number(priceText.replace(',', '.'));
    const minStay = stayText.trim() === '' ? undefined : Math.round(Number(stayText));
    const summary = summarize(row.from, row.to, hut.days, null);
    const current = [...new Set([...summary.prices, ...summary.blockedPrices])].sort(
      (a, b) => a - b,
    );
    return {
      ...row,
      priceText,
      stayText,
      price,
      minStay,
      valid:
        Number.isFinite(price) &&
        price > 0 &&
        (minStay === undefined || (Number.isInteger(minStay) && minStay >= 1)),
      current,
      loaded: summary.nights > 0,
      booked: summary.blocked,
      nights: nightsOf(row.from, row.to).length,
    };
  });
  const allValid = anchorValid && rows.every((r) => r.valid);

  type Row = (typeof rows)[number];
  const currentText = (r: Row) =>
    `${r.loaded ? euroList(r.current) : 'nicht geladen'}${r.booked > 0 ? ` · ${r.booked} N. belegt` : ''}`;
  const priceInput = (r: Row, i: number) => (
    <input
      type="number"
      min={1}
      value={r.priceText}
      aria-label={`${label(r.template)} € pro Nacht`}
      onChange={(e) => setPrices((prev) => ({ ...prev, [i]: e.target.value }))}
      className={`${inputClass} w-24 ${r.valid ? 'border-gray-200' : 'border-red-400'}`}
    />
  );
  const stayInput = (r: Row, i: number) => (
    <input
      type="number"
      min={1}
      value={r.stayText}
      placeholder="min. unverändert"
      aria-label={`${label(r.template)} Mindestaufenthalt`}
      onChange={(e) => setStays((prev) => ({ ...prev, [i]: e.target.value }))}
      className={`${inputClass} w-36 border-gray-200`}
    />
  );

  const apply = () =>
    onApply(
      rows.map((r) => ({
        from: r.from,
        to: r.to,
        label: label(r.template),
        price: r.price,
        minStay: r.minStay,
      })),
      remember,
    );

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Saisonpreise {plan.year} · {hut.name}
          </p>
          <p className="text-xs text-gray-500">
            Tagespreise je Nacht. Zeiträume aus der Saisonliste, Preise im Verhältnis der
            Feratel-Vorlagen; über Weihnachten sind nur die Feiertage teurer.
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

      <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-3">
        {plan.anchorLabel}
        <input
          type="number"
          min={1}
          value={anchor}
          onChange={(e) => {
            setAnchor(e.target.value);
            setPrices({});
          }}
          className={`${inputClass} w-24 ${anchorValid ? 'border-gray-200' : 'border-red-400'}`}
        />
        € pro Nacht — die anderen Saisons im Verhältnis dazu
      </label>

      {/* Desktop: Tabelle */}
      <table className="hidden md:table w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="text-left font-medium py-1.5 pr-3">Saison</th>
            <th className="text-left font-medium py-1.5 pr-3">Zeitraum</th>
            <th className="text-left font-medium py-1.5 pr-3">Beds24 jetzt</th>
            <th className="text-left font-medium py-1.5 pr-3">Neu € / Nacht</th>
            <th className="text-left font-medium py-1.5">Nächte min.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.from} className="border-t border-gray-100">
              <td className="py-1.5 pr-3 font-medium text-gray-900 whitespace-nowrap">
                {label(r.template)}
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700">
                {formatRange(r.from, r.to)}
                <span className="ml-1 text-xs text-gray-400">{r.nights} N.</span>
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500">{currentText(r)}</td>
              <td className="py-1.5 pr-3">{priceInput(r, i)}</td>
              <td className="py-1.5">{stayInput(r, i)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobil: je Saison eine Zeile, Eingaben direkt darunter */}
      <div className="md:hidden divide-y divide-gray-100 border-t border-gray-100">
        {rows.map((r, i) => (
          <div key={r.from} className="py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">{label(r.template)}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatRange(r.from, r.to)} · {r.nights} N.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
              <span className="text-xs text-gray-500">jetzt {currentText(r)}</span>
              <span className="text-gray-400">→</span>
              {priceInput(r, i)}
              <span className="text-xs text-gray-500">€</span>
              {stayInput(r, i)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {hasRules && (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            als feste Zeiträume in die Preisregeln übernehmen (sonst überschreiben spätere
            Vorschläge die Saisonpreise)
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={apply}
            disabled={busy || !allValid}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarRange className="w-4 h-4" />
            )}
            Saisonpreise {plan.year} bei Beds24 übernehmen
          </button>
          <span className="text-xs text-gray-500">
            Preis für alle Nächte der Zeiträume, auch belegte (bestehende Buchungen bleiben
            unberührt). Verfügbarkeit bleibt, vorher wird gesichert.
          </span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
      </div>
    </div>
  );
}
