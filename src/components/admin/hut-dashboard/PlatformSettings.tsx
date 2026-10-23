'use client';

import { useState } from 'react';
import { Info, Loader2, X } from 'lucide-react';

import {
  type PlatformConfig,
  platformInfo,
  platformPrice,
  type PlatformSetting,
  sanitizePlatformConfig,
} from '@/lib/dashboard/hutDashboard';

import { euroShort, type HutSlot, savePlatformConfig } from './api';

// Welche Plattform bekommt welchen Preis? Beds24 liefert über die
// Schnittstelle nur die Tagespreise (Preisfelder 1–16), nicht die
// Multiplikatoren der Kanäle. Hier wird je Hütte festgehalten, was in Beds24
// unter Channel Manager → Kanal eingestellt ist — die Übersicht rechnet dann
// genauso.

interface Props {
  slot: HutSlot;
  /** Tag für die Vorschau */
  previewDay: string;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm tabular-nums focus:border-gray-400 focus:outline-none';

export default function PlatformSettings({ slot, previewDay, onClose, onSaved }: Props) {
  const data = slot.data;
  const [config, setConfig] = useState<PlatformConfig>(() =>
    sanitizePlatformConfig(data?.config ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;
  const knownSlots = data.slots.length > 0 ? data.slots : [1];

  const update = (key: PlatformSetting['key'], patch: Partial<PlatformSetting>) =>
    setConfig((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await savePlatformConfig(slot.target, sanitizePlatformConfig(config));
    setSaving(false);
    if (res.error || !res.data) {
      setError(res.error || 'Speichern fehlgeschlagen');
      return;
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Plattformpreise ${slot.name}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Plattformpreise</h2>
            <p className="text-sm text-gray-500">{slot.name}</p>
          </div>
          <button
            onClick={onClose}
            title="Schließen"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <Info className="w-4 h-4 shrink-0 text-gray-400" />
          <p>
            Beds24 gibt über die Schnittstelle nur die Tagespreise heraus, nicht die Aufschläge je
            Kanal. Hier eintragen, was in Beds24 unter Channel Manager → Kanal eingestellt ist:
            welches Preisfeld der Kanal bekommt und den Multiplikator (z. B. „*1.15“ = Faktor 1,15).
            Ohne Eintrag bekommen alle Plattformen Preis 1 unverändert.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_7rem_5.5rem_5.5rem_5.5rem] gap-2 px-1 text-[11px] uppercase tracking-wide text-gray-400">
            <span>Plattform</span>
            <span>Preisfeld</span>
            <span>Faktor</span>
            <span>± €/Nacht</span>
            <span className="text-right">Vorschau</span>
          </div>
          {config.platforms.map((setting) => {
            const info = platformInfo(setting.key);
            const preview = platformPrice(data.days[previewDay], setting, config.rounding);
            return (
              <div
                key={setting.key}
                className={`grid grid-cols-2 items-center gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_7rem_5.5rem_5.5rem_5.5rem] ${
                  setting.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <label className="col-span-2 flex items-center gap-2 text-sm text-gray-900 sm:col-span-1">
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    onChange={(e) => update(setting.key, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-green-600"
                  />
                  <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
                  {info.label}
                </label>
                <label className="text-xs text-gray-500 sm:text-sm">
                  <span className="sm:hidden">Preisfeld</span>
                  <select
                    value={setting.slot}
                    onChange={(e) => update(setting.key, { slot: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Preis {n}
                        {knownSlots.includes(n) ? '' : ' (leer)'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-500 sm:text-sm">
                  <span className="sm:hidden">Faktor</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="5"
                    value={setting.factor}
                    onChange={(e) => update(setting.key, { factor: Number(e.target.value) })}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs text-gray-500 sm:text-sm">
                  <span className="sm:hidden">± €/Nacht</span>
                  <input
                    type="number"
                    step="1"
                    value={setting.add}
                    onChange={(e) => update(setting.key, { add: Number(e.target.value) })}
                    className={inputClass}
                  />
                </label>
                <div className="text-right text-sm font-medium tabular-nums text-gray-900">
                  <span className="mr-1 text-xs font-normal text-gray-400 sm:hidden">Vorschau</span>
                  {preview === null ? '—' : euroShort(preview)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            Runden auf
            <select
              value={config.rounding}
              onChange={(e) => setConfig((prev) => ({ ...prev, rounding: Number(e.target.value) }))}
              className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
            >
              <option value={0}>Cent (nicht runden)</option>
              <option value={1}>volle Euro</option>
              <option value={5}>5 €</option>
              <option value={10}>10 €</option>
            </select>
          </label>
          <span className="text-xs text-gray-400">
            Vorschau für die Nacht vom {previewDay.split('-').reverse().join('.')}
          </span>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
