'use client';

import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useRef, useCallback } from 'react';

interface ReviewQuote {
  quote: string;
  author: string;
  date: string;
}

export function Reviews() {
  const { t, language } = useLanguage();

  // Get reviews from translations
  const reviews: ReviewQuote[] = t.reviews?.quotes || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const minSwipeDistance = 50;

  // Reset index when language changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [language]);

  // Auto-rotate reviews every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || reviews.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, reviews.length]);

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const goToNext = useCallback(() => {
    if (reviews.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    pauseAutoPlay();
  }, [pauseAutoPlay, reviews.length]);

  const goToPrev = useCallback(() => {
    if (reviews.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    pauseAutoPlay();
  }, [pauseAutoPlay, reviews.length]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    pauseAutoPlay();
  };

  if (reviews.length === 0) {
    return null;
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0]?.clientX ?? null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section id="reviews" className="py-12 bg-transparent scroll-mt-20">
      <div className="container mx-auto px-4">
        {/* Rating Header */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Google Rating */}
            <a
              href="https://maps.app.goo.gl/YOUR_GOOGLE_LINK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg border border-wood-100 hover:border-wood-300 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold text-logo-green">5,0</div>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={`google-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              <div className="w-px h-16 bg-gray-200" />

              <div className="text-left">
                <div className="text-sm text-gray-500">{t.reviews?.source || 'Bewertung auf'}</div>
                <div className="font-semibold text-gray-800">Google</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.reviews?.basedOn || 'basierend auf Gästebewertungen'}</div>
              </div>
            </a>

            {/* FeWo-direkt Rating */}
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg border border-wood-100">
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold text-logo-green">9,8</div>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={`fewo-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              <div className="w-px h-16 bg-gray-200" />

              <div className="text-left">
                <div className="text-sm text-gray-500">{t.reviews?.source || 'Bewertung auf'}</div>
                <div className="font-semibold text-gray-800">Fewo-direkt</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.reviews?.basedOn || 'basierend auf Gästebewertungen'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Review Carousel */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={goToPrev}
              className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-100 text-gray-600 hover:text-wood-600 hover:border-wood-200 transition-colors z-20"
              aria-label="Vorherige Bewertung"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-100 text-gray-600 hover:text-wood-600 hover:border-wood-200 transition-colors z-20"
              aria-label="Nächste Bewertung"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div
              className="relative bg-white rounded-2xl p-6 md:p-8 shadow-md border border-gray-100 h-[200px] md:h-[180px] touch-pan-y overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <Quote className="absolute top-4 left-4 w-8 h-8 text-logo-green/30" />

              <div className="relative z-10 h-full">
                {reviews.map((review, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-500 flex flex-col justify-center ${
                      index === currentIndex
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                  >
                    <blockquote className="text-lg md:text-xl text-gray-700 italic text-center px-4 md:px-8">
                      &ldquo;{review.quote}&rdquo;
                    </blockquote>
                    <div className="mt-4 text-center">
                      <div className="font-medium text-gray-800">{review.author}</div>
                      <div className="text-sm text-gray-400">{review.date}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Swipe hint for mobile */}
              <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400 flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" />
                <span>{t.reviews?.swipe || 'wischen'}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Translated from German note */}
          {language !== 'de' && (
            <div className="text-center mt-3 text-xs text-gray-400 italic">
              (Translated from German)
            </div>
          )}

          {/* Navigation Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-logo-green w-6'
                    : 'bg-logo-green/30 hover:bg-logo-green/50'
                }`}
                aria-label={`${t.reviews?.goToReview || 'Zur Bewertung'} ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
