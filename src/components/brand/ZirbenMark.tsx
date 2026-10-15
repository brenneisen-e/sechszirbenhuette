'use client';

import { useEffect, useRef } from 'react';
import { motionReducedNow, useMotion } from '@/contexts/MotionContext';

// Freistehender Zirbenzweig, schwarz und vollständig auf hellem Grund.
// Originalpfade aus public/images/logo.svg (public/images/brand/zirbenzweig.svg);
// ersetzen durch die Datei „Stempel-rund“ aus dem Designpaket.
// Schutzraum 25 % der Breite rundum, als Innenabstand reserviert.
//
// M3: Das umgebende Element erscheint einmal ruhig (10 px → 0, Opazität 0 → 1,
// 480 ms; mobil nur Einblendung 220 ms). Der Zweig selbst wird nie bewegt,
// gedreht oder nachgezeichnet.

/* eslint-disable @next/next/no-img-element -- SVG-Original */
export function ZirbenMark({ width = 96 }: { width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotion();
  const height = Math.round((width * 39.41) / 35.01);
  const guard = Math.round(width * 0.25);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || motionReducedNow()) return;
    if (el.classList.contains('is-shown')) return;
    // Schon im Bild: sofort sichtbar lassen
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.classList.add('is-armed');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('is-shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    const onScroll = () => {
      if (el.getBoundingClientRect().bottom < 0) {
        el.classList.remove('is-armed');
        observer.disconnect();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced) ref.current?.classList.remove('is-armed');
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="zirben-reveal inline-block"
      style={{ padding: guard, width: width + 2 * guard, height: height + 2 * guard }}
    >
      <img
        src="/images/brand/zirbenzweig.svg"
        alt=""
        width={width}
        height={height}
        className="block"
        style={{ width, height }}
      />
    </div>
  );
}
