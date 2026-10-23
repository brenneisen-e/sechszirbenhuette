'use client';

import { Eye, EyeOff } from 'lucide-react';

interface DemoModeToggleProps {
  isDemoMode: boolean;
  onToggle: () => void;
  /** Nur das Symbol (Handy-Kopf) — der Hinweisbalken zeigt den aktiven Modus */
  compact?: boolean;
}

export default function DemoModeToggle({
  isDemoMode,
  onToggle,
  compact = false,
}: DemoModeToggleProps) {
  if (compact) {
    return (
      <button
        onClick={onToggle}
        className={`p-1 rounded-md transition-colors ${
          isDemoMode ? 'bg-amber-100 text-amber-800' : 'text-gray-400 hover:text-gray-600'
        }`}
        title={isDemoMode ? 'Demo-Modus deaktivieren' : 'Demo-Modus aktivieren'}
        aria-pressed={isDemoMode}
      >
        {isDemoMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        isDemoMode
          ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 shadow-sm'
          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
      }`}
      title={isDemoMode ? 'Demo-Modus deaktivieren' : 'Demo-Modus aktivieren'}
    >
      {isDemoMode ? (
        <>
          <EyeOff className="w-4 h-4" />
          <span className="hidden sm:inline">Demo-Modus AN</span>
          <span className="sm:hidden">Demo</span>
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Demo-Modus</span>
          <span className="sm:hidden">Demo</span>
        </>
      )}
    </button>
  );
}
