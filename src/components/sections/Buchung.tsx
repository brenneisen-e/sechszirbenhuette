'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, Check, Phone, Mail, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { SITE_CONFIG, DESKLINE_CONFIG } from '@/lib/constants';

export function Buchung() {
  const { t, language } = useLanguage();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const includedItems = t.buchung.included.items;

  // Booking&more / Deskline iframe URL
  const bookingUrl = `https://web5.deskline.net/ACCOKTN/${language}/accommodations/detail/ACC-${DESKLINE_CONFIG.widgetId}`;

  return (
    <section id="buchung" className="py-20 bg-white">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-wood-100 text-wood-700 mb-6">
            <CalendarCheck size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t.buchung.title}
          </h2>
          <p className="text-lg text-gray-600">
            {t.buchung.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Price Info & Included */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Price Info */}
            <div className="bg-wood-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t.buchung.prices.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t.buchung.prices.base}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.buchung.prices.lowSeason}</span>
                  <span className="font-semibold">auf Anfrage</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.buchung.prices.highSeason}</span>
                  <span className="font-semibold">auf Anfrage</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                {t.buchung.prices.minStay}
              </p>
            </div>

            {/* Extras */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t.buchung.extras.title}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.buchung.extras.person5}</span>
                  <span>50 € / Aufenthalt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.buchung.extras.dog}</span>
                  <span>40 € / Tier</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.buchung.extras.laundry}</span>
                  <span>25 € / Person</span>
                </div>
              </div>
            </div>

            {/* Included */}
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t.buchung.included.title}
              </h3>
              <ul className="space-y-2">
                {includedItems.map((item: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-green-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="bg-wood-700 text-white rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">
                {language === 'de' ? 'Direkter Kontakt' : 'Direct Contact'}
              </h3>
              <div className="space-y-3">
                <a
                  href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 hover:text-wood-200 transition"
                >
                  <Phone size={18} />
                  <span>{SITE_CONFIG.phone}</span>
                </a>
                <a
                  href={`mailto:${SITE_CONFIG.email}`}
                  className="flex items-center gap-3 hover:text-wood-200 transition"
                >
                  <Mail size={18} />
                  <span>{SITE_CONFIG.email}</span>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right: Booking Widget */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              {/* Collapsible Header */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-6 h-6 text-wood-600" />
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900">
                      {t.buchung.form.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {language === 'de'
                        ? 'Klicken Sie hier, um den Buchungskalender anzuzeigen'
                        : 'Click here to show the booking calendar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-wood-600 hover:text-wood-800 flex items-center gap-1 mr-2"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <div className="w-10 h-10 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 md:p-6 pt-0">
                      {/* Booking iframe */}
                      <div className="relative bg-white rounded-lg overflow-hidden" style={{ minHeight: '700px' }}>
                        {!iframeLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                              <div className="animate-spin w-8 h-8 border-2 border-wood-600 border-t-transparent rounded-full mx-auto mb-4" />
                              <p className="text-gray-500">
                                {language === 'de' ? 'Buchungssystem wird geladen...' : 'Loading booking system...'}
                              </p>
                            </div>
                          </div>
                        )}
                        <iframe
                          src={bookingUrl}
                          className="w-full border-0"
                          style={{ height: '700px', minHeight: '700px' }}
                          onLoad={() => setIframeLoaded(true)}
                          title={language === 'de' ? 'Buchungskalender' : 'Booking Calendar'}
                          allow="payment"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick action when collapsed */}
              {!isExpanded && (
                <div className="px-4 md:px-6 pb-4 md:pb-6">
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full py-3 bg-wood-600 hover:bg-wood-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    {language === 'de' ? 'Verfügbarkeit prüfen' : 'Check availability'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
