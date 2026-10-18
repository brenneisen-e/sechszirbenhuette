'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';

// Gästebewertungen aus dem Admin Center (/api/reviews) als Wischreihe mit
// Einrasten; ab Tablet blättern zusätzlich Pfeile um eine Karte. Ohne
// gespeicherte Bewertungen bleibt nur der Aufruf, bei Google zu bewerten —
// keine Beispieltexte.

const GOOGLE_REVIEW_URL = 'https://g.page/r/CSYqzFakCmSsEBM/review';

interface Review {
  id: number;
  gast_name: string;
  bewertung: number;
  titel?: string;
  text: string;
  quelle?: string;
}

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          aria-hidden
          className={n <= Math.round(value) ? 'fill-zirbe text-zirbe' : 'text-zirbe/30'}
        />
      ))}
    </span>
  );
}

export function Bewertungen() {
  const { t, language } = useLanguage();
  const { getText } = useContentTexts();
  const [reviews, setReviews] = useState<Review[]>([]);
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => res.json() as Promise<{ reviews?: Review[] }>)
      .then((data) => setReviews(data.reviews ?? []))
      .catch(() => {});
  }, []);

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.bewertung || 0), 0) / reviews.length
      : 0;
  const averageText = average.toLocaleString(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const scrollBy = (direction: 1 | -1) => {
    const row = rowRef.current;
    const card = row?.querySelector('li');
    if (!row || !card) return;
    row.scrollBy({
      left: direction * (card.getBoundingClientRect().width + 12),
      behavior: 'smooth',
    });
  };

  return (
    <section
      id="bewertungen"
      aria-labelledby="bewertungen-title"
      className="brand-section bg-leinen"
    >
      <div className="brand-container">
        <SectionHeader
          id="bewertungen-title"
          label={t.navigation.bewertungen}
          title={getText('bewertungen_title')}
          titleKey="bewertungen_title"
          intro={getText('bewertungen_subtitle')}
          introKey="bewertungen_subtitle"
          action={
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-secondary"
            >
              {t.bewertungen.cta}
              <ExternalLink size={16} aria-hidden />
            </a>
          }
        />

        {reviews.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-rinde">
                <Stars value={average} label={`${averageText} / 5`} />
                <span className="tabular-nums">
                  {averageText} · {reviews.length} {t.navigation.bewertungen}
                </span>
              </span>
              <span className="hidden gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[4px] border border-zirbe/30 text-zirbe hover:border-zirbe"
                  aria-label={t.ui.previousReview}
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[4px] border border-zirbe/30 text-zirbe hover:border-zirbe"
                  aria-label={t.ui.nextReview}
                >
                  <ChevronRight size={20} aria-hidden />
                </button>
              </span>
            </div>

            <ul
              ref={rowRef}
              className="brand-snap-row mt-4 grid [grid-auto-columns:min(85vw,24rem)]"
            >
              {reviews.map((review) => (
                <li key={review.id}>
                  <figure className="flex h-full flex-col rounded-[4px] border border-zirbe/15 bg-white p-5">
                    <Stars value={review.bewertung} label={`${review.bewertung} / 5`} />
                    {review.titel && (
                      <p className="mt-3 text-[1.125rem] leading-snug text-zirbe">{review.titel}</p>
                    )}
                    <blockquote className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-rinde">
                      {review.text}
                    </blockquote>
                    <figcaption className="mt-4 border-t border-zirbe/10 pt-3 text-[0.9375rem]">
                      <span className="block text-zirbe">{review.gast_name}</span>
                      {review.quelle && (
                        <span className="block text-[0.875rem] text-rinde/70">{review.quelle}</span>
                      )}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
