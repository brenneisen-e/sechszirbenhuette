'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, AlertCircle, Loader2, Database, ChevronDown, ChevronRight, Play, Users, ArrowRight } from 'lucide-react';

interface MigrationRecord {
  id: string;
  version: number;
  name: string;
  description: string | null;
  status: string;
  executed_at: string | null;
}

interface LegacyGuestPreview {
  id: number;
  guest_name: string;
  arrival_date: string | null;
  departure_date: string | null;
  platform: string | null;
  rental_price: number;
  status: string;
}

interface LegacyMigrationDetail {
  guest_id: number;
  guest_name: string;
  status: 'migrated' | 'failed';
  error?: string;
}

interface MigrationPanelProps {
}

export default function MigrationPanel({}: MigrationPanelProps) {
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ id: string; status: string; error?: string }>>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // Legacy migration state
  const [legacyCount, setLegacyCount] = useState<number | null>(null);
  const [legacyGuests, setLegacyGuests] = useState<LegacyGuestPreview[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyMigrating, setLegacyMigrating] = useState(false);
  const [legacyResults, setLegacyResults] = useState<LegacyMigrationDetail[]>([]);
  const [showLegacyPreview, setShowLegacyPreview] = useState(false);

  const fetchMigrations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/migrations');
      const data = await res.json() as { migrations?: MigrationRecord[]; currentVersion?: number; pendingCount?: number };
      setMigrations(data.migrations || []);
      setCurrentVersion(data.currentVersion || 0);
      setPendingCount(data.pendingCount || 0);
    } catch (err) {
      console.error('Failed to fetch migrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLegacyPreview = useCallback(async () => {
    setLegacyLoading(true);
    try {
      const res = await fetch('/api/admin/migrate-legacy-guests');
      const data = await res.json() as { count?: number; guests?: LegacyGuestPreview[]; error?: string };
      if (data.error) {
        console.error('Legacy preview error:', data.error);
        return;
      }
      setLegacyCount(data.count ?? 0);
      setLegacyGuests(data.guests || []);
    } catch (err) {
      console.error('Failed to fetch legacy guests:', err);
    } finally {
      setLegacyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMigrations();
    fetchLegacyPreview();
  }, [fetchMigrations, fetchLegacyPreview]);

  const runMigrations = async (migrationId?: string) => {
    setRunning(true);
    setRunningId(migrationId || 'all');
    setResults([]);

    try {
      const res = await fetch('/api/admin/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(migrationId ? { migrationId } : {}),
      });
      const data = await res.json() as { results?: Array<{ id: string; status: string; error?: string }> };
      setResults(data.results || []);
      await fetchMigrations();
    } catch (err) {
      console.error('Failed to run migrations:', err);
      setResults([{ id: migrationId || 'all', status: 'failed', error: 'Netzwerkfehler' }]);
    } finally {
      setRunning(false);
      setRunningId(null);
    }
  };

  const runLegacyMigration = async () => {
    setLegacyMigrating(true);
    setLegacyResults([]);

    try {
      const res = await fetch('/api/admin/migrate-legacy-guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json() as { success?: boolean; migrated?: number; details?: LegacyMigrationDetail[]; error?: string };
      if (data.error) {
        setLegacyResults([{ guest_id: 0, guest_name: 'Fehler', status: 'failed', error: data.error }]);
      } else {
        setLegacyResults(data.details || []);
        // Refresh the preview to show updated count
        await fetchLegacyPreview();
      }
    } catch (err) {
      console.error('Failed to run legacy migration:', err);
      setLegacyResults([{ guest_id: 0, guest_name: 'Fehler', status: 'failed', error: 'Netzwerkfehler' }]);
    } finally {
      setLegacyMigrating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  const pending = migrations.filter(m => m.status === 'pending');
  const completed = migrations.filter(m => m.status === 'completed');
  const failed = migrations.filter(m => m.status === 'failed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Lade Migrationsstatus...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">System & Migration</h2>
        <p className="text-sm text-gray-500 mt-1">Datenbank-Migrationen und Systemupdates</p>
      </div>

      {/* Legacy Data Migration */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide flex items-center gap-2">
          <Users className="w-4 h-4" />
          Legacy-Daten Migration
        </h3>
        <p className="text-xs text-gray-500">
          Gäste ohne Buchungseinträge: Buchungsdaten aus der Gast-Tabelle in die Buchungs-Tabelle übertragen und Legacy-Felder bereinigen.
        </p>

        {legacyLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Lade Legacy-Daten...
          </div>
        ) : legacyCount === 0 ? (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Keine Legacy-Daten vorhanden. Alle Gäste haben Buchungseinträge.</p>
            </div>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-800 font-medium">
                {legacyCount} {legacyCount === 1 ? 'Gast' : 'Gäste'} ohne Buchungseinträge gefunden
              </p>
              <button
                onClick={() => setShowLegacyPreview(!showLegacyPreview)}
                className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                {showLegacyPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
              </button>
            </div>

            {showLegacyPreview && legacyGuests.length > 0 && (
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-amber-100/50">
                      <th className="text-left p-2 font-medium text-amber-800">ID</th>
                      <th className="text-left p-2 font-medium text-amber-800">Name</th>
                      <th className="text-left p-2 font-medium text-amber-800">Anreise</th>
                      <th className="text-left p-2 font-medium text-amber-800">Abreise</th>
                      <th className="text-left p-2 font-medium text-amber-800">Plattform</th>
                      <th className="text-right p-2 font-medium text-amber-800">Mietpreis</th>
                      <th className="text-left p-2 font-medium text-amber-800">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {legacyGuests.map((g) => (
                      <tr key={g.id}>
                        <td className="p-2 text-gray-600 font-mono">{g.id}</td>
                        <td className="p-2 text-gray-900">{g.guest_name}</td>
                        <td className="p-2 text-gray-600">{formatDate(g.arrival_date)}</td>
                        <td className="p-2 text-gray-600">{formatDate(g.departure_date)}</td>
                        <td className="p-2 text-gray-600">{g.platform || '-'}</td>
                        <td className="p-2 text-gray-600 text-right font-mono">{g.rental_price > 0 ? `${g.rental_price.toFixed(2)} €` : '-'}</td>
                        <td className="p-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            g.status === 'active' ? 'bg-green-100 text-green-700' :
                            g.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            g.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={runLegacyMigration}
              disabled={legacyMigrating}
              className="flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {legacyMigrating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {legacyMigrating ? 'Migration läuft...' : `${legacyCount} ${legacyCount === 1 ? 'Gast' : 'Gäste'} migrieren`}
            </button>
          </div>
        )}

        {/* Legacy Migration Results */}
        {legacyResults.length > 0 && (
          <div className={`border rounded-lg p-4 ${
            legacyResults.some(r => r.status === 'failed')
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          }`}>
            <p className={`text-sm font-medium mb-2 ${legacyResults.some(r => r.status === 'failed') ? 'text-red-800' : 'text-green-800'}`}>
              {legacyResults.filter(r => r.status === 'migrated').length} von {legacyResults.length} Gästen erfolgreich migriert
            </p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {legacyResults.map((r) => (
                <div key={r.guest_id} className="flex items-center gap-2 text-xs">
                  {r.status === 'migrated' ? (
                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  )}
                  <span className={r.status === 'failed' ? 'text-red-800' : 'text-green-800'}>
                    {r.guest_name}{r.error ? `: ${r.error}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Datenbankversion</p>
              <p className="text-2xl font-semibold font-mono text-gray-900 tabular-nums">v{currentVersion}</p>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-5">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ausstehend</p>
            <p className={`text-2xl font-semibold font-mono tabular-nums ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {pendingCount} {pendingCount === 1 ? 'Migration' : 'Migrationen'}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-5">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Abgeschlossen</p>
            <p className="text-2xl font-semibold font-mono text-gray-900 tabular-nums">
              {completed.length}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className={`border rounded-lg p-4 ${
          results.some(r => r.status === 'failed')
            ? 'border-red-200 bg-red-50'
            : 'border-green-200 bg-green-50'
        }`}>
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                {r.status === 'completed' || r.status === 'already_completed' ? (
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className={r.status === 'failed' ? 'text-red-800' : 'text-green-800'}>
                  {r.id}: {r.status === 'completed' ? 'Erfolgreich' : r.status === 'already_completed' ? 'Bereits ausgeführt' : `Fehler: ${r.error}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Migrations */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">Ausstehende Migrationen</h3>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {pending.map((m) => (
              <div key={m.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-300 bg-amber-50 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {String(m.version).padStart(3, '0')}: {m.name}
                    </p>
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => runMigrations(m.id)}
                  disabled={running}
                  className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {running && runningId === m.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Ausführen
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => runMigrations()}
            disabled={running}
            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {running && runningId === 'all' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Alle Migrationen ausführen
          </button>
        </div>
      )}

      {pending.length === 0 && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">Alle Migrationen sind ausgeführt. System ist aktuell.</p>
          </div>
        </div>
      )}

      {/* Failed Migrations */}
      {failed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-900 uppercase tracking-wide">Fehlgeschlagen</h3>
          <div className="border border-red-200 rounded-lg divide-y divide-red-100">
            {failed.map((m) => (
              <div key={m.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{String(m.version).padStart(3, '0')}: {m.name}</p>
                    {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => runMigrations(m.id)}
                  disabled={running}
                  className="text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Erneut versuchen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Migrations */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Abgeschlossen ({completed.length})
          </button>
          {showCompleted && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-50">
              {completed.map((m) => (
                <div key={m.id} className="p-3 flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      {String(m.version).padStart(3, '0')}: {m.name}
                    </p>
                  </div>
                  {m.executed_at && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(m.executed_at).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
