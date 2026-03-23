'use client';

import { useState, useEffect } from 'react';
import { Cloud, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface CloudflareSettingsProps {
}

export default function CloudflareSettings({}: CloudflareSettingsProps) {
  const [apiToken, setApiToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Load existing token
  useEffect(() => {
    fetch('/api/admin/settings?key=cloudflare_api_token')
      .then(res => res.json() as Promise<{ value?: string }>)
      .then((data) => {
        if (data.value) {
          setSavedToken(data.value);
          setApiToken(data.value);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cloudflare_api_token', value: apiToken }),
      });
      if (res.ok) {
        setSavedToken(apiToken);
        setStatus({ ok: true, message: 'Token gespeichert' });
      } else {
        const errData = await res.json() as { error?: string };
        setStatus({ ok: false, message: errData.error || `Fehler ${res.status}` });
      }
    } catch {
      setStatus({ ok: false, message: 'Verbindungsfehler' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      // Test by fetching CF Images usage
      const res = await fetch('/api/admin/settings?action=test-cloudflare');
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        setStatus({ ok: true, message: data.message || 'Verbindung erfolgreich!' });
      } else {
        setStatus({ ok: false, message: data.error || 'Verbindung fehlgeschlagen' });
      }
    } catch {
      setStatus({ ok: false, message: 'Verbindungsfehler' });
    } finally {
      setTesting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const maskedToken = savedToken ? `${savedToken.slice(0, 8)}...${savedToken.slice(-4)}` : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
          <Cloud className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Cloudflare Stream & Images</h3>
          <p className="text-sm text-gray-500">API Token für Video- und Bildverwaltung</p>
        </div>
        {savedToken && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <Check className="w-3 h-3" /> Konfiguriert
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Token
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder={maskedToken || 'Cloudflare API Token eingeben'}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Erstellt unter Cloudflare Dashboard → My Profile → API Tokens
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !apiToken || apiToken === savedToken}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Speichern
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !savedToken}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Verbindung testen
          </button>
        </div>

        {status && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {status.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
