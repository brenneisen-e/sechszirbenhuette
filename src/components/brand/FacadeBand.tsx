'use client';

import { useEffect, useRef } from 'react';
import { motionReducedNow, useMotion } from '@/contexts/MotionContext';
import { useMediaQuery, useScrollProgress } from '@/hooks/useScrollProgress';

// Fassadenband: dunkelbraun mit vier hellen Fugen und ihren Versätzen.
// PLATZHALTER-Geometrie nach Markenhandbuch S. 9 — ersetzen durch die Pfade aus
// 03_Designsystem/Fugenband-Leinen-auf-Fassadenbraun.svg, sobald vorhanden.
//
// Nur horizontale und vertikale Segmente bei den Fugen: Die freie
// Breitenanpassung (preserveAspectRatio="none") erhält rechte Winkel; die
// Linienstärke bleibt dank non-scaling-stroke konstant.
//
// animated (Fachwerk-Übergang, Briefing 18.10.2026):
// - Die Fugen ziehen sich einmal von links nach rechts auf, wenn das Band
//   etwa bei 80 vh eintritt: Eine Deckfläche in Fassadenbraun gleitet nach
//   rechts weg (nur transform).
// - Ab 768 px mit Bewegung zusätzlich Parallaxe in drei Ebenen: Kärntner
//   Fachwerk (Ständer und Streben, zart) hinten, die beiden Fugenpaare davor,
//   gegeneinander verschoben je nach Scrollstand (--p, nur transform).
// - Handy: eine Ebene, keine Parallaxe. Reduzierte Bewegung: fertiges Band.
// Ohne animated (Fußzeile): nur das Band.

const JOINTS_A = ['M0 20 H340 V14 H680 V20 H1000', 'M0 63 H570 V68 H1000'];
const JOINTS_B = ['M0 43.5 H1000', 'M0 86.5 H1000'];

// Ständer alle 160 Einheiten, dazwischen Streben und ein Andreaskreuz
const BEAMS = [
  'M100 0 V100',
  'M260 0 V100',
  'M420 0 V100',
  'M580 0 V100',
  'M740 0 V100',
  'M900 0 V100',
  'M100 100 L260 0',
  'M260 0 L420 100 M260 100 L420 0',
  'M420 0 L580 100',
  'M740 100 L900 0',
];

function Layer({ paths, className }: { paths: string[]; className: string }) {
  return (
    <svg
      className={`facade-layer ${className}`}
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function FacadeBand({ animated = false }: { animated?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const { reduced } = useMotion();
  const wide = useMediaQuery('(min-width: 768px)');
  const parallax = animated && wide && !reduced;
  useScrollProgress(wrapRef, parallax);

  // Fugen einmal aufziehen
  useEffect(() => {
    const el = bandRef.current;
    if (!animated || !el || reduced || motionReducedNow()) return;
    if (el.classList.contains('is-drawn')) return;

    const trigger = () => window.innerHeight * 0.8;
    // Bereits sichtbar oder überscrollt: fertig lassen, kein Aufblitzen
    if (el.getBoundingClientRect().top < trigger()) return;

    el.classList.add('is-armed');
    const finish = () => {
      el.classList.add('is-drawn');
      cleanup();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) finish();
      },
      { rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(el);
    // Direkter Sprung über das Band hinweg: Muster sofort fertig zeigen
    const onScroll = () => {
      if (el.getBoundingClientRect().bottom < 0) {
        el.classList.remove('is-armed');
        cleanup();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    function cleanup() {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    }
    return cleanup;
  }, [animated, reduced]);

  // Wechsel auf reduzierte Bewegung: Endzustand
  useEffect(() => {
    if (reduced) bandRef.current?.classList.remove('is-armed');
  }, [reduced]);

  return (
    <div ref={wrapRef} className={`facade-gap ${parallax ? 'is-parallax' : ''}`} aria-hidden="true">
      <div ref={bandRef} className="facade-band">
        {animated && <Layer paths={BEAMS} className="facade-beams" />}
        <Layer paths={JOINTS_A} className="facade-joints facade-joints--a" />
        <Layer paths={JOINTS_B} className="facade-joints facade-joints--b" />
        {animated && <span className="facade-cover" />}
      </div>
    </div>
  );
}
