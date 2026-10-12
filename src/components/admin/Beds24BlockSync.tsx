'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldAlert, X } from 'lucide-react';

// Belegungen abgleichen: Nächte, die laut Portal-Kalendern (iCal von Feratel,
// FeWo, Booking.com), Gästedatenbank oder einer eingetragenen Liste belegt
// sind, bei Beds24 aber noch als frei gelten. Solche Nächte meldet Beds24 an
// alle Portale als buchbar — Doppelbuchungsgefahr. Hier lassen sie sich in
// einem Schritt bei Beds24 sperren (Verfügbarkeit 0).

interface DayValues {
  numAvail?: number;
}

interface Range {
  /** Erste Nacht (Anreisetag) */
  from: string;
  /** Abreisetag (exklusiv) */
  to: string;
  label: string;
  source: string;
}

interface Props {
  roomId: number | null;
  dayMap: Record<string, DayValues>;
  /** Beds24-Buchungen — deren Nächte gelten als belegt */
  beds24Ranges: { from: string; to: string }[];
  /** Belegungen aus Gästedatenbank und Portal-iCal */
  knownRanges: Range[];
  onBlocked: () => void;
}

interface MissingRange {
  key: string;
  from: string;
  /** Letzte Nacht (inklusive) */
  to: string;
  nights: number;
  label: string;
  source: string;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** „22.03.2027 - 27.03.2027“ oder „2027-03-22 2027-03-27“ → ISO-Paar */
function parseManualLine(line: string): { from: string; to: string } | null {
  const dates: string[] = [];
  const pattern = /(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\.(\d{1,2})\.(\d{4})/g;
  let match = pattern.exec(line);
  while (match) {
    if (match[1]) {
      dates.push(`${match[1]}-${match[2]}-${match[3]}`);
    } else {
      dates.push(`${match[6]}-${match[5]?.padStart(2, '0')}-${match[4]?.padStart(2, '0')}`);
    }
    match = pattern.exec(line);
  }
  const [from, to] = dates;
  if (!from || !to || to <= from) return null;
  return { from, to };
}

export default function Beds24BlockSync({
  roomId,
  dayMap,
  beds24Ranges,
  knownRanges,
  onBlocked,
}: Props) {
  const [manualText, setManualText] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const manualRanges = useMemo(() => {
    const ranges: Range[] = [];
    const invalid: string[] = [];
    for (const raw of manualText.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const parsed = parseManualLine(line);
      if (parsed) ranges.push({ ...parsed, label: line, source: 'Eingetragen' });
      else invalid.push(line);
    }
    return { ranges, invalid };
  }, [manualText]);

  // Nächte, die bei Beds24 offen sind, obwohl eine Quelle sie als belegt führt
  const missing = useMemo(() => {
    const beds24Nights = new Set<string>();
    for (const r of beds24Ranges) {
      let day = r.from;
      let guard = 0;
      while (day < r.to && guard < 800) {
        beds24Nights.add(day);
        day = addDaysIso(day, 1);
        guard++;
      }
    }

    const result: MissingRange[] = [];
    for (const range of [...knownRanges, ...manualRanges.ranges]) {
      let runStart: string | null = null;
      let runEnd = '';
      let runNights = 0;
      const flush = () => {
        if (runStart) {
          result.push({
            key: `${range.source}-${runStart}-${runEnd}`,
            from: runStart,
            to: runEnd,
            nights: runNights,
            label: range.label,
            source: range.source,
          });
        }
        runStart = null;
        runNights = 0;
      };
      let day = range.from < today ? today : range.from;
      let guard = 0;
      while (day < range.to && guard < 800) {
        const info = dayMap[day];
        // Nur Nächte, für die Beds24 Werte liefert und die dort offen sind
        const open = !!info && info.numAvail !== 0 && !beds24Nights.has(day);
        if (open) {
          if (!runStart) runStart = day;
          runEnd = day;
          runNights++;
        } else {
          flush();
        }
        day = addDaysIso(day, 1);
        guard++;
      }
      flush();
    }

    // Dieselben Nächte aus mehreren Quellen nur einmal führen
    const seen = new Set<string>();
    return result
      .filter((r) => {
        const id = `${r.from}-${r.to}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => a.from.localeCompare(b.from));
  }, [knownRanges, manualRanges.ranges, beds24Ranges, dayMap, today]);

  const chosen = missing.filter((r) => selected[r.key] !== false);
  const chosenNights = chosen.reduce((sum, r) => sum + r.nights, 0);

  const block = async () => {
    if (!roomId || chosen.length === 0) return;
    setConfirming(false);
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setCalendarBatch',
          roomId,
          label: `Belegungen gesperrt (${chosenNights} Nächte)`,
          entries: chosen.map((r) => ({ from: r.from, to: r.to, numAvail: 0 })),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setMessage({
          ok: true,
          text: `${chosenNights} Nächte bei Beds24 gesperrt. Beds24 gibt die Sperre sofort an alle Portale weiter.`,
        });
        setManualText('');
        setSelected({});
        onBlocked();
      } else {
        setMessage({ ok: false, text: data.error || 'Sperren fehlgeschlagen' });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler beim Sperren' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-lg p-4 text-sm space-y-3 ${
        missing.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
      }`}
    >
      <div>
        <p className="font-semibold text-gray-800 flex items-center gap-1.5">
          <ShieldAlert
            className={`w-4 h-4 ${missing.length > 0 ? 'text-red-600' : 'text-gray-400'}`}
          />
          Belegungen abgleichen
          {missing.length > 0 && (
            <span className="text-xs font-medium text-red-700">
              — {missing.reduce((s, r) => s + r.nights, 0)} belegte Nächte sind bei Beds24 frei
            </span>
          )}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Vergleicht die Portal-Kalender (Feratel, FeWo-direkt, Booking.com per iCal), die
          Gästedatenbank und die Liste unten mit Beds24. Nächte, die dort belegt, bei Beds24 aber
          frei sind, meldet Beds24 an alle Portale als buchbar — die sollten gesperrt werden.
        </p>
      </div>

      <label className="block text-xs text-gray-600">
        Weitere Buchungen eintragen — eine pro Zeile, Anreise bis Abreise (z.B. „22.03.2027 -
        27.03.2027 Familie Muster“)
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-mono"
        />
      </label>
      {manualRanges.invalid.length > 0 && (
        <p className="text-xs text-red-700">Nicht erkannt: {manualRanges.invalid.join(' · ')}</p>
      )}

      {missing.length === 0 ? (
        <p className="text-xs text-green-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Alle bekannten Belegungen sind bei Beds24 gesperrt oder gebucht.
        </p>
      ) : (
        <>
          <div className="divide-y divide-red-100 bg-white rounded-lg border border-red-100">
            {missing.map((r) => (
              <label key={r.key} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected[r.key] !== false}
                  onChange={() =>
                    setSelected((prev) => ({ ...prev, [r.key]: prev[r.key] === false }))
                  }
                  className="w-4 h-4 accent-red-600"
                />
                <span className="flex-1 min-w-0">
                  <span className="text-gray-800">
                    {formatDate(r.from)} – {formatDate(addDaysIso(r.to, 1))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {' '}
                    · {r.nights} {r.nights === 1 ? 'Nacht' : 'Nächte'} · {r.source}
                  </span>
                  <span className="block text-xs text-gray-400 truncate">{r.label}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setConfirming(true)}
            disabled={saving || !roomId || chosen.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {chosenNights} Nächte bei Beds24 sperren
          </button>
        </>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 my-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{chosenNights} Nächte sperren?</h3>
              <button
                onClick={() => setConfirming(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              {chosen.map((r) => (
                <li key={r.key}>
                  {formatDate(r.from)} – {formatDate(addDaysIso(r.to, 1))} ({r.nights}{' '}
                  {r.nights === 1 ? 'Nacht' : 'Nächte'}, {r.source})
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500">
              Die Nächte werden auf allen Portalen geschlossen. Freigeben lässt sich ein Tag
              jederzeit im Kalender (markieren → „Werte ändern…“ → Verfügbarkeit „freigeben“).
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={block}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Lock className="w-4 h-4" />
                Jetzt sperren
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
