'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, Save } from 'lucide-react';

// iCal-Exporte der Portale der Sechszirbenhütte. Daraus zeigt das Cockpit die
// Belegung der Portale und „Belegungen abgleichen“ findet Nächte, die bei
// Beds24 noch frei sind. Gespeichert in settings.ical_sources.
//
// WICHTIG: Nur Adressen der Sechszirbenhütte eintragen — mit Kalendern der
// Natberger Hütte würden deren Buchungen hier als belegt erscheinen.

const PORTALS = ['Feratel', 'FeWo-Direkt', 'Booking.com', 'Airbnb'] as const;

export default function Beds24IcalSources({ onSaved }: { onSaved: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json() as Promise<{ settings?: Record<string, string> }>)
      .then((data) => {
        const next: Record<string, string> = {};
        try {
          const list = JSON.parse(data.settings?.ical_sources || '[]') as {
            name: string;
            url: string;
          }[];
          for (const entry of Array.isArray(list) ? list : []) next[entry.name] = entry.url;
        } catch {
          /* leer lassen */
        }
        setUrls(next);
        setOpen(Object.keys(next).length === 0);
      })
      .catch(() => setOpen(true))
      .finally(() => setLoaded(true));
  }, []);

  const configured = PORTALS.filter((p) => urls[p]?.trim());

  const save = async () => {
    const list = PORTALS.filter((p) => urls[p]?.trim()).map((p) => ({
      name: p,
      url: (urls[p] || '').trim(),
    }));
    const invalid = list.filter((e) => !/^https:\/\//.test(e.url));
    if (invalid.length > 0) {
      setMessage({
        ok: false,
        text: `Adresse muss mit https:// beginnen: ${invalid.map((e) => e.name).join(', ')}`,
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ical_sources', value: JSON.stringify(list) }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setMessage({ ok: true, text: 'Gespeichert — Kalender wird neu geladen.' });
        setOpen(false);
        onSaved();
      } else {
        setMessage({ ok: false, text: data.error || 'Speichern fehlgeschlagen' });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            Portal-Kalender (iCal) der Sechszirbenhütte
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {configured.length > 0
              ? `Hinterlegt: ${configured.join(', ')}`
              : 'Noch keine Kalender hinterlegt — „Belegungen abgleichen“ prüft dann nur Gästedatenbank und eingetragene Liste.'}
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            bearbeiten
          </button>
        )}
      </div>

      {open && (
        <>
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            Nur die Export-Adressen der <strong>Sechszirbenhütte</strong> eintragen, nicht die der
            Natberger Hütte. Zu finden im Extranet des Portals unter Kalender-Synchronisation (iCal
            exportieren).
          </p>
          <div className="space-y-2">
            {PORTALS.map((portal) => (
              <label key={portal} className="block text-xs text-gray-600">
                {portal}
                <input
                  type="url"
                  value={urls[portal] || ''}
                  onChange={(e) => setUrls((prev) => ({ ...prev, [portal]: e.target.value }))}
                  placeholder="https://… .ics"
                  className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                />
              </label>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </>
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
