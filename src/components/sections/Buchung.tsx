'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, Check, Phone, Mail, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { SITE_CONFIG, DESKLINE_CONFIG } from '@/lib/constants';

// Extend Window interface for Deskline widget
declare global {
  interface Window {
    dw?: ((...args: unknown[]) => void) & { q?: unknown[][] };
  }
}

export function Buchung() {
  const { t, language } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldLoadWidget, setShouldLoadWidget] = useState(false);

  const includedItems = t.buchung.included.items;

  // Expand the widget and load it
  const expandWidget = useCallback(() => {
    setIsExpanded(true);
    setShouldLoadWidget(true);
  }, []);

  // Listen for hash changes and initial hash
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#buchung') {
        expandWidget();
      }
    };

    if (window.location.hash === '#buchung') {
      setTimeout(expandWidget, 100);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [expandWidget]);

  // Listen for clicks on #buchung links to expand
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href="#buchung"]');
      if (link) {
        setTimeout(expandWidget, 100);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [expandWidget]);

  // Load the Deskline widget only when shouldLoadWidget is true
  useEffect(() => {
    if (!shouldLoadWidget) return;
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    // Spoof mobile viewport for the widget BEFORE it loads
    const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const originalMatchMedia = window.matchMedia;

    // Override innerWidth to return mobile size (375px)
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      get: () => 375
    });

    // Override matchMedia to return mobile-style results
    window.matchMedia = (query: string) => {
      const result = originalMatchMedia.call(window, query);
      if (query.includes('min-width')) {
        const match = query.match(/min-width:\s*(\d+)/);
        if (match && parseInt(match[1]) > 500) {
          return {
            ...result,
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
          } as MediaQueryList;
        }
      }
      if (query.includes('max-width')) {
        const match = query.match(/max-width:\s*(\d+)/);
        if (match && parseInt(match[1]) >= 500) {
          return {
            ...result,
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
          } as MediaQueryList;
        }
      }
      return result;
    };

    // Initialize dw function
    window.dw = window.dw || function(...args: unknown[]) {
      (window.dw!.q = window.dw!.q || []).push(args);
    };

    // Configure widget settings
    window.dw(
      'settings',
      DESKLINE_CONFIG.widgetId,
      {
        context: {
          serviceIds: [],
          productIds: [],
          packageIds: []
        },
        lang: language === 'en' ? 'en' : 'de'
      }
    );

    // Load Deskline script
    const script = document.createElement('script');
    script.src = DESKLINE_CONFIG.scriptUrl;
    script.async = true;
    document.body.appendChild(script);

    // Watch for widget being added to body and move it to our container
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            const isWidget = node.id?.includes('deskline') ||
                           node.id?.includes('dw-') ||
                           node.className?.includes('deskline') ||
                           node.className?.includes('dw-') ||
                           node.querySelector('[class*="deskline"]') ||
                           node.querySelector('[class*="dw-"]');

            if (isWidget && containerRef.current && node.parentElement === document.body) {
              containerRef.current.appendChild(node);
              setIsLoading(false);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: false });

    // Fallback: After 3 seconds, check if widget appeared somewhere
    const timeout = setTimeout(() => {
      setIsLoading(false);
      const desklineElements = document.querySelectorAll('[id*="dw-"], [class*="dw-"], [id*="deskline"], [class*="deskline"]');
      desklineElements.forEach(el => {
        if (el.parentElement === document.body && containerRef.current) {
          containerRef.current.appendChild(el);
        }
      });
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      if (originalInnerWidth) {
        Object.defineProperty(window, 'innerWidth', originalInnerWidth);
      }
      window.matchMedia = originalMatchMedia;
      scriptLoadedRef.current = false;
    };
  }, [shouldLoadWidget, language]);

  return (
    <section id="buchung" className="py-20 bg-transparent">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-6">
            <CalendarCheck size={32} strokeWidth={1.5} />
          </div>
          <h2
            data-text-key="buchung_title"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green mb-4"
            style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('buchung_title') }}
          >
            {getText('buchung_title')}
          </h2>
          <p data-text-key="buchung_subtitle" className="text-sm sm:text-base md:text-lg text-gray-600" style={getTextStyle('buchung_subtitle')}>
            {getText('buchung_subtitle')}
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
            <div id="extras" className="bg-gray-50 rounded-xl p-6 scroll-mt-24">
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
            <div className="bg-logo-green text-white rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">
                {language === 'de' ? 'Direkter Kontakt' : 'Direct Contact'}
              </h3>
              <div className="space-y-3">
                <a
                  href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 hover:text-white/80 transition"
                >
                  <Phone size={18} />
                  <span>{SITE_CONFIG.phone}</span>
                </a>
                <a
                  href={`mailto:${SITE_CONFIG.email}`}
                  className="flex items-center gap-3 hover:text-white/80 transition"
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
              {/* Collapsed State - Show Button */}
              {!isExpanded && (
                <div className="p-6 md:p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <CalendarCheck className="w-12 h-12 text-logo-green mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-logo-green mb-2">
                      {t.buchung.form.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {language === 'de'
                        ? 'Prüfen Sie die Verfügbarkeit und senden Sie uns direkt eine Anfrage.'
                        : 'Check availability and send us a request directly.'}
                    </p>
                    <button
                      onClick={expandWidget}
                      className="bg-logo-green text-white px-8 py-4 rounded-xl font-semibold hover:bg-logo-green/90 transition shadow-lg flex items-center justify-center gap-2 mx-auto group"
                    >
                      <span>{language === 'de' ? 'Verfügbarkeit prüfen' : 'Check availability'}</span>
                      <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded State - Show Widget */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Collapse Header */}
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="w-full px-4 md:px-6 py-4 bg-gray-200 hover:bg-gray-300 transition flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarCheck className="w-5 h-5 text-logo-green" />
                        <span className="font-semibold text-gray-900">
                          {t.buchung.form.title}
                        </span>
                      </div>
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Widget Container */}
                    <div
                      ref={containerRef}
                      id="deskline-container"
                      className="p-4 md:p-6 min-h-[500px] [&>*]:w-full"
                    >
                      {isLoading && (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-wood-600" />
                            <p>
                              {language === 'de'
                                ? 'Buchungssystem wird geladen...'
                                : 'Loading booking system...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
