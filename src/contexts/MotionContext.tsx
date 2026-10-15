'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Zentrale Bewegungspräferenz der Website (Briefing „Reduzierte Bewegung ist
// ein eigener Zustand“): Systemeinstellung prefers-reduced-motion plus der
// lokale Schalter „Bewegung reduzieren“. Die Systemeinstellung hat Vorrang und
// lässt sich mit dem Schalter nicht aufheben.
//
// Der Zustand steht zusätzlich als html[data-motion="reduce|full"] bereit —
// brand.css setzt damit die Endzustände der Effekte.

export const MOTION_STORAGE_KEY = 'szh-motion';

interface MotionState {
  /** Effekte und automatischer Videostart aus */
  reduced: boolean;
  /** Durch die Systemeinstellung reduziert */
  systemReduced: boolean;
  /** Lokal per Schalter reduziert */
  localReduced: boolean;
  setLocalReduced: (value: boolean) => void;
}

const MotionContext = createContext<MotionState>({
  reduced: false,
  systemReduced: false,
  localReduced: false,
  setLocalReduced: () => {},
});

function readLocal(): boolean {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'reduce';
  } catch {
    return false;
  }
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [systemReduced, setSystemReduced] = useState(false);
  const [localReduced, setLocalState] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(query.matches);
    setLocalState(readLocal());
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const reduced = systemReduced || localReduced;

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';
  }, [reduced]);

  const setLocalReduced = useCallback((value: boolean) => {
    setLocalState(value);
    try {
      if (value) window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduce');
      else window.localStorage.removeItem(MOTION_STORAGE_KEY);
    } catch {
      /* ohne Speicher gilt die Wahl nur für diesen Besuch */
    }
  }, []);

  return (
    <MotionContext.Provider value={{ reduced, systemReduced, localReduced, setLocalReduced }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotion(): MotionState {
  return useContext(MotionContext);
}

/**
 * Für Effekte, die vor dem ersten Render entscheiden müssen: liest den
 * aktuellen Zustand direkt (Systemeinstellung oder html[data-motion]).
 */
export function motionReducedNow(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return document.documentElement.dataset.motion === 'reduce' || readLocal();
}
