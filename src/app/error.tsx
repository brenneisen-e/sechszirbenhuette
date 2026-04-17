'use client';

import { useEffect, useState } from 'react';

const CHUNK_RELOAD_KEY = 'chunk-load-error-reloaded-root';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(error.message) ||
    /Loading CSS chunk [\w-]+ failed/i.test(error.message)
  );
}

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (isChunkLoadError(error)) {
      const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        setReloading(true);
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
    console.error('Site Error:', error);
  }, [error]);

  if (reloading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-gray-600">
        <span>Neue Version wird geladen…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Es ist ein Fehler aufgetreten</h1>
        <p className="text-sm text-gray-500 mb-6 break-words">
          {error.message || 'Unbekannter Fehler'}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    </div>
  );
}
