'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, History, Loader2, RotateCcw } from 'lucide-react';

// Sicherungen des Beds24-Kalenders: Vor jeder Änderung aus dem Admin Center
// legt der Server die bisherigen Werte ab (src/lib/server/beds24Snapshots.ts).
// Zurückgeholt werden Preis und Mindestaufenthalt — die Verfügbarkeit bleibt,
// damit keine inzwischen gebuchte Nacht wieder freigegeben wird.

interface Snapshot {
  id: number;
  createdAt: string;
  roomId: number;
  label: string;
  from: string;
  to: string;
  entries: number;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function formatTimestamp(sqlite: string): string {
  // D1 liefert UTC als "YYYY-MM-DD HH:MM:SS"
  const date = new Date(`${sqlite.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return sqlite;
  return date.toLocaleString('de-AT', {
    timeZone: 'Europe/Vienna',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Beds24History({ onRestored }: { onRestored: () => void }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listSnapshots' }),
      });
      const data = (await res.json()) as { snapshots?: Snapshot[]; error?: string };
      setSnapshots(data.snapshots || []);
      if (data.error) setMessage({ ok: false, text: data.error });
    } catch {
      setMessage({ ok: false, text: 'Sicherungen konnten nicht geladen werden' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (s: Snapshot) => {
    if (
      !confirm(
        `Preise und Mindestaufenthalt vom Stand ${formatTimestamp(s.createdAt)} ` +
          `(${formatDate(s.from)} – ${formatDate(s.to)}) wiederherstellen?\n\n` +
          'Beds24 schickt die Werte sofort an alle Portale. Gesperrte und gebuchte Nächte bleiben, wie sie sind.',
      )
    ) {
      return;
    }
    setRestoring(s.id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restoreSnapshot', snapshotId: s.id, roomId: s.roomId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; count?: number };
      if (data.success) {
        setMessage({
          ok: true,
          text: `Wiederhergestellt (${data.count} Zeiträume). Der Stand davor ist ebenfalls gesichert.`,
        });
        onRestored();
        load();
      } else {
        setMessage({ ok: false, text: data.error || 'Wiederherstellung fehlgeschlagen' });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler bei der Wiederherstellung' });
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
      <div>
        <p className="font-semibold text-gray-800 flex items-center gap-1.5">
          <History className="w-4 h-4 text-gray-400" />
          Sicherungen (Rückgängig)
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Vor jeder Änderung aus dem Admin Center werden die bisherigen Beds24-Werte gesichert (die
          letzten 30). „Wiederherstellen“ setzt Preis und Mindestaufenthalt des Zeitraums zurück;
          gesperrte und gebuchte Nächte bleiben unverändert.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Sicherungen…
        </p>
      )}

      {!loading && snapshots.length === 0 && (
        <p className="text-xs text-gray-400">
          Noch keine Sicherungen — sie entstehen bei der nächsten Änderung.
        </p>
      )}

      {snapshots.length > 0 && (
        <div className="divide-y divide-gray-200">
          {snapshots.map((s) => (
            <div key={s.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-gray-800 truncate">{s.label}</p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(s.createdAt)} · {formatDate(s.from)} – {formatDate(s.to)} ·
                  Zimmer {s.roomId}
                </p>
              </div>
              <button
                onClick={() => restore(s)}
                disabled={restoring !== null || s.entries === 0}
                title={s.entries === 0 ? 'Die Sicherung enthält keine Preise' : undefined}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                {restoring === s.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Wiederherstellen
              </button>
            </div>
          ))}
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
