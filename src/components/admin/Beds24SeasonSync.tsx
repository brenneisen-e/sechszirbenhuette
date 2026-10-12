'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';

// Saisonpreise aus dem Mietpreise-Tab (rental_prices) an Beds24 übertragen.
// Beds24 gibt Preis und Mindestaufenthalt an alle verbundenen Portale weiter
// (Booking.com, Feratel, FeWo-direkt) — so bleibt der Mietpreise-Tab die
// eine Stelle, an der die Saisonpreise gepflegt werden.

interface RentalPrice {
  id: number;
  name: string;
  date_from: string;
  date_to: string;
  price_per_night: number;
  mindestaufenthalt: number;
  aktiv: number;
}

interface DayValues {
  price1?: number;
  minStay?: number;
}

interface Props {
  roomId: number | null;
  /** Aktuelle Tageswerte aus Beds24 (YYYY-MM-DD → Preis/Mindestaufenthalt) */
  dayMap: Record<string, DayValues>;
  /** Nach erfolgreicher Übertragung das Cockpit neu laden */
  onSynced: () => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weichen die Beds24-Werte im Zeitraum von der Saison ab? */
function periodDiff(
  period: { from: string; to: string; price: number; minStay: number },
  dayMap: Record<string, DayValues>,
): { differs: boolean; known: boolean } {
  let day = period.from;
  let known = false;
  let guard = 0;
  while (day <= period.to && guard < 800) {
    const info = dayMap[day];
    if (info) {
      known = true;
      if (info.price1 !== period.price || (info.minStay ?? 1) !== period.minStay) {
        return { differs: true, known };
      }
    }
    day = addDaysIso(day, 1);
    guard++;
  }
  return { differs: false, known };
}

/** Spanne der aktuellen Beds24-Werte im Zeitraum, z.B. „120–129 €“ — leer, wenn unbekannt. */
function currentSpan(
  period: { from: string; to: string },
  dayMap: Record<string, DayValues>,
): { price: string; minStay: string } {
  const prices = new Set<number>();
  const stays = new Set<number>();
  let day = period.from;
  let guard = 0;
  while (day <= period.to && guard < 800) {
    const info = dayMap[day];
    if (info?.price1 !== undefined) prices.add(info.price1);
    if (info) stays.add(info.minStay ?? 1);
    day = addDaysIso(day, 1);
    guard++;
  }
  const span = (values: Set<number>, unit: string) => {
    if (values.size === 0) return '';
    const sorted = [...values].sort((a, b) => a - b);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    return low === high ? `${low}${unit}` : `${low}–${high}${unit}`;
  };
  return { price: span(prices, ' €'), minStay: span(stays, ' N') };
}

export default function Beds24SeasonSync({ roomId, dayMap, onSynced }: Props) {
  const [prices, setPrices] = useState<RentalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Bestätigungsdialog: zeigt alt → neu, bevor etwas an die Portale geht
  const [confirming, setConfirming] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rental-prices');
      const data = (await res.json()) as { prices?: RentalPrice[] };
      setPrices(data.prices || []);
    } catch {
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Nur aktive Saisons, die heute noch laufen — Vergangenes kann Beds24
  // ohnehin nicht mehr ändern. Startet eine Saison in der Vergangenheit,
  // wird ab heute übertragen.
  const periods = useMemo(
    () =>
      prices
        .filter((p) => p.aktiv && p.date_to >= today && p.price_per_night > 0)
        .map((p) => {
          const period = {
            id: p.id,
            name: p.name,
            from: p.date_from < today ? today : p.date_from,
            to: p.date_to,
            price: Number(p.price_per_night),
            minStay: Math.max(1, Number(p.mindestaufenthalt) || 1),
          };
          return { ...period, ...periodDiff(period, dayMap) };
        }),
    [prices, today, dayMap],
  );

  // Bewusst keine Vorauswahl: Jede Saison wird aktiv angehakt, bevor sie an
  // alle Portale geht. Auswahl verwerfen, wenn sich die Saisons ändern.
  useEffect(() => {
    setSelected({});
  }, [prices]);

  const chosen = periods.filter((p) => selected[p.id]);

  const sync = async () => {
    if (!roomId || chosen.length === 0) return;
    setConfirming(false);
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setCalendarBatch',
          roomId,
          label: `Saisonpreise übertragen: ${chosen.map((p) => p.name).join(', ')}`.slice(0, 200),
          entries: chosen.map((p) => ({
            from: p.from,
            to: p.to,
            price1: p.price,
            minStay: p.minStay,
          })),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; count?: number };
      if (data.success) {
        setMessage({
          ok: true,
          text: `${data.count ?? chosen.length} Zeitraum/Zeiträume an Beds24 übertragen. Preise gehen sofort an die Portale, den Mindestaufenthalt überträgt Beds24 mit der nächsten Aktualisierung. Die vorherigen Werte sind gesichert und lassen sich unter „Sicherungen“ zurückholen.`,
        });
        onSynced();
      } else {
        setMessage({ ok: false, text: data.error || 'Übertragung fehlgeschlagen' });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler bei der Übertragung' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
      <div>
        <p className="font-semibold text-gray-800">Saisonpreise an Beds24 übertragen</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Quelle ist der Tab &bdquo;Mietpreise&ldquo;. Übertragen werden Preis pro Nacht (price1)
          und Mindestaufenthalt — Beds24 verteilt sie an Booking.com, Feratel, FeWo-direkt und
          Airbnb. Die Spalte „Beds24“ zeigt, welche Saisons dort abweichen.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Saisonpreise…
        </p>
      )}

      {!loading && periods.length === 0 && (
        <p className="text-xs text-gray-400">
          Keine aktiven, laufenden Saisons im Tab &bdquo;Mietpreise&ldquo; hinterlegt.
        </p>
      )}

      {periods.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 pr-2 w-6" />
                <th className="py-1 pr-2 font-medium">Saison</th>
                <th className="py-1 pr-2 font-medium">Zeitraum</th>
                <th className="py-1 pr-2 font-medium text-right">Preis</th>
                <th className="py-1 pr-2 font-medium text-right">Min.</th>
                <th className="py-1 font-medium">Beds24</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {periods.map((p) => {
                let status = <span className="text-gray-400">nicht im Cockpit-Zeitraum</span>;
                if (p.known && p.differs) {
                  status = <span className="text-amber-700">weicht ab</span>;
                } else if (p.known) {
                  status = <span className="text-green-700">aktuell</span>;
                }
                return (
                  <tr key={p.id} className="text-gray-700">
                    <td className="py-1.5 pr-2">
                      <input
                        type="checkbox"
                        checked={!!selected[p.id]}
                        onChange={() => setSelected((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="w-4 h-4 accent-green-600"
                      />
                    </td>
                    <td className="py-1.5 pr-2">{p.name}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {formatDate(p.from)} – {formatDate(p.to)}
                    </td>
                    <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                      {p.price.toFixed(0)} €
                    </td>
                    <td className="py-1.5 pr-2 text-right">{p.minStay} N</td>
                    <td className="py-1.5">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {periods.length > 0 && (
        <button
          onClick={() => setConfirming(true)}
          disabled={syncing || !roomId || chosen.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {chosen.length} Saison(s) an Beds24 übertragen
        </button>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-5 my-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">An alle Portale übertragen?</h3>
              <button
                onClick={() => setConfirming(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Beds24 schickt diese Preise und Mindestaufenthalte sofort an Booking.com, Feratel,
              FeWo-direkt und Airbnb. Bitte jede Zeile prüfen. Die bisherigen Werte werden vorher
              gesichert und lassen sich zurückholen.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400">
                    <th className="py-1 pr-2 font-medium">Saison</th>
                    <th className="py-1 pr-2 font-medium">Zeitraum</th>
                    <th className="py-1 pr-2 font-medium text-right">Preis bisher → neu</th>
                    <th className="py-1 font-medium text-right">Min. bisher → neu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chosen.map((p) => {
                    const now = currentSpan(p, dayMap);
                    return (
                      <tr key={p.id} className="text-gray-700">
                        <td className="py-1.5 pr-2">{p.name}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          {formatDate(p.from)} – {formatDate(p.to)}
                        </td>
                        <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                          <span className="text-gray-400">{now.price || 'unbekannt'}</span> →{' '}
                          <strong>{p.price.toFixed(0)} €</strong>
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <span className="text-gray-400">{now.minStay || 'unbekannt'}</span> →{' '}
                          <strong>{p.minStay} N</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={sync}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                Jetzt an alle Portale übertragen
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`text-sm flex items-start gap-1.5 ${message.ok ? 'text-green-700' : 'text-red-700'}`}
        >
          {message.ok ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}
