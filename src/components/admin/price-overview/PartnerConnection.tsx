'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, Link2, Loader2, PlugZap, Unlink } from 'lucide-react';

import { partnerApi, type PartnerStatus } from './api';

// Verbindung zum Admin Center der anderen Hütte: Kopplungscode erzeugen oder
// einfügen, Verbindung testen und trennen, Direktanmeldung beim Wechsel
// erlauben. Der Code enthält den gemeinsamen Schlüssel und wird nur einmal
// angezeigt.

interface Props {
  status: PartnerStatus | null;
  onChanged: () => void;
}

export default function PartnerConnection({ status, onChanged }: Props) {
  const [code, setCode] = useState('');
  const [codeExpires, setCodeExpires] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const run = async (key: string, payload: Record<string, unknown>) => {
    setBusy(key);
    setError('');
    setMessage('');
    const res = await partnerApi<{ code?: string; expiresAt?: number; name?: string }>(payload);
    setBusy('');
    if (!res.success) {
      setError(res.error || 'Fehler');
      return null;
    }
    return res;
  };

  const createCode = async () => {
    const res = await run('create', { action: 'createInvite' });
    if (res?.code) {
      setCode(res.code);
      setCodeExpires(res.expiresAt ?? null);
      setCopied(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError('Kopieren nicht möglich — bitte den Code markieren und kopieren');
    }
  };

  const accept = async () => {
    const res = await run('accept', { action: 'acceptInvite', code: input });
    if (res) {
      setInput('');
      setCode('');
      setMessage(`Verbunden mit ${res.name || 'dem anderen Admin Center'}`);
      onChanged();
    }
  };

  const test = async () => {
    const res = await run('test', { action: 'test' });
    if (res) setMessage(`${res.name || 'Partner'} antwortet — Verbindung in Ordnung`);
  };

  const unpair = async () => {
    if (!window.confirm('Verbindung zum anderen Admin Center trennen?')) return;
    const res = await run('unpair', { action: 'unpair' });
    if (res) {
      setMessage('Verbindung getrennt');
      onChanged();
    }
  };

  const toggleSso = async (allowed: boolean) => {
    const res = await run('sso', { action: 'setSso', allowed });
    if (res) onChanged();
  };

  if (!status) return null;
  const partner = status.partner;

  const feedback = (
    <>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {message && <p className="text-xs text-green-700 mt-2">{message}</p>}
    </>
  );

  if (partner) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link2 className="w-4 h-4 text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900">Verbunden mit {partner.name}</p>
            <p className="text-xs text-gray-500 truncate">{partner.url}</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={test}
              disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'test' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlugZap className="w-3.5 h-3.5" />
              )}
              Testen
            </button>
            <button
              onClick={unpair}
              disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <Unlink className="w-3.5 h-3.5" />
              Trennen
            </button>
          </div>
        </div>
        <label className="flex items-start gap-2 mt-3 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={status.ssoAllowed}
            disabled={!!busy}
            onChange={(e) => toggleSso(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Wechsel aus dem Admin Center der {partner.name} ohne erneute Anmeldung erlauben. Wer
            dort angemeldet ist, ist dann auch hier angemeldet — nur einschalten, wenn beide Admin
            Center dieselben Personen verwalten.
          </span>
        </label>
        {feedback}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4 text-gray-500" />
        <p className="font-medium text-gray-900">Mit dem anderen Admin Center verbinden</p>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Danach zeigt die Übersicht beide Hütten nebeneinander, und Preise lassen sich von hier aus
        für beide Hütten setzen. Einmal hier einen Code erzeugen und im anderen Admin Center unter
        Preisübersicht einfügen — oder umgekehrt.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Code hier erzeugen</p>
          {code ? (
            <>
              <textarea
                readOnly
                value={code}
                rows={3}
                onFocus={(e) => e.target.select()}
                className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-gray-50"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Kopiert' : 'Kopieren'}
                </button>
                {codeExpires && (
                  <span className="text-xs text-gray-500">
                    gültig bis{' '}
                    {new Date(codeExpires).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    Uhr, nur einmal
                  </span>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={createCode}
              disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy === 'create' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Kopplungscode erzeugen
            </button>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">
            Code aus dem anderen Admin Center einfügen
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="HUETTE1.…"
            className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2"
          />
          <button
            onClick={accept}
            disabled={!!busy || !input.trim()}
            className="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {busy === 'accept' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Verbinden
          </button>
        </div>
      </div>
      {feedback}
    </div>
  );
}
