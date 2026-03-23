'use client';

import { useState, useEffect } from 'react';
import { CloudUpload, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface MigrationStatus {
  needsMigration: number;
  alreadyMigrated: number;
  totalImages: number;
  hasCredentials: boolean;
}

interface MigrationResult {
  id: string;
  title: string;
  status: 'migrated' | 'failed';
  error?: string;
}

interface MigrationResponse {
  success: boolean;
  message: string;
  migrated: number;
  failed: number;
  results: MigrationResult[];
}

export default function ImageMigrationPanel({ adminPassword }: { adminPassword: string }) {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/migrate-images');
      const data = await res.json() as MigrationStatus & { success?: boolean; error?: string };
      if (data.success) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch {
      setError('Failed to connect to migration API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const runMigration = async () => {
    setMigrating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/migrate-images', { method: 'POST' });
      const data = await res.json() as MigrationResponse & { error?: string };
      if (data.success) {
        setResult(data);
        fetchStatus();
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch {
      setError('Migration request failed');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Lade Migrationsstatus...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <CloudUpload className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Bilder → Cloudflare Images</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Migriert alle Bilder von R2 Storage zu Cloudflare Images f&uuml;r automatische Optimierung und CDN-Auslieferung.
      </p>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{status.needsMigration}</div>
            <div className="text-xs text-yellow-600">Noch in R2</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{status.alreadyMigrated}</div>
            <div className="text-xs text-green-600">Auf CF Images</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{status.totalImages}</div>
            <div className="text-xs text-gray-600">Gesamt</div>
          </div>
        </div>
      )}

      {/* Credentials Warning */}
      {status && !status.hasCredentials && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Cloudflare API Token nicht konfiguriert. Bitte zuerst oben unter &quot;Cloudflare Settings&quot; den API Token setzen.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">{result.message}</span>
          </div>
          {result.results.length > 0 && (
            <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
              {result.results.map((r) => (
                <div key={r.id} className="text-xs flex items-center gap-1.5">
                  {r.status === 'migrated' ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span className={r.status === 'migrated' ? 'text-green-700' : 'text-red-700'}>
                    {r.title}
                    {r.error && <span className="text-red-500 ml-1">({r.error})</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={runMigration}
          disabled={migrating || !status?.hasCredentials || status?.needsMigration === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {migrating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Migriere...
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4" />
              Migration starten
            </>
          )}
        </button>
        <button
          onClick={fetchStatus}
          disabled={loading || migrating}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
