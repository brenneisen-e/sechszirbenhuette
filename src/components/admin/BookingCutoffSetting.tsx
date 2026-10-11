'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type Mode = 'same_day' | 'day_before';

interface Status {
  mode: Mode;
  today: string;
  lastRun: string | null;
  closedDay: string | null;
}

const RESULT_TEXT: Record<string, string> = {
  closed: 'Gespeichert — heute ist bei Beds24 bereits gesperrt.',
  already_closed: 'Gespeichert — heute war bei Beds24 schon gesperrt.',
  booked: 'Gespeichert — heute Nacht ist gebucht, ab morgen greift die Sperre.',
  reopened: 'Gespeichert — der heute automatisch gesperrte Tag ist wieder buchbar.',
  saved: 'Gespeichert.',
  disabled: 'Gespeichert.',
  already_done: 'Gespeichert.',
};

function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('de-AT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Buchungsschluss im Beds24-Cockpit: Buchungen bis zum Anreisetag oder nur
 * bis zum Vortag annehmen. Die Sperre setzt lib/server/bookingCutoff.ts.
 */
export default function BookingCutoffSetting() {
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/beds24', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as Partial<Status> & {
      success?: boolean;
      result?: string;
      error?: string;
    };
  };

  useEffect(() => {
    call({ action: 'getBookingCutoff' })
      .then((data) => {
        if (data.mode) setStatus(data as Status);
      })
      .catch(() => setMessage({ ok: false, text: 'Einstellung konnte nicht geladen werden' }));
  }, []);

  const choose = async (mode: Mode) => {
    if (!status || mode === status.mode) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await call({ action: 'setBookingCutoff', mode });
      if (data.mode) setStatus(data as Status);
      if (data.success) {
        setMessage({ ok: true, text: RESULT_TEXT[data.result || 'saved'] || 'Gespeichert.' });
      } else {
        setMessage({
          ok: false,
          text: `Einstellung gespeichert, aber Beds24 hat nicht reagiert: ${data.error || 'unbekannter Fehler'}. Der nächste nächtliche Lauf versucht es erneut.`,
        });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const options: { mode: Mode; label: string; hint: string }[] = [
    {
      mode: 'same_day',
      label: 'Bis zum Anreisetag',
      hint: 'Gäste können auch für heute noch buchen.',
    },
    {
      mode: 'day_before',
      label: 'Bis zum Vortag',
      hint: 'Kurz nach Mitternacht wird der neue Tag bei Beds24 gesperrt — auf allen Portalen.',
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Buchungen annehmen</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map((o) => {
          const active = status?.mode === o.mode;
          return (
            <button
              key={o.mode}
              onClick={() => choose(o.mode)}
              disabled={!status || saving}
              className={`text-left rounded-lg border px-3 py-2 transition-colors disabled:opacity-60 ${
                active
                  ? 'border-green-600 bg-green-50 ring-1 ring-green-600'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 ${
                    active ? 'border-green-600 bg-green-600' : 'border-gray-400'
                  }`}
                />
                {o.label}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5 pl-6">{o.hint}</span>
            </button>
          );
        })}
      </div>
      {saving && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird gespeichert…
        </p>
      )}
      {status?.mode === 'day_before' && !message && (
        <p className="text-xs text-gray-500">
          {status.lastRun === status.today
            ? `Heute (${formatDay(status.today)}) erledigt.`
            : 'Heute noch nicht gelaufen — der nächste Lauf holt das nach.'}{' '}
          Ein gesperrter Tag lässt sich im Cockpit jederzeit wieder freigeben (Tag markieren →
          Verfügbarkeit „freigeben“).
        </p>
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
