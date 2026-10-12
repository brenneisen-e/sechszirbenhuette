'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarOff, CheckCircle2, Loader2, LockOpen, Save } from 'lucide-react';

interface Status {
  horizon: string | null;
  today: string;
  windowEnd: string;
  lastRun: string | null;
}

type Response = Partial<Status> & {
  success?: boolean;
  result?: string;
  closedNights?: number;
  released?: number;
  skippedBooked?: number;
  error?: string;
};

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * „Buchbar bis“ im Beds24-Cockpit: Nach diesem Datum sperrt der tägliche Lauf
 * jede neu ins Beds24-Fenster rückende Nacht (lib/server/bookingHorizon.ts).
 */
export default function BookingHorizonSetting() {
  const [status, setStatus] = useState<Status | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Nach dem Verschieben nach hinten: Zeitraum, der noch gesperrt ist
  const [pendingRelease, setPendingRelease] = useState<{ from: string; to: string } | null>(null);

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/beds24', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as Response;
  };

  useEffect(() => {
    call({ action: 'getBookingHorizon' })
      .then((data) => {
        if (data.today) {
          setStatus(data as Status);
          setInput(data.horizon || '');
        }
      })
      .catch(() => setMessage({ ok: false, text: '„Buchbar bis“ konnte nicht geladen werden' }));
  }, []);

  const save = async (value: string) => {
    if (!status) return;
    const previous = status.horizon;
    setBusy(true);
    setMessage(null);
    setPendingRelease(null);
    try {
      const data = await call({ action: 'setBookingHorizon', horizon: value });
      if (data.today) setStatus(data as Status);
      if (!data.success) {
        setMessage({
          ok: false,
          text: `${data.error || 'Unbekannter Fehler'}${
            value ? ' — der nächste nächtliche Lauf versucht es erneut.' : ''
          }`,
        });
        return;
      }
      if (!value) {
        setMessage({
          ok: true,
          text: 'Abgeschaltet. Neue Tage am Ende des Beds24-Fensters bleiben ab jetzt frei.',
        });
      } else {
        const n = data.closedNights ?? 0;
        setMessage({
          ok: true,
          text:
            n > 0
              ? `Gespeichert — ${n} Nächte nach dem ${formatDate(value)} bei Beds24 gesperrt.`
              : `Gespeichert — nach dem ${formatDate(value)} war bereits alles gesperrt.`,
        });
      }
      // Datum nach hinten verschoben oder abgeschaltet: Die Nächte dazwischen
      // sind weiterhin gesperrt — Freigabe nur auf ausdrücklichen Klick
      if (previous && (!value || value > previous)) {
        setPendingRelease({ from: addDays(previous, 1), to: value || status.windowEnd });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler beim Speichern' });
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    if (!pendingRelease) return;
    const ok = window.confirm(
      `Nächte vom ${formatDate(pendingRelease.from)} bis ${formatDate(pendingRelease.to)} ` +
        'auf allen Portalen buchbar machen?\n\n' +
        'Vorher die Saisonpreise für diesen Zeitraum übertragen — sonst setzen die Portale ' +
        'ihren Standardpreis an. Gebuchte Nächte bleiben gesperrt.',
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await call({ action: 'releaseHorizon', ...pendingRelease });
      if (data.success) {
        setPendingRelease(null);
        setMessage({
          ok: true,
          text:
            `${data.released ?? 0} Nächte freigegeben.` +
            (data.skippedBooked ? ` ${data.skippedBooked} gebuchte Nächte bleiben gesperrt.` : '') +
            ' Danach am besten „Belegungen abgleichen“ laufen lassen.',
        });
      } else {
        setMessage({ ok: false, text: data.error || 'Freigabe fehlgeschlagen' });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler bei der Freigabe' });
    } finally {
      setBusy(false);
    }
  };

  const changed = (input || null) !== (status?.horizon ?? null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 flex items-center gap-1.5">
        <CalendarOff className="w-3.5 h-3.5" /> Buchbar bis
      </p>
      <p className="text-xs text-gray-500">
        Beds24 öffnet jeden Tag einen weiteren Tag am Ende seines Buchungsfensters (rund zwei Jahre)
        — standardmäßig frei, mit dem Standardpreis der Portale. Mit Datum sperrt die App jeden Tag
        automatisch alles danach.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={input}
          min={status?.today}
          onChange={(e) => setInput(e.target.value)}
          disabled={!status || busy}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
        />
        <button
          onClick={() => save(input)}
          disabled={!status || busy || !input || !changed}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern
        </button>
        {status?.horizon && (
          <button
            onClick={() => {
              setInput('');
              save('');
            }}
            disabled={busy}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Abschalten
          </button>
        )}
      </div>
      {status && !message && (
        <p className="text-xs text-gray-500">
          {status.horizon
            ? `Aktiv: buchbar bis ${formatDate(status.horizon)}, gesperrt ab ${formatDate(
                addDays(status.horizon, 1),
              )}. ${
                status.lastRun === status.today
                  ? 'Heute erledigt.'
                  : 'Heute noch nicht gelaufen — der nächste Lauf holt das nach.'
              }`
            : 'Aus — neue Tage am Ende des Beds24-Fensters werden nicht gesperrt.'}
        </p>
      )}
      {pendingRelease && (
        <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-2">
          <p>
            Die Nächte vom {formatDate(pendingRelease.from)} bis {formatDate(pendingRelease.to)}{' '}
            sind weiterhin gesperrt. Zuerst die Saisonpreise für diesen Zeitraum übertragen, dann
            freigeben.
          </p>
          <button
            onClick={release}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 disabled:opacity-50"
          >
            <LockOpen className="w-4 h-4" />
            Nächte freigeben
          </button>
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
