'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';
import { useImageVariants } from '@/contexts/SiteSettingsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { responsiveSource } from '@/lib/imageVariants';

// Blog auf der Startseite als Slider: die neuesten veröffentlichten Beiträge
// (bis zu zwölf) mit Titelbild, Datum, Anriss und Link. Handy: wischen, die
// nächste Karte schaut an. Tablet zwei, Desktop drei Karten nebeneinander,
// dazu Pfeile und eine Fortschrittsleiste. Daten von /api/blog (nur
// veröffentlichte); ohne Beiträge bleibt der Bereich leer.

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  created_at: string;
}

const MAX_POSTS = 12;

// Bildzeichen am Anfang eines Titels (z. B. Emojis) für die Kachel weglassen
function cleanTitle(title: string): string {
  return title.replace(/^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+/u, '').trim() || title;
}

interface ScrollState {
  overflow: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** sichtbarer Anteil und Position für die Fortschrittsleiste (0–1) */
  visible: number;
  offset: number;
}

const INITIAL_SCROLL: ScrollState = {
  overflow: false,
  atStart: true,
  atEnd: true,
  visible: 1,
  offset: 0,
};

export function BlogTeaser() {
  const { t, language } = useLanguage();
  const { reduced } = useMotion();
  const variants = useImageVariants();
  const b = t.blogTeaser;
  const [posts, setPosts] = useState<Post[]>([]);
  const [scroll, setScroll] = useState<ScrollState>(INITIAL_SCROLL);
  const trackRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/blog?status=published')
      .then((res) => (res.ok ? (res.json() as Promise<{ posts?: Post[] }>) : null))
      .then((data) => {
        if (!cancelled && data?.posts) setPosts(data.posts.slice(0, MAX_POSTS));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setScroll({
      overflow: max > 2,
      atStart: track.scrollLeft <= 2,
      atEnd: track.scrollLeft >= max - 2,
      visible: track.scrollWidth > 0 ? Math.min(1, track.clientWidth / track.scrollWidth) : 1,
      offset: track.scrollWidth > 0 ? track.scrollLeft / track.scrollWidth : 0,
    });
  }, []);

  // Neu messen, sobald Karten da sind und wenn sich die Breite ändert
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, posts.length]);

  // Um eine Karte (inkl. Abstand) weiterblättern
  const step = (dir: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: reduced ? 'auto' : 'smooth' });
  };

  if (posts.length === 0) return null;

  const formatDate = (iso: string | null, fallback: string) => {
    const d = new Date(iso ?? fallback.replace(' ', 'T'));
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const arrowClass =
    'inline-flex h-12 w-12 items-center justify-center rounded-[4px] border border-zirbe text-zirbe transition-colors hover:bg-zirbe/10 disabled:cursor-default disabled:border-zirbe/25 disabled:text-zirbe/30 disabled:hover:bg-transparent';

  return (
    <section id="blog" aria-labelledby="blog-title" className="brand-section bg-leinen">
      <div className="brand-container">
        <SectionHeader
          id="blog-title"
          label={b.label}
          title={b.title}
          intro={b.intro}
          action={
            <div className="flex items-center gap-3">
              {scroll.overflow && (
                <div className="hidden items-center gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    disabled={scroll.atStart}
                    aria-label={b.prev}
                    aria-controls="blog-slider"
                    className={arrowClass}
                  >
                    <ArrowLeft size={20} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    disabled={scroll.atEnd}
                    aria-label={b.next}
                    aria-controls="blog-slider"
                    className={arrowClass}
                  >
                    <ArrowRight size={20} aria-hidden />
                  </button>
                </div>
              )}
              <Link href="/blog" className="brand-secondary">
                {b.all}
                <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
          }
        />

        <ul
          id="blog-slider"
          ref={trackRef}
          onScroll={measure}
          aria-label={b.slider}
          className="brand-slider mt-6 md:mt-8"
        >
          {posts.map((post) => {
            const title = cleanTitle(post.title);
            const source = post.cover_image_url
              ? responsiveSource(post.cover_image_url, variants, 'medium', 'thumb')
              : null;
            return (
              <li key={post.id} className="min-w-0">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-zirbe/15 bg-white transition-colors hover:border-zirbe/40"
                >
                  <span className="relative block aspect-[3/2] overflow-hidden bg-zirbe/10">
                    {source && (
                      // eslint-disable-next-line @next/next/no-img-element -- Cloudflare-Varianten per srcset
                      <img
                        {...source}
                        sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 80vw"
                        alt={post.cover_image_alt || title}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-[0.875rem] text-rinde/70">
                      {formatDate(post.published_at, post.created_at)}
                    </span>
                    <span className="mt-1 text-[1.1875rem] leading-snug text-zirbe">{title}</span>
                    {post.excerpt && (
                      <span className="mt-2 line-clamp-3 text-[0.9375rem] text-rinde">
                        {post.excerpt}
                      </span>
                    )}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.9375rem] text-zirbe underline underline-offset-4">
                      {b.read}
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Fortschritt: wie weit die Reihe gescrollt ist */}
        {scroll.overflow && (
          <div aria-hidden="true" className="relative mt-5 h-[3px] overflow-hidden bg-zirbe/15">
            <span
              className="absolute inset-y-0 bg-zirbe transition-[left] duration-150 motion-reduce:transition-none"
              style={{ width: `${scroll.visible * 100}%`, left: `${scroll.offset * 100}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
