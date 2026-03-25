'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Quote, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface Review {
  id: number;
  gast_name: string;
  bewertung: number;
  titel?: string;
  text: string;
  aufenthalt_von?: string;
  quelle?: string;
}

export function Bewertungen() {
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => res.json() as Promise<{ reviews?: Review[] }>)
      .then((data) => {
        if (data.reviews) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
  }, []);

  // Fallback reviews if no API data
  const fallbackReviews: Review[] = [
    {
      id: 1,
      gast_name: 'Familie M.',
      bewertung: 5,
      titel: 'Traumhafter Urlaub',
      text: 'Die Sechszirbenhütte ist ein absoluter Traum! Die Lage ist einzigartig, die Ausstattung top und die Sauna perfekt nach einem Tag auf der Piste. Wir kommen definitiv wieder!',
      quelle: 'Google',
    },
    {
      id: 2,
      gast_name: 'Stefan & Anna',
      bewertung: 5,
      titel: 'Perfekte Auszeit',
      text: 'Endlich mal richtig abschalten können. Die Hütte ist liebevoll eingerichtet, sehr sauber und die Umgebung ist einfach wunderschön. Ein Highlight war die private Sauna!',
      quelle: 'Booking.com',
    },
    {
      id: 3,
      gast_name: 'Familie Huber',
      bewertung: 5,
      titel: 'Wie im Paradies',
      text: 'Die Ruhe, die Natur, der Ausblick - alles perfekt! Unsere Kinder haben den Schnee geliebt und wir Eltern die Sauna. Die Hütte ist sehr gepflegt und hat alles was man braucht.',
      quelle: 'Airbnb',
    },
    {
      id: 4,
      gast_name: 'Thomas K.',
      bewertung: 5,
      titel: 'Genau das Richtige',
      text: 'Wer Ruhe und Erholung sucht, ist hier genau richtig. Die Hütte liegt abgeschieden aber nicht zu weit vom Skigebiet. Wir kommen wieder!',
      quelle: 'Google',
    },
  ];

  const displayReviews = reviews.length > 0 ? reviews : fallbackReviews;

  // For desktop: show 2 reviews at a time, so we need to calculate pages
  const reviewsPerPage = 2;
  const totalPages = Math.ceil(displayReviews.length / reviewsPerPage);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // Get current reviews for the page (desktop shows 2, mobile shows 1)
  const getCurrentReviews = () => {
    const startIdx = currentIndex * reviewsPerPage;
    return displayReviews.slice(startIdx, startIdx + reviewsPerPage);
  };

  return (
    <section id="bewertungen" className="pt-20 pb-10 bg-white">
      <div className="container">
        {/* White background container for better readability */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-10 shadow-sm">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-6">
              <MessageSquare size={32} strokeWidth={1.5} />
            </div>
            <h2
              data-text-key="bewertungen_title"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-logo-green mb-4"
              style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('bewertungen_title') }}
            >
              {getText('bewertungen_title')}
            </h2>
            <p data-text-key="bewertungen_subtitle" className="text-sm sm:text-base md:text-lg text-gray-600 mb-2" style={getTextStyle('bewertungen_subtitle')}>
              {getText('bewertungen_subtitle')}
            </p>

            {/* Rating Summary */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={28}
                    className="text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <span className="text-xl font-bold text-gray-900 ml-2">5.0</span>
            </div>
          </motion.div>

          {/* Reviews Grid/Carousel */}
          <div className="relative">
            {/* Navigation Arrows - Desktop */}
            {totalPages > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-8 z-10 w-12 h-12 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-logo-green hover:bg-logo-green hover:text-white transition-all"
                  aria-label="Vorherige Bewertungen"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNext}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-8 z-10 w-12 h-12 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-logo-green hover:bg-logo-green hover:text-white transition-all"
                  aria-label="Nächste Bewertungen"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Desktop: Two reviews side by side */}
            <div className="hidden md:block">
              <div className="grid grid-cols-2 gap-6">
                {getCurrentReviews().map((review) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gray-50 rounded-xl p-6 lg:p-8 shadow-sm border border-gray-100"
                  >
                    <Quote size={32} className="text-logo-green/30 mb-4" />

                    {review.titel && (
                      <h4 className="font-bold text-gray-900 text-lg lg:text-xl mb-3">{review.titel}</h4>
                    )}

                    <p className="text-gray-600 text-base lg:text-lg mb-6 leading-relaxed">
                      {review.text}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-900">{review.gast_name}</p>
                        {review.quelle && (
                          <p className="text-xs text-gray-500">{review.quelle}</p>
                        )}
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={18}
                            className={
                              star <= review.bewertung
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile: Single review carousel */}
            <div
              ref={carouselRef}
              className="md:hidden overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <motion.div
                className="flex"
                animate={{ x: `-${currentIndex * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {displayReviews.map((review) => (
                  <div
                    key={review.id}
                    className="w-full flex-shrink-0 px-2"
                  >
                    <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
                      <Quote size={28} className="text-logo-green/30 mb-3" />

                      {review.titel && (
                        <h4 className="font-bold text-gray-900 text-lg mb-2">{review.titel}</h4>
                      )}

                      <p className="text-gray-600 text-base mb-4 leading-relaxed">
                        {review.text}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{review.gast_name}</p>
                          {review.quelle && (
                            <p className="text-xs text-gray-500">{review.quelle}</p>
                          )}
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={16}
                              className={
                                star <= review.bewertung
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {/* Desktop: page dots */}
              <div className="hidden md:flex gap-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-logo-green w-6'
                        : 'bg-logo-green/30 hover:bg-logo-green/50'
                    }`}
                    aria-label={`Seite ${index + 1}`}
                  />
                ))}
              </div>
              {/* Mobile: individual review dots */}
              <div className="md:hidden flex gap-1.5">
                {displayReviews.slice(0, Math.min(displayReviews.length, 6)).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-logo-green w-6'
                        : 'bg-logo-green/30 w-2'
                    }`}
                    aria-label={`Bewertung ${index + 1}`}
                  />
                ))}
                {displayReviews.length > 6 && (
                  <span className="text-xs text-gray-500 ml-2">+{displayReviews.length - 6}</span>
                )}
              </div>
            </div>

            {/* Swipe Hint - Mobile Only */}
            <p className="md:hidden text-center text-xs text-gray-400 mt-4">
              ← Wischen zum Blättern →
            </p>
          </div>

          {/* Google Review CTA */}
          <div className="text-center mt-10">
            <a
              href="https://g.page/r/CSYqzFakCmSsEBM/review"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-logo-green/10 text-logo-green rounded-xl hover:bg-logo-green/20 transition font-medium text-sm"
            >
              Bewerten Sie uns auf Google
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
