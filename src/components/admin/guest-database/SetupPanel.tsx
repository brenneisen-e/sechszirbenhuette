'use client';

import { useState, useCallback } from 'react';
import {
  Settings,
  ChevronUp,
  ChevronDown,
  Database,
  CheckCircle2,
  Loader2,
  Upload,
  FileText,
} from 'lucide-react';
import type { SetupStatus } from './types';

interface SetupPanelProps {
  adminPassword: string;
  setupStatus: SetupStatus | null;
  onSetupStatusChange: (status: SetupStatus) => void;
  onGuestsReload: () => void;
  onUnassignedCountChange: (count: number) => void;
}

interface ImportResult {
  message: string;
  total: number;
  created: number;
  updated: number;
  notFound: number;
  errors: number;
  results: Array<{
    guest_name: string;
    booking_number: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

export function SetupPanel({
  adminPassword,
  setupStatus,
  onSetupStatusChange,
  onGuestsReload,
}: SetupPanelProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check setup status
  const checkSetupStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ action: 'check_setup_status' }),
      });
      const data = (await response.json()) as { success: boolean; status: SetupStatus };
      if (data.success && data.status) {
        onSetupStatusChange(data.status);
      }
    } catch (err) {
      console.error('Error checking setup status:', err);
    }
  }, [adminPassword, onSetupStatusChange]);

  // Import FeWo bookings
  const importFewoBookings = async () => {
    setIsImporting(true);
    setImportResult(null);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/import-fewo-bookings', {
        method: 'POST',
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setError(data.error || `Fehler: ${response.status}`);
        return;
      }

      const data = await response.json() as ImportResult;
      setImportResult(data);

      if (data.updated > 0 || data.created > 0) {
        setSuccess(`✅ ${data.updated} aktualisiert, ${data.created} erstellt`);
        await checkSetupStatus();
        onGuestsReload();
      } else if (data.notFound > 0) {
        setError(`⚠️ ${data.notFound} Gäste nicht gefunden - bitte zuerst Gäste anlegen`);
      }
    } catch (err) {
      setError('Fehler beim Import');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  // Preview FeWo bookings (GET request)
  const [previewData, setPreviewData] = useState<{ totalBookings: number; bookings: Array<{ guest_name: string; booking_number: string; arrival_date: string }> } | null>(null);

  const loadPreview = async () => {
    try {
      const response = await fetch('/api/admin/import-fewo-bookings');
      const data = await response.json() as { totalBookings: number; bookings: Array<{ guest_name: string; booking_number: string; arrival_date: string }> };
      setPreviewData(data);
    } catch (err) {
      console.error('Error loading preview:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => {
          setShowSetup(!showSetup);
          if (!showSetup && !previewData) {
            loadPreview();
          }
        }}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">FeWo-Buchungen importieren</span>
          {previewData && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {previewData.totalBookings} Buchungen
            </span>
          )}
        </div>
        {showSetup ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {showSetup && (
        <div className="px-4 pb-4 border-t">
          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Status Overview */}
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg ${setupStatus?.guestsTableExists ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Gäste in Datenbank</span>
              </div>
              <p className="text-xs text-gray-600">
                {setupStatus?.guestsCount || 0} Gäste vorhanden
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">FeWo-Buchungen</span>
              </div>
              <p className="text-xs text-gray-600">
                {previewData?.totalBookings || '...'} Buchungen mit Nebenkosten & Kommunikation
              </p>
            </div>
          </div>

          {/* Import Button */}
          <div className="mt-4 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-gray-900">FeWo-Buchungen in Datenbank importieren</p>
              <p className="text-sm text-gray-600 mt-1">
                Aktualisiert Finanzdaten, Nebenkosten und Kommunikation für alle {previewData?.totalBookings || 19} Buchungen
              </p>
            </div>
            <button
              onClick={importFewoBookings}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importiert...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Jetzt importieren
                </>
              )}
            </button>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Import-Ergebnis:</p>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-lg font-bold text-green-600">{importResult.updated}</p>
                  <p className="text-xs text-gray-500">Aktualisiert</p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-lg font-bold text-blue-600">{importResult.created}</p>
                  <p className="text-xs text-gray-500">Erstellt</p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-lg font-bold text-amber-600">{importResult.notFound}</p>
                  <p className="text-xs text-gray-500">Nicht gefunden</p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-lg font-bold text-red-600">{importResult.errors}</p>
                  <p className="text-xs text-gray-500">Fehler</p>
                </div>
              </div>

              {/* Details */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {importResult.results.map((r, i) => (
                  <div key={i} className={`text-xs p-2 rounded flex items-center gap-2 ${
                    r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {r.success ? (
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <span className="w-3 h-3 flex-shrink-0">❌</span>
                    )}
                    <span className="font-medium">{r.guest_name}</span>
                    <span className="text-gray-500">({r.booking_number})</span>
                    <span className="ml-auto">
                      {r.action === 'booking_updated' && '✓ aktualisiert'}
                      {r.action === 'booking_created' && '+ Buchung erstellt'}
                      {r.action === 'guest_and_booking_created' && '✨ Gast + Buchung erstellt'}
                      {r.action === 'repeat_guest_booking_created' && '🔄 Stammgast + neue Buchung'}
                      {r.action === 'guest_not_found' && 'Gast nicht gefunden'}
                      {r.action === 'error' && r.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview of bookings */}
          {previewData && !importResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Buchungen zum Import:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {previewData.bookings.slice(0, 10).map((b, i) => (
                  <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="font-medium">{b.guest_name}</span>
                    <span className="text-gray-400">•</span>
                    <span>{b.booking_number}</span>
                    <span className="text-gray-400">•</span>
                    <span>{b.arrival_date}</span>
                  </div>
                ))}
                {previewData.bookings.length > 10 && (
                  <p className="text-xs text-gray-400">... und {previewData.bookings.length - 10} weitere</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
