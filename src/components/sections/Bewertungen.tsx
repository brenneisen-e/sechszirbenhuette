'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ExternalLink, Quote } from 'lucide-react';

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
  const t = useTranslations('bewertungen');
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => res.json())
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
      gast_name: 'Hundefamilie K.',
      bewertung: 5,
      titel: 'Perfekt mit Hund',
      text: 'Endlich eine Unterkunft, in der unser Hund wirklich willkommen ist! Die Wandermöglichkeiten direkt vor der Tür sind fantastisch. Die Hütte ist gemütlich und hat alles was man braucht.',
      quelle: 'FeWo-direkt',
    },
  ];

  const displayReviews = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <section id="bewertungen" className="py-20 bg-gray-50">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-wood-100 text-wood-700 mb-6">
            <MessageSquare size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            {t('subtitle')}
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

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {displayReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <Quote size={24} className="text-wood-300 mb-4" />

              {review.titel && (
                <h4 className="font-bold text-gray-900 mb-2">{review.titel}</h4>
              )}

              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                {review.text}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
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
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('intro')}
          </p>
          <a
            href="https://g.page/r/YOUR_GOOGLE_PLACE_ID/review"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-wood-700 text-white rounded-lg hover:bg-wood-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('cta')}
            <ExternalLink size={16} />
          </a>
          <p className="text-sm text-gray-500 mt-6">
            {t('thankYou')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
