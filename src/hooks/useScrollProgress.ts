'use client';

import { type RefObject, useEffect, useState } from 'react';

// Scrollfortschritt eines Elements als CSS-Variable --p (0 bis 1):
// 0, wenn seine Oberkante am unteren Bildschirmrand erscheint, 1, wenn seine
// Unterkante oben hinausgeht. Gemessen wird nur, solange es sichtbar ist,
// höchstens einmal pro Frame. Die Effekte selbst stehen in brand.css und
// bewegen nur transform. Ohne `enabled` wird --p entfernt (Endzustand per CSS).

export function useScrollProgress(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.removeProperty('--p');
      return;
    }
    let frame = 0;
    let listening = false;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh - rect.top) / (vh + rect.height);
      el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !listening) {
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          listening = true;
        } else if (!visible && listening) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
          listening = false;
        }
        update();
      },
      { rootMargin: '15% 0px' },
    );
    observer.observe(el);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      el.style.removeProperty('--p');
    };
  }, [ref, enabled]);
}

/** true, solange die Medienabfrage zutrifft (nach dem ersten Rendern) */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}
