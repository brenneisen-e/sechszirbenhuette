'use client';

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { BookingSearch } from '@/components/brand/BookingSearch';
import {
  beds24BookingUrl,
  BOOKING_SEARCH_EVENT,
  type BookingQuery,
  DEFAULT_QUERY,
  readBookingQuery,
} from '@/lib/booking';

// Buchung direkt über Beds24 (Unterkunft 359833, nur Zimmer 741929) als
// eingebettete Buchungsseite. Beds24 sendet keine Höhe an die Seite (kein
// iframeResizer), deshalb hat der Rahmen eine feste Höhe je Breite, und der
// Link „in eigenem Fenster“ bleibt als Ausweg sichtbar — vor allem auf dem
// Handy. Preise und Zusatzkosten daneben sind Hinweise; verbindlich rechnet
// Beds24.

export function Buchung() {
  const { t, language } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();
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

  const card = 'rounded-[4px] border border-zirbe/15 bg-white p-5';
  const cardTitle = 'text-[1.125rem] text-zirbe';

  return (
    <section id="buchung" aria-labelledby="buchung-title" className="bg-leinen py-14 lg:py-20">
      <div className="brand-container">
        <div className="max-w-3xl">
          <h2
            id="buchung-title"
            data-text-key="buchung_title"
            className="brand-h2 text-zirbe"
            style={getTextStyle('buchung_title')}
          >
            {getText('buchung_title')}
          </h2>
          <p
            data-text-key="buchung_subtitle"
            className="mt-3 text-rinde"
            style={getTextStyle('buchung_subtitle')}
          >
            {getText('buchung_subtitle')}
          </p>
        </div>

        {/* Handy/Tablet: Suche, Kalender, Hinweise untereinander; Desktop: links
            Suche und Hinweise, rechts der Kalender über beide Zeilen */}
        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-10">
          <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <div className="on-zirbe rounded-[4px] bg-zirbe p-5 text-leinen sm:col-span-2 lg:col-span-1">
              <p className="text-[1.25rem] leading-snug">{b.direct.title}</p>
              <p className="mt-1 text-[0.9375rem] text-leinen/85">{b.direct.text}</p>
            </div>

            <div className={`${card} sm:col-span-2 lg:col-span-1`}>
              <h3 className={cardTitle}>{b.search.title}</h3>
              <BookingSearch variant="section" className="mt-3" />
            </div>
          </div>

          <div
            id="buchung-kalender"
            className="scroll-mt-4 lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1"
          >
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
              <div className="relative h-[1500px] sm:h-[1700px] lg:h-[1780px]">
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
          <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <div className={card}>
              <h3 className={cardTitle}>{b.prices.title}</h3>
              <p className="mt-2 text-[0.9375rem] text-rinde">{b.prices.text}</p>
              <h4 className="mt-4 text-[0.9375rem] text-zirbe">{b.prices.minStayTitle}</h4>
              <ul className="mt-1 space-y-1 text-[0.9375rem] text-rinde">
                {b.prices.minStay.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className={card}>
              <h3 className={cardTitle}>{b.extras.title}</h3>
              <ul className="mt-2 divide-y divide-zirbe/10">
                {b.extras.items.map((item) => (
                  <li key={item.label} className="py-2">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-rinde">{item.label}</span>
                      <span className="whitespace-nowrap text-zirbe tabular-nums">
                        {item.value}
                      </span>
                    </span>
                    <span className="block text-[0.875rem] text-rinde/75">{item.note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={card}>
              <h3 className={cardTitle}>{b.included.title}</h3>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.9375rem] text-rinde lg:grid-cols-1 xl:grid-cols-2">
                {b.included.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={16} className="mt-1 shrink-0 text-zirbe" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={card}>
              <h3 className={cardTitle}>{b.info.title}</h3>
              <ul className="mt-2 space-y-1.5 text-[0.9375rem] text-rinde">
                {b.info.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={16} className="mt-1 shrink-0 text-zirbe" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
