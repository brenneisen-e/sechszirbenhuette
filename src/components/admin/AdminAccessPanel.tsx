'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LogOut } from 'lucide-react';

// Admin-Passwort ändern und alle anderen Sitzungen beenden (Tab System).

export default function AdminAccessPanel() {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState<'' | 'password' | 'sessions'>('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as { success?: boolean; error?: string };
  };

  const savePassword = async () => {
    if (password !== repeat) {
      setMessage({ ok: false, text: 'Die beiden Eingaben stimmen nicht überein.' });
      return;
    }
    setBusy('password');
    setMessage(null);
    try {
      const data = await call({ action: 'set_password', password });
      if (data.success) {
        setPassword('');
        setRepeat('');
        setMessage({ ok: true, text: 'Neues Admin-Passwort gespeichert — gilt ab sofort.' });
      } else {
        setMessage({ ok: false, text: data.error || 'Speichern fehlgeschlagen' });
      }
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler' });
    } finally {
      setBusy('');
    }
  };

  const logoutEverywhere = async () => {
    if (!confirm('Alle anderen Geräte abmelden? Du selbst bleibst angemeldet.')) return;
    setBusy('sessions');
    setMessage(null);
    try {
      const data = await call({ action: 'logout_everywhere' });
      setMessage(
        data.success
          ? { ok: true, text: 'Alle anderen Sitzungen wurden beendet.' }
          : { ok: false, text: data.error || 'Fehlgeschlagen' },
      );
    } catch {
      setMessage({ ok: false, text: 'Verbindungsfehler' });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-gray-400" />
        Admin-Zugang
      </h2>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Admin-Passwort ändern (mindestens 10 Zeichen). Das Notfall-Passwort aus dem
          Cloudflare-Secret <code className="font-mono text-xs">ADMIN_PASSWORD</code> gilt
          weiterhin, solange es gesetzt ist.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Neues Passwort"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="Wiederholen"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
          <button
            onClick={savePassword}
            disabled={busy !== '' || password.length < 10 || !repeat}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {busy === 'password' && <Loader2 className="w-4 h-4 animate-spin" />}
            Speichern
          </button>
        </div>
      </div>

      <button
        onClick={logoutEverywhere}
        disabled={busy !== ''}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
      >
        {busy === 'sessions' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        Alle anderen Geräte abmelden
      </button>

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
