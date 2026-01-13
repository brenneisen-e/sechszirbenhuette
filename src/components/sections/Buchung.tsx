'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { CalendarCheck, Check, Phone, Mail } from 'lucide-react';
import { SITE_CONFIG, DESKLINE_CONFIG } from '@/lib/constants';

declare global {
  interface Window {
    dw: (...args: unknown[]) => void;
  }
}

export function Buchung() {
  const t = useTranslations('buchung');
  const locale = useLocale();

  useEffect(() => {
    // Initialize Deskline Widget
    window.dw = window.dw || function () {
      (window.dw as unknown as { q: unknown[] }).q = (window.dw as unknown as { q: unknown[] }).q || [];
      (window.dw as unknown as { q: unknown[] }).q.push(arguments);
    };

    window.dw(
      'settings',
      DESKLINE_CONFIG.widgetId,
      {
        context: {
          serviceIds: [],
          productIds: [],
          packageIds: []
        },
        lang: locale
      }
    );

    // Load Deskline script
    const script = document.createElement('script');
    script.src = DESKLINE_CONFIG.scriptUrl;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [locale]);

  const includedItems = t.raw('included.items') as string[];

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
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('subtitle')}
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
                {t('prices.title')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('prices.base')}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('prices.lowSeason')}</span>
                  <span className="font-semibold">auf Anfrage</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('prices.highSeason')}</span>
                  <span className="font-semibold">auf Anfrage</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                {t('prices.minStay')}
              </p>
            </div>

            {/* Extras */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('extras.title')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('extras.person5')}</span>
                  <span>50 € / Aufenthalt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('extras.dog')}</span>
                  <span>40 € / Tier</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('extras.laundry')}</span>
                  <span>25 € / Person</span>
                </div>
              </div>
            </div>

            {/* Included */}
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('included.title')}
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
                {locale === 'de' ? 'Direkter Kontakt' : 'Direct Contact'}
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

          {/* Right: Deskline Widget */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-50 rounded-xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t('form.title')}
              </h3>

              {/* Deskline Widget Container */}
              <div id="deskline-widget" className="min-h-[500px]">
                {/* Widget wird hier durch Deskline geladen */}
                <div className="flex items-center justify-center h-full py-12 text-gray-500">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-wood-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p>{locale === 'de' ? 'Buchungskalender wird geladen...' : 'Loading booking calendar...'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
