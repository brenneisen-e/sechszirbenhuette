'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';

// Hüttenporträt in drei Kapiteln.
//
// Grundaufbau (mobil, reduzierte Bewegung, ohne JavaScript, 200 % Zoom): drei
// normale Bild-Text-Blöcke untereinander.
//
// M2 (ab 1024 × 700 px mit Bewegung): Bild links sticky, Text rechts. Aktiv
// ist das Kapitel, dessen Überschrift die Leselinie bei 45 % Viewporthöhe
// erreicht hat — vorwärts wie rückwärts. Wechsel durch Überblendung (180 ms),
// keine Zooms, kein blockiertes Scrollen.

const IMAGES = [
  { base: '/images/brand/kapitel-draussen' },
  { base: '/images/brand/kapitel-drinnen' },
  { base: '/images/brand/kapitel-zeit' },
];

const ENHANCE_QUERY = '(min-width: 1024px) and (min-height: 700px)';

function srcSet(base: string) {
  return `${base}-800.jpg 800w, ${base}-1400.jpg 1400w`;
}

export function HutChapters() {
  const { t } = useLanguage();
  const { reduced } = useMotion();
  const chapters = t.brand.chapters;
  const sectionRef = useRef<HTMLElement>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const [enhanced, setEnhanced] = useState(false);
  const [active, setActive] = useState(0);

  // Erweiterung nur bei passender Fläche und erlaubter Bewegung
  useEffect(() => {
    const query = window.matchMedia(ENHANCE_QUERY);
    const update = () => setEnhanced(query.matches && !reduced);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [reduced]);

  // Bilder vor dem ersten Wechsel decodieren
  useEffect(() => {
    if (!enhanced) return;
    for (const img of IMAGES) {
      const pre = new Image();
      pre.src = `${img.base}-1400.jpg`;
      pre.decode?.().catch(() => {});
    }
  }, [enhanced]);

  // Leselinie: nur solange der Abschnitt sichtbar ist, höchstens ein Update pro Frame
  useEffect(() => {
    const section = sectionRef.current;
    if (!enhanced || !section) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let next = 0;
      headingRefs.current.forEach((h, i) => {
        if (h && h.getBoundingClientRect().top <= line) next = i;
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    let listening = false;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && !listening) {
        window.addEventListener('scroll', onScroll, { passive: true });
        listening = true;
        measure();
      } else if (!visible && listening) {
        window.removeEventListener('scroll', onScroll);
        listening = false;
      }
    });
    observer.observe(section);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enhanced]);

  return (
    <section
      id="huette"
      ref={sectionRef}
      aria-labelledby="huette-title"
      className="bg-leinen py-16 md:py-24 scroll-mt-[var(--header-height)]"
    >
      <div className="brand-container">
        <p className="brand-label text-zirbe">{t.brand.chaptersLabel}</p>
        <h2 id="huette-title" className="brand-h2 mt-4 max-w-3xl text-zirbe">
          {t.brand.chaptersTitle}
        </h2>

        <div
          className={`chapters mt-12 md:mt-16 ${
            enhanced ? 'is-enhanced grid grid-cols-12 gap-x-12' : ''
          }`}
        >
          {enhanced && (
            <div className="chapters-sticky col-span-6 row-span-3">
              <div className="chapters-sticky-frame">
                {chapters.map((chapter, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={chapter.title}
                    src={`${IMAGES[i]?.base}-1400.jpg`}
                    srcSet={srcSet(IMAGES[i]?.base ?? '')}
                    sizes="50vw"
                    alt={i === active ? chapter.alt : ''}
                    aria-hidden={i === active ? undefined : true}
                    width={1400}
                    height={1050}
                    className={i === active ? 'is-active' : ''}
                  />
                ))}
              </div>
            </div>
          )}

          {chapters.map((chapter, i) => (
            <article
              key={chapter.title}
              className={
                enhanced
                  ? 'col-span-5 col-start-8 flex min-h-[62vh] flex-col justify-center py-[10vh] first:pt-0'
                  : 'grid gap-6 py-8 first:pt-0 md:grid-cols-12 md:items-center md:gap-12 md:py-12'
              }
            >
              <figure
                className={`chapter-figure md:col-span-7 ${i % 2 === 1 ? 'md:order-2 md:col-start-6' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${IMAGES[i]?.base}-1400.jpg`}
                  srcSet={srcSet(IMAGES[i]?.base ?? '')}
                  sizes="(min-width: 768px) 58vw, 100vw"
                  alt={chapter.alt}
                  width={1400}
                  height={1050}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[4/3] w-full rounded-[4px] object-cover"
                />
              </figure>
              <div className={enhanced ? '' : `md:col-span-5 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <p className="brand-label text-zirbe">{String(i + 1).padStart(2, '0')}</p>
                <h3
                  ref={(el) => {
                    headingRefs.current[i] = el;
                  }}
                  className="brand-h2 mt-2 text-zirbe"
                >
                  {chapter.title}
                </h3>
                <p className="mt-4 max-w-[34rem] text-rinde">{chapter.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
