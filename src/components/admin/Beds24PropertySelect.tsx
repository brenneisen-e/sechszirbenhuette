'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, Loader2, Save } from 'lucide-react';

// Auswahl der Beds24-Unterkunft. Das Beds24-Konto wird mit der Natberger Hütte
// geteilt — alle Abfragen und Änderungen im Admin Center beziehen sich nur auf
// die hier gewählte Unterkunft (serverseitig in /api/admin/beds24 erzwungen).

interface PropertyOption {
  id: number;
  name: string;
  rooms: { id: number; name: string }[];
}

interface Props {
  propertyId: number | null;
  onChange: (propertyId: number) => void;
}

export default function Beds24PropertySelect({ propertyId, onChange }: Props) {
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(!propertyId);
  const [choice, setChoice] = useState(propertyId ? String(propertyId) : '');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listProperties' }),
      });
      const data = (await res.json()) as { properties?: PropertyOption[]; error?: string };
      if (data.properties) {
        setProperties(data.properties);
        // Vorschlag: die Unterkunft, deren Name nach Sechszirbenhütte klingt
        if (!propertyId) {
          const guess = data.properties.find((p) => /sechs|zirben/i.test(p.name));
          if (guess) setChoice(String(guess.id));
        }
      } else {
        setError(data.error || 'Unterkünfte konnten nicht geladen werden');
      }
    } catch {
      setError('Verbindungsfehler beim Laden der Unterkünfte');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!choice) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setProperty', propertyId: Number(choice) }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setEditing(false);
        onChange(Number(choice));
      } else {
        setError(data.error || 'Speichern fehlgeschlagen');
      }
    } catch {
      setError('Verbindungsfehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const current = properties.find((p) => p.id === propertyId);

  if (!editing && propertyId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-gray-700">
          <Building2 className="w-4 h-4 text-gray-400" />
          Unterkunft: <strong>{current?.name || 'Unterkunft'}</strong>
          <span className="text-xs text-gray-400">
            Property-ID {propertyId}
            {current && ` · Zimmer ${current.rooms.map((r) => r.id).join(', ')}`}
          </span>
        </span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          ändern
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-300 p-4 space-y-3 text-sm">
      <div>
        <p className="font-semibold text-gray-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          Welche Beds24-Unterkunft ist die Sechszirbenhütte?
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Das Beds24-Konto wird mit der Natberger Hütte geteilt. Erst nach dieser Auswahl zeigt das
          Cockpit Preise und Buchungen — und zwar nur die der gewählten Unterkunft. Änderungen an
          Zimmern anderer Unterkünfte lehnt das Admin Center ab.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Unterkünfte aus Beds24…
        </p>
      )}

      {!loading && properties.length > 0 && (
        <div className="space-y-1.5">
          {properties.map((p) => (
            <label
              key={p.id}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                choice === String(p.id) ? 'border-green-600 bg-green-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="beds24-property"
                checked={choice === String(p.id)}
                onChange={() => setChoice(String(p.id))}
                className="mt-0.5 accent-green-600"
              />
              <span>
                <span className="font-medium text-gray-800">{p.name || 'Ohne Namen'}</span>
                <span className="block text-xs text-gray-500">
                  Property-ID {p.id} · Zimmer:{' '}
                  {p.rooms.length > 0
                    ? p.rooms.map((r) => `${r.name || 'Zimmer'} (${r.id})`).join(', ')
                    : 'keine'}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!choice || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Unterkunft festlegen
        </button>
        {propertyId && (
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
}
