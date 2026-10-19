'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import {
  beds24BookingUrl,
  BOOKING_SEARCH_EVENT,
  type BookingQuery,
  DEFAULT_QUERY,
  readBookingQuery,
} from '@/lib/booking';

// Buchung direkt über Beds24 (Unterkunft 359833, nur Zimmer 741929) als
// eingebettete Buchungsseite ohne deren Kopfbild. Die Datumssuche bringt
// Beds24 selbst mit; die Suche im Aufmacher füllt sie vor. Preise, Mindest-
// aufenthalt und Zusatzkosten zeigt nur Beds24. Beds24 sendet keine Höhe an
// die Seite (kein iframeResizer), deshalb hat der Rahmen eine feste Höhe je
// Breite, und der Link „in eigenem Fenster“ bleibt als Ausweg sichtbar.

export function Buchung() {
  const { t, language } = useLanguage();
  const { getText } = useContentTexts();
  const b = t.buchung;
  const [query, setQuery] = useState<BookingQuery>(DEFAULT_QUERY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setQuery(readBookingQuery(new URLSearchParams(window.location.search)));
    const onSearch = (e: Event) => setQuery((e as CustomEvent<BookingQuery>).detail);
    window.addEventListener(BOOKING_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(BOOKING_SEARCH_EVENT, onSearch);
  }, []);

  const url = beds24BookingUrl(query, language);
  useEffect(() => setLoaded(false), [url]);

  return (
    <section id="buchung" aria-labelledby="buchung-title" className="brand-section bg-leinen">
      <div className="brand-container">
        <h2 id="buchung-title" data-text-key="buchung_title" className="sr-only">
          {getText('buchung_title')}
        </h2>
        <p className="on-zirbe rounded-[4px] bg-zirbe px-5 py-4 text-[1.125rem] leading-snug text-leinen md:px-6 md:py-5 md:text-[1.375rem]">
          {b.direct.title}
        </p>

        <div id="buchung-kalender" className="mt-4 scroll-mt-4">
          <div className="overflow-hidden rounded-[4px] border border-zirbe/15 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-zirbe/10 px-4 py-3 text-[0.9375rem]">
              <span className="inline-flex items-center gap-2 text-rinde">
                <ShieldCheck size={18} className="text-zirbe" aria-hidden />
                {b.widget.secure}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-link inline-flex items-center gap-1.5"
              >
                {b.widget.openWindow}
                <ExternalLink size={16} aria-hidden />
              </a>
            </div>
            <div className="relative h-[1500px] sm:h-[1400px] lg:h-[1350px]">
              {!loaded && (
                <div className="absolute inset-x-0 top-0 flex justify-center pt-24 text-rinde">
                  <span className="inline-flex items-center gap-3">
                    <Loader2 size={22} className="animate-spin text-zirbe" aria-hidden />
                    {b.widget.loading}
                  </span>
                </div>
              )}
              <iframe
                src={url}
                title={b.widget.frameTitle}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
