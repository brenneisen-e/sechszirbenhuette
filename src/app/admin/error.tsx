'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Admin Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Fehler im Admin-Bereich</h1>
          <p className="text-slate-500 mt-2">
            Ein unerwarteter Fehler ist aufgetreten.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 font-mono break-all">
            {error.message || 'Unbekannter Fehler'}
          </p>
          {error.digest && (
            <p className="text-xs text-red-500 mt-2">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 bg-logo-green text-white py-3 px-4 rounded-lg font-medium hover:bg-logo-green/90 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Erneut versuchen
          </button>
          <a
            href="/admin"
            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-200 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Seite neu laden
          </a>
          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-200 transition"
          >
            <Home className="w-5 h-5" />
            Zur Startseite
          </a>
        </div>
      </div>
    </div>
  );
}
