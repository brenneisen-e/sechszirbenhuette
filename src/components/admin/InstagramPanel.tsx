'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Instagram,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
} from 'lucide-react';

// Tab „Instagram“: Kanal @sechszirbenhuette mit der Website verbinden.
// Server: src/lib/server/instagram.ts, API /api/admin/instagram, Rücksprung
// /api/instagram/callback. Geheimnis und Zugangsschlüssel bleiben auf dem
// Server; hier steht nur, ob sie hinterlegt sind.

interface Status {
  appId: string;
  hasSecret: boolean;
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  enabled: boolean;
  lastError: string | null;
  feed: { fetchedAt: string; posts: number } | null;
}

interface ApiResult {
  success?: boolean;
  error?: string;
  message?: string;
  status?: Status;
  url?: string;
  redirectUri?: string;
}

const card = 'border border-gray-200 rounded-lg p-4 bg-white';
const input =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400';
const primary =
  'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50';
const secondary =
  'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50';

function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

async function call(body?: Record<string, unknown>): Promise<ApiResult> {
  const res = await fetch('/api/admin/instagram', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as ApiResult;
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  return data;
}

export default function InstagramPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [redirectUri, setRedirectUri] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await call();
      if (data.status) {
        setStatus(data.status);
        setAppId(data.status.appId);
        setShowSetup(!data.status.connected);
      }
      setRedirectUri(data.redirectUri ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
    }
  }, []);

  // Ergebnis des Rücksprungs von Instagram anzeigen und aus der Adresse nehmen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('instagram');
    const text = params.get('message') ?? '';
    if (result === 'ok') setMessage(text);
    if (result === 'error') setError(text);
    if (result) {
      params.delete('instagram');
      params.delete('message');
      window.history.replaceState(window.history.state, '', `/admin?${params.toString()}`);
    }
    load();
  }, [load]);

  const run = async (name: string, body: Record<string, unknown>) => {
    setBusy(name);
    setError('');
    setMessage('');
    try {
      const data = await call(body);
      if (data.status) setStatus(data.status);
      if (data.message) setMessage(data.message);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
      return null;
    } finally {
      setBusy('');
    }
  };

  const saveApp = async () => {
    const data = await run('saveApp', { action: 'saveApp', appId, appSecret });
    if (data) {
      setAppSecret('');
      setMessage('App-Daten gespeichert');
    }
  };

  const connect = async () => {
    if (appSecret || appId !== status?.appId) {
      const saved = await run('saveApp', { action: 'saveApp', appId, appSecret });
      if (!saved) return;
      setAppSecret('');
    }
    const data = await run('authorize', { action: 'authorize' });
    if (data?.url) window.location.href = data.url;
  };

  const saveToken = async () => {
    const data = await run('saveToken', { action: 'saveToken', token });
    if (data) {
      setToken('');
      setShowSetup(false);
    }
  };

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage nicht erlaubt — Adresse steht zum Markieren da
    }
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Instagram wird geladen …
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  const expiresSoon =
    status.expiresAt && Date.parse(status.expiresAt) - Date.now() < 10 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start gap-3">
        <Instagram className="w-6 h-6 text-gray-700 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Instagram auf der Website</h2>
          <p className="text-sm text-gray-500">
            Die neuesten Beiträge von @sechszirbenhuette erscheinen auf der Startseite. Der Feed
            wird stündlich aktualisiert, der Zugang alle sieben Tage automatisch verlängert.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {status.connected ? (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Verbunden mit @{status.username ?? '?'}
              </p>
              <p className={`text-xs ${expiresSoon ? 'text-amber-700' : 'text-gray-500'}`}>
                Zugang gültig bis {formatDate(status.expiresAt)}
                {status.feed
                  ? ` · ${status.feed.posts} Beiträge, Stand ${formatDate(status.feed.fetchedAt, true)}`
                  : ' · Feed noch nicht geladen'}
              </p>
            </div>
            <a
              href={`https://www.instagram.com/${status.username ?? 'sechszirbenhuette'}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              Kanal öffnen <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {status.lastError && (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              Letzter Fehler: {status.lastError}
            </p>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={status.enabled}
              disabled={busy !== ''}
              onChange={(e) => run('enabled', { action: 'setEnabled', enabled: e.target.checked })}
            />
            Beiträge auf der Website zeigen (sonst nur der Link zum Kanal)
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => run('refresh', { action: 'refresh' })}
              disabled={busy !== ''}
              className={primary}
            >
              {busy === 'refresh' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Jetzt aktualisieren
            </button>
            <button onClick={() => setShowSetup((v) => !v)} className={secondary}>
              <KeyRound className="w-4 h-4" />
              {showSetup ? 'Einrichtung ausblenden' : 'Neu verbinden'}
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Verbindung zu Instagram trennen? Die Website zeigt dann nur den Link.',
                  )
                ) {
                  run('disconnect', { action: 'disconnect' });
                }
              }}
              disabled={busy !== ''}
              className={secondary}
            >
              <Unlink className="w-4 h-4" />
              Trennen
            </button>
          </div>
        </div>
      ) : (
        <div className={card}>
          <p className="text-sm text-gray-700">
            Noch nicht verbunden — die Website zeigt bis dahin nur den Link zum Kanal.
          </p>
        </div>
      )}

      {showSetup && (
        <>
          <div className={card}>
            <p className="text-sm font-semibold text-gray-900 mb-2">Einrichtung (einmalig)</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
              <li>
                Instagram-Konto als <strong>professionelles Konto</strong> führen (Creator oder
                Unternehmen): in der Instagram-App unter Einstellungen → Kontotyp und Tools.
              </li>
              <li>
                Auf{' '}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  developers.facebook.com/apps
                </a>{' '}
                mit dem eigenen Facebook-Konto anmelden und <strong>App erstellen</strong>. Als
                Anwendungsfall „Nachrichten und Inhalte auf Instagram verwalten“ (Manage messaging
                &amp; content on Instagram) wählen; ein Unternehmensportfolio ist nicht nötig.
              </li>
              <li>
                In der App: Anwendungsfälle → Instagram →{' '}
                <strong>API-Einrichtung mit Instagram-Login</strong>. Dort stehen die{' '}
                <strong>Instagram-App-ID</strong> und das <strong>Instagram-App-Geheimnis</strong>{' '}
                (nicht die Facebook-App-ID oben in der Leiste) — beide unten eintragen.
              </li>
              <li>
                Im selben Bereich unter „Business-Login für Instagram einrichten“ →
                Business-Login-Einstellungen bei <strong>OAuth-Weiterleitungs-URIs</strong> genau
                diese Adresse eintragen und speichern:
                <span className="mt-1 flex items-center gap-2">
                  <code className="px-2 py-1 bg-gray-100 rounded text-xs break-all">
                    {redirectUri}
                  </code>
                  <button onClick={copyRedirect} className={secondary} title="Kopieren">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </span>
              </li>
              <li>
                Unter „Zugriffsschlüssel generieren“ → <strong>Konto hinzufügen</strong> das Konto
                @sechszirbenhuette hinzufügen. Solange die App im Entwicklungsmodus ist, dürfen sich
                nur so hinzugefügte Konten verbinden; eine App-Prüfung durch Meta ist für das eigene
                Konto nicht nötig.
              </li>
              <li>
                Unten speichern und <strong>Mit Instagram verbinden</strong> — bei Instagram
                anmelden, erlauben, fertig.
              </li>
            </ol>
          </div>

          <div className={card}>
            <p className="text-sm font-semibold text-gray-900 mb-3">Meta-App</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-gray-600">
                Instagram-App-ID
                <input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value.replace(/\s/g, ''))}
                  inputMode="numeric"
                  placeholder="z. B. 1234567890123456"
                  className={`${input} mt-1`}
                />
              </label>
              <label className="text-xs text-gray-600">
                Instagram-App-Geheimnis
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value.trim())}
                  autoComplete="off"
                  placeholder={status.hasSecret ? 'hinterlegt — nur zum Ändern ausfüllen' : ''}
                  className={`${input} mt-1`}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={connect}
                disabled={busy !== '' || !appId || (!status.hasSecret && !appSecret)}
                className={primary}
              >
                {busy === 'authorize' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Mit Instagram verbinden
              </button>
              <button onClick={saveApp} disabled={busy !== '' || !appId} className={secondary}>
                Nur speichern
              </button>
            </div>
          </div>

          <div className={card}>
            <p className="text-sm font-semibold text-gray-900">
              Alternative: Zugriffsschlüssel einfügen
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Im Meta-Dashboard unter „Zugriffsschlüssel generieren“ beim hinzugefügten Konto auf
              „Token generieren“ klicken, den Schlüssel kopieren und hier einfügen. Er gilt 60 Tage
              und wird danach automatisch verlängert.
            </p>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
              placeholder="IGAA…"
              className={`${input} mt-2 font-mono text-xs`}
            />
            <button
              onClick={saveToken}
              disabled={busy !== '' || token.trim().length < 40}
              className={`${primary} mt-2`}
            >
              {busy === 'saveToken' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Schlüssel prüfen und verbinden
            </button>
          </div>
        </>
      )}
    </div>
  );
}
