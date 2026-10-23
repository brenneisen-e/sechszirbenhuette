'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  addDays,
  beds24FormUrl,
  type BookingQuery,
  DEFAULT_QUERY,
  MAX_GUESTS,
  nightsBetween,
  openBeds24Form,
  readBookingQuery,
  todayIso,
} from '@/lib/booking';

// Kompakte Suche: Anreise, Abreise, Personen. „Anfragen“ (roter Knopf) öffnet
// direkt das Beds24-Buchungsformular mit Preisaufstellung in einem neuen
// Fenster (lib/booking.ts). Hero auf Grün (schmal untereinander, „bar“ als
// Leiste in einer Zeile im Aufmacher), Buchungsbereich auf Leinen.

interface Props {
  variant: 'hero' | 'bar' | 'section';
  className?: string;
}

export function BookingSearch({ variant, className = '' }: Props) {
  const { t, language } = useLanguage();
  const s = t.buchung.search;
  const id = useId();
  const [query, setQuery] = useState<BookingQuery>(DEFAULT_QUERY);
  const [error, setError] = useState('');
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(todayIso());
    setQuery(readBookingQuery(new URLSearchParams(window.location.search)));
  }, []);

  const nights = nightsBetween(query.arrival, query.departure);
  // Leiste und Hero stehen auf Grün
  const onHero = variant !== 'section';
  const bar = variant === 'bar';

  const setArrival = (arrival: string) => {
    setError('');
    setQuery((q) => {
      const next = { ...q, arrival: arrival || undefined };
      // Abreise mitziehen: eine Woche ist der übliche Mindestaufenthalt
      if (arrival && (!q.departure || nightsBetween(arrival, q.departure) < 1)) {
        next.departure = addDays(arrival, 7);
      }
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.arrival || !query.departure) {
      setError(s.required);
      return;
    }
    if (nightsBetween(query.arrival, query.departure) < 1) {
      setError(s.invalid);
      return;
    }
    if (query.adults + query.children > MAX_GUESTS) {
      setError(s.maxGuests);
      return;
    }
    const url = beds24FormUrl(query, language);
    if (!url) return;
    setError('');
    openBeds24Form(url);
  };

  const label = onHero ? 'text-holz' : 'text-rinde';
  const field = `mt-1 block w-full min-h-[48px] rounded-[4px] border px-3 text-[1rem] [color-scheme:light] ${
    onHero
      ? 'border-transparent bg-leinen text-rinde'
      : 'border-zirbe/40 bg-white text-rinde focus:border-zirbe'
  }`;
  const adultOptions = Array.from({ length: MAX_GUESTS }, (_, i) => i + 1);
  const childOptions = Array.from({ length: MAX_GUESTS - query.adults + 1 }, (_, i) => i);

  const status = (
    <p
      className={`min-h-[1.5rem] text-[0.9375rem] ${bar ? '' : 'mt-2'} ${
        onHero ? 'text-leinen' : 'text-rinde'
      }`}
      aria-live="polite"
    >
      {error || (nights > 0 ? `${nights} ${nights === 1 ? s.night : s.nights}` : ' ')}
    </p>
  );
  const hint = (
    <p
      className={`text-[0.875rem] ${bar ? '' : 'mt-2'} ${
        onHero ? 'text-leinen/80' : 'text-rinde/75'
      }`}
    >
      {s.hint}
    </p>
  );

  return (
    <form onSubmit={submit} className={className} aria-label={s.title} noValidate>
      <div
        className={
          bar
            ? 'grid grid-cols-[repeat(4,minmax(0,1fr))_auto] items-end gap-3'
            : 'grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2'
        }
      >
        <label htmlFor={`${id}-in`} className={`text-[0.9375rem] ${label}`}>
          {s.arrival}
          <input
            id={`${id}-in`}
            type="date"
            min={today || undefined}
            value={query.arrival ?? ''}
            onChange={(e) => setArrival(e.target.value)}
            className={field}
          />
        </label>
        <label htmlFor={`${id}-out`} className={`text-[0.9375rem] ${label}`}>
          {s.departure}
          <input
            id={`${id}-out`}
            type="date"
            min={query.arrival ? addDays(query.arrival, 1) : today || undefined}
            value={query.departure ?? ''}
            onChange={(e) => {
              setError('');
              setQuery((q) => ({ ...q, departure: e.target.value || undefined }));
            }}
            className={field}
          />
        </label>
        <label htmlFor={`${id}-ad`} className={`text-[0.9375rem] ${label}`}>
          {s.adults}
          <select
            id={`${id}-ad`}
            value={query.adults}
            onChange={(e) => {
              const adults = Number(e.target.value);
              setQuery((q) => ({
                ...q,
                adults,
                children: Math.min(q.children, MAX_GUESTS - adults),
              }));
            }}
            className={field}
          >
            {adultOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-ch`} className={`text-[0.9375rem] ${label}`}>
          {s.children}
          <select
            id={`${id}-ch`}
            value={query.children}
            onChange={(e) => setQuery((q) => ({ ...q, children: Number(e.target.value) }))}
            className={field}
          >
            {childOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {bar && (
          <button type="submit" className="brand-cta brand-cta--compact">
            {t.brand.book}
          </button>
        )}
      </div>

      {bar ? (
        // Leiste: Nächte bzw. Hinweis und Erklärung in einer Zeile darunter
        <div className="mt-2 flex items-baseline justify-between gap-6">
          {status}
          {hint}
        </div>
      ) : (
        <>
          {status}
          <button type="submit" className={`brand-cta mt-2 w-full ${onHero ? 'sm:w-auto' : ''}`}>
            {t.brand.book}
          </button>
          {hint}
        </>
      )}
    </form>
  );
}
