'use client';

import { useEffect, useRef } from 'react';
import { motionReducedNow, useMotion } from '@/contexts/MotionContext';

// Fassadenband: dunkelbraun mit vier hellen Fugen und ihren Versätzen.
// PLATZHALTER-Geometrie nach Markenhandbuch S. 9 — ersetzen durch die Pfade aus
// 03_Designsystem/Fugenband-Leinen-auf-Fassadenbraun.svg, sobald vorhanden.
//
// Nur horizontale und vertikale Segmente: Die freie Breitenanpassung
// (preserveAspectRatio="none") erhält rechte Winkel; die Linienstärke bleibt
// dank non-scaling-stroke konstant.
//
// M1 (animated): Die Fugen zeichnen sich einmal von links nach rechts (clip-path,
// siehe brand.css), wenn das
// Band etwa bei 80 vh eintritt. Der Ausgangszustand im Stylesheet ist das
// fertige Muster; der Anfangszustand wird nur vorbereitet, solange das Band
// noch unterhalb der Auslöselinie liegt.

const PATHS = [
  'M0 20 H340 V14 H680 V20 H1000',
  'M0 43.5 H1000',
  'M0 63 H570 V68 H1000',
  'M0 86.5 H1000',
];

export function FacadeBand({ animated = false }: { animated?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const { reduced } = useMotion();

  useEffect(() => {
    const el = ref.current;
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
    if (reduced) ref.current?.classList.remove('is-armed');
  }, [reduced]);

  return (
    <div className="facade-gap" aria-hidden="true">
      <svg
        ref={ref}
        className="facade-band"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        {PATHS.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}
