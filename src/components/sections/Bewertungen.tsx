'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Quote } from 'lucide-react';

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-6">
            <MessageSquare size={32} strokeWidth={1.5} />
          </div>
          <h2
            data-text-key="bewertungen_title"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-logo-green mb-4"
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

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {displayReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm h-[280px] flex flex-col"
            >
              <Quote size={24} className="text-wood-300 mb-4 flex-shrink-0" />

              {review.titel && (
                <h4 className="font-bold text-gray-900 mb-2 flex-shrink-0">{review.titel}</h4>
              )}

              <p className="text-gray-600 text-sm mb-4 leading-relaxed flex-1 overflow-hidden line-clamp-4">
                {review.text}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0 mt-auto">
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

      </div>
    </section>
  );
}
