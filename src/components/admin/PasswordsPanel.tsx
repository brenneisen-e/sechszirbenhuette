'use client';

import { useState } from 'react';
import { Key, Copy, CheckCircle, ExternalLink, Database, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '';

const BOOKING_SERVICES = [
  {
    name: 'Feratel',
    loginUrl: 'https://webclient4.deskline.net/KTN/de/login',
    user: 'NATBERGER',
    password: 'Falkertsee36',
    note: 'Deskline WebClient',
  },
  {
    name: 'FeWo-Direkt',
    loginUrl: 'https://www.fewo-direkt.de/',
    user: 'info@natberger-huette.de',
    password: '&tt#34BjMKj$zATA',
    note: 'VRBO/FeWo-Direkt',
  },
  {
    name: 'Booking.com',
    loginUrl: 'https://admin.booking.com/',
    user: 'info@natberger-huette.de',
    password: 'H((&-W3hjqe=HFq',
    note: 'Extranet',
  },
];

const IMAP_SETTINGS = [
  { label: 'Server', value: 'mail.your-server.de', key: 'imap-server' },
  { label: 'Port Eingang (IMAP)', value: '993', key: 'imap-port-in' },
  { label: 'Port Ausgang (SMTP)', value: '587', key: 'imap-port-out' },
  { label: 'Benutzername', value: 'info@natberger-huette.de', key: 'imap-user' },
  { label: 'Passwort', value: 'yWYboH9dH46cQG52', key: 'imap-pass' },
];

interface ImportResult {
  message: string;
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  results: { guest_name: string; action: string; success: boolean; error?: string }[];
}

export function PasswordsPanel() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportGuests = async () => {
    if (!confirm('Möchtest du die Gästedaten aus der PDF importieren/aktualisieren?\n\nDies wird:\n- Neue Gäste hinzufügen\n- Bestehende Gäste aktualisieren (nach Name + Anreisedatum)')) {
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const response = await fetch('/api/admin/import-guests', {
        method: 'POST',
        headers: {
          'x-admin-password': ADMIN_PASSWORD,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as ImportResult | { error: string };

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Import fehlgeschlagen');
      }

      setImportResult(data as ImportResult);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsImporting(false);
    }
  };

  const copyToClipboard = async (text: string, fieldKey: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyBoth = async (user: string, password: string, serviceName: string) => {
    await navigator.clipboard.writeText(user);
    setCopiedField(`${serviceName}-both`);
    setTimeout(async () => {
      await navigator.clipboard.writeText(password);
    }, 100);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
        <Key className="w-5 h-5 sm:w-6 sm:h-6" />
        Zugangsdaten
      </h2>

      {/* Booking Portals */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Buchungsportale</h3>
        <div className="space-y-3 sm:space-y-4">
          {BOOKING_SERVICES.map((service) => (
            <div key={service.name} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-base sm:text-lg font-medium text-gray-900">{service.name}</span>
                  {service.note && (
                    <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                      {service.note}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyBoth(service.user, service.password, service.name)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    title="Benutzername kopieren, dann Passwort"
                  >
                    {copiedField === `${service.name}-both` ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                        <span className="hidden sm:inline">Kopiert!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Kopieren</span>
                      </>
                    )}
                  </button>
                  <a
                    href={service.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => navigator.clipboard.writeText(service.user)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Benutzername</label>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                    <code className="flex-1 bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded border text-xs sm:text-sm font-mono truncate">{service.user}</code>
                    <button
                      onClick={() => copyToClipboard(service.user, `${service.name}-user`)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Kopieren"
                    >
                      {copiedField === `${service.name}-user` ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Passwort</label>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                    <code className="flex-1 bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded border text-xs sm:text-sm font-mono truncate">{service.password}</code>
                    <button
                      onClick={() => copyToClipboard(service.password, `${service.name}-pass`)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Kopieren"
                    >
                      {copiedField === `${service.name}-pass` ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IMAP Settings */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">E-Mail IMAP Einstellungen</h3>
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {IMAP_SETTINGS.map((field) => (
              <div key={field.key}>
                <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{field.label}</label>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                  <code className="flex-1 bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded border text-xs sm:text-sm font-mono truncate">{field.value}</code>
                  <button
                    onClick={() => copyToClipboard(field.value, field.key)}
                    className="p-1.5 sm:p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Kopieren"
                  >
                    {copiedField === field.key ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Migration */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          Datenmigration
        </h3>
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
          <div className="mb-3 sm:mb-4">
            <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-1.5 sm:mb-2">Gästedaten aus PDF importieren</h4>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Importiert alle Gästedaten aus der Excel/PDF (2024-2026). Booking.com-Buchungen sind nicht enthalten.
              Bestehende Gäste werden aktualisiert (Mietpreis, Nebenkosten, Endreinigung).
            </p>
            <button
              onClick={handleImportGuests}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Gästedaten importieren
                </>
              )}
            </button>
          </div>

          {/* Import Error */}
          {importError && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium">Fehler beim Import</span>
              </div>
              <p className="text-xs sm:text-sm text-red-600 mt-1">{importError}</p>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium">Import abgeschlossen</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3">
                <div className="text-center p-1.5 sm:p-2 bg-white rounded border">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{importResult.inserted}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Neu</div>
                </div>
                <div className="text-center p-1.5 sm:p-2 bg-white rounded border">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{importResult.updated}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Aktualisiert</div>
                </div>
                <div className="text-center p-1.5 sm:p-2 bg-white rounded border">
                  <div className="text-lg sm:text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Fehler</div>
                </div>
              </div>
              {importResult.failed > 0 && (
                <div className="mt-2 text-xs sm:text-sm">
                  <p className="font-medium text-red-700 mb-1">Fehlgeschlagene Einträge:</p>
                  <ul className="list-disc list-inside text-red-600">
                    {importResult.results
                      .filter((r) => !r.success)
                      .map((r, i) => (
                        <li key={i}>
                          {r.guest_name}: {r.error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
