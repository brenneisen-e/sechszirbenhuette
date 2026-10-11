'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarRange,
  Home,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  Tag,
  Unplug,
  User,
} from 'lucide-react';

import Beds24Cockpit from './Beds24Cockpit';

// Beds24-Anbindung (Channel-Manager für Booking.com, Feratel und FeWo-direkt):
// Verbindet sich über einen einmaligen Invite Code mit der Beds24 API v2
// und zeigt alles an, was abrufbar ist (Konto, Properties, Zimmer, Buchungen).

const SECTIONS = [
  { target: 'account', title: 'Konto & Token', icon: User },
  { target: 'properties', title: 'Properties', icon: Home },
  { target: 'rooms', title: 'Zimmer', icon: KeyRound },
  { target: 'bookings', title: 'Buchungen (ab 30 Tage zurück)', icon: CalendarRange },
  { target: 'offers', title: 'Angebote & Gutscheine', icon: Tag },
] as const;

type Target = (typeof SECTIONS)[number]['target'];

interface SectionState {
  loading: boolean;
  error?: string;
  data?: unknown;
}

// Beds24 liefert Listen meist als { data: [...] } — defensiv auslesen
function extractRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  return [];
}

// Zimmer stecken als roomTypes-Array in den Property-Objekten
function extractRoomRows(data: unknown): Record<string, unknown>[] {
  return extractRows(data).flatMap((property) => {
    const roomTypes = (property as { roomTypes?: unknown }).roomTypes;
    if (Array.isArray(roomTypes)) {
      return roomTypes as Record<string, unknown>[];
    }
    return [];
  });
}

function str(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return '';
  return String(v);
}

function RawData({ data }: { data: unknown }) {
  return (
    <details className="mt-3">
      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
        Rohdaten anzeigen
      </summary>
      <pre className="mt-2 p-3 bg-gray-900 text-green-200 text-[11px] rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

export default function Beds24Panel() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [sections, setSections] = useState<Record<Target, SectionState>>({
    account: { loading: false },
    properties: { loading: false },
    rooms: { loading: false },
    bookings: { loading: false },
    offers: { loading: false },
  });

  const apiCall = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/beds24', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as {
      connected?: boolean;
      success?: boolean;
      error?: string;
      data?: unknown;
    };
  };

  const loadSection = useCallback(async (target: Target) => {
    setSections((prev) => ({ ...prev, [target]: { loading: true } }));
    try {
      const res = await fetch('/api/admin/beds24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch', target }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: unknown };
      if (data.success) {
        setSections((prev) => ({ ...prev, [target]: { loading: false, data: data.data } }));
      } else {
        setSections((prev) => ({
          ...prev,
          [target]: { loading: false, error: data.error || 'Unbekannter Fehler', data: data.data },
        }));
      }
    } catch {
      setSections((prev) => ({
        ...prev,
        [target]: { loading: false, error: 'Verbindungsfehler' },
      }));
    }
  }, []);

  const loadAll = useCallback(() => {
    SECTIONS.forEach((s) => loadSection(s.target));
  }, [loadSection]);

  // Verbindungsstatus prüfen, bei bestehender Verbindung direkt alles laden
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const data = await apiCall({ action: 'status' });
        if (cancelled) return;
        setConnected(!!data.connected);
        if (data.connected) loadAll();
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    if (!inviteCode.trim()) return;
    setConnecting(true);
    setSetupError('');
    try {
      const data = await apiCall({ action: 'setup', inviteCode: inviteCode.trim() });
      if (data.success) {
        setConnected(true);
        setInviteCode('');
        loadAll();
      } else {
        setSetupError(data.error || 'Setup fehlgeschlagen');
      }
    } catch {
      setSetupError('Verbindungsfehler');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Beds24-Verbindung wirklich trennen? Der gespeicherte Token wird gelöscht.')) {
      return;
    }
    await apiCall({ action: 'disconnect' });
    setConnected(false);
  };

  if (connected === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Prüfe Beds24-Verbindung...</span>
      </div>
    );
  }

  // ===== Setup-Ansicht (noch nicht verbunden) =====
  if (!connected) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Beds24 verbinden
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Erzeuge in Beds24 unter <strong>Settings → Apps &amp; Integrations → API</strong> einen{' '}
          <strong>Invite Code</strong> und füge ihn hier ein. Scopes: <em>read</em> und{' '}
          <em>write</em> für Bookings, Inventory und Properties — ohne <em>write</em> lassen sich
          Preise, Mindestaufenthalt und Verfügbarkeit nicht aus dem Admin Center setzen. Der Code
          ist nur kurz gültig und kann einmal verwendet werden — die dauerhafte Verbindung wird
          danach sicher in der Datenbank gespeichert.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Beds24 Invite Code einfügen..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
          />
          <button
            onClick={handleConnect}
            disabled={connecting || !inviteCode.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Verbinden
          </button>
        </div>
        {setupError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {setupError}
          </div>
        )}
      </div>
    );
  }

  // ===== Verbundene Ansicht =====
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <h2 className="text-lg font-bold text-gray-900">Beds24</h2>
          <span className="text-xs text-gray-400">verbunden</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Alles aktualisieren
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Unplug className="w-3.5 h-3.5" />
            Trennen
          </button>
        </div>
      </div>

      <Beds24Cockpit />

      {SECTIONS.map(({ target, title, icon: Icon }) => {
        const section = sections[target];
        const rows = target === 'rooms' ? extractRoomRows(section.data) : extractRows(section.data);
        return (
          <div key={target} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-gray-400" />
                {title}
                {rows.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">({rows.length})</span>
                )}
              </h3>
              <button
                onClick={() => loadSection(target)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Neu laden"
              >
                {section.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>

            {section.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700 mb-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {section.error}
              </div>
            )}

            {target === 'bookings' &&
              !section.loading &&
              section.data !== undefined &&
              rows.length === 0 && (
                <p className="text-sm text-gray-400">
                  Keine Buchungen gefunden — ggf. in Beds24 prüfen, ob die Kanäle (Booking.com,
                  Feratel, Vrbo für FeWo-direkt) verbunden sind und Bestandsbuchungen importiert
                  wurden.
                </p>
              )}

            {/* Strukturierte Kurzansicht für Buchungen */}
            {target === 'bookings' && rows.length > 0 && (
              <div className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {`${str(row, 'firstName')} ${str(row, 'lastName')}`.trim() ||
                          str(row, 'guestName') ||
                          `Buchung #${str(row, 'id')}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {str(row, 'arrival')} – {str(row, 'departure')}
                        {str(row, 'numAdult') && ` · ${str(row, 'numAdult')} Erw.`}
                        {str(row, 'referer') && ` · ${str(row, 'referer')}`}
                        {str(row, 'channel') && ` · ${str(row, 'channel')}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {str(row, 'price') && (
                        <p className="font-medium text-gray-800">{str(row, 'price')} €</p>
                      )}
                      <p className="text-xs text-gray-400">{str(row, 'status')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Strukturierte Kurzansicht für Properties/Zimmer */}
            {(target === 'properties' || target === 'rooms') && rows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rows.map((row, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700"
                  >
                    {str(row, 'name') || `#${str(row, 'id')}`}
                    <span className="text-gray-400"> · ID {str(row, 'id')}</span>
                  </span>
                ))}
              </div>
            )}

            {section.loading && !section.data && <p className="text-sm text-gray-400">Lade...</p>}
            {!section.loading && !section.data && !section.error && (
              <p className="text-sm text-gray-400">Noch nicht geladen</p>
            )}

            {section.data !== undefined && <RawData data={section.data} />}
          </div>
        );
      })}
    </div>
  );
}
