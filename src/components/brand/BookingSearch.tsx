'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  addDays,
  BOOKING_SEARCH_EVENT,
  type BookingQuery,
  DEFAULT_QUERY,
  MAX_GUESTS,
  nightsBetween,
  readBookingQuery,
  requestBookingSearch,
  todayIso,
} from '@/lib/booking';

// Kompakte Suche: Anreise, Abreise, Personen. Im Hero (auf Grün) ist der
// Knopf der rote Buchen-Button, im Buchungsbereich (auf Leinen) ein grüner.
// Beide Suchen bleiben über das Ereignis aus lib/booking.ts gleich.

interface Props {
  variant: 'hero' | 'section';
  className?: string;
}

export function BookingSearch({ variant, className = '' }: Props) {
  const { t } = useLanguage();
  const s = t.buchung.search;
  const id = useId();
  const [query, setQuery] = useState<BookingQuery>(DEFAULT_QUERY);
  const [error, setError] = useState('');
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(todayIso());
    setQuery(readBookingQuery(new URLSearchParams(window.location.search)));
    const onSearch = (e: Event) => setQuery((e as CustomEvent<BookingQuery>).detail);
    window.addEventListener(BOOKING_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(BOOKING_SEARCH_EVENT, onSearch);
  }, []);

  const nights = nightsBetween(query.arrival, query.departure);
  const onHero = variant === 'hero';

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
    if (query.arrival && nightsBetween(query.arrival, query.departure) < 1) {
      setError(s.invalid);
      return;
    }
    if (query.adults + query.children > MAX_GUESTS) {
      setError(s.maxGuests);
      return;
    }
    setError('');
    requestBookingSearch(query);
  };

  const label = onHero ? 'text-holz' : 'text-rinde';
  const field = `mt-1 block w-full min-h-[48px] rounded-[4px] border px-3 text-[1rem] [color-scheme:light] ${
    onHero
      ? 'border-transparent bg-leinen text-rinde'
      : 'border-zirbe/40 bg-white text-rinde focus:border-zirbe'
  }`;
  const adultOptions = Array.from({ length: MAX_GUESTS }, (_, i) => i + 1);
  const childOptions = Array.from({ length: MAX_GUESTS - query.adults + 1 }, (_, i) => i);

  return (
    <form onSubmit={submit} className={className} aria-label={s.title} noValidate>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
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
      </div>

      <p
        className={`mt-2 min-h-[1.5rem] text-[0.9375rem] ${onHero ? 'text-leinen' : 'text-rinde'}`}
        aria-live="polite"
      >
        {error || (nights > 0 ? `${nights} ${nights === 1 ? s.night : s.nights}` : ' ')}
      </p>

      {onHero ? (
        <button type="submit" className="brand-cta mt-2 w-full sm:w-auto">
          {t.brand.book}
        </button>
      ) : (
        <button
          type="submit"
          className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center rounded-[4px] bg-zirbe px-5 text-leinen transition-colors hover:bg-[#2f4a41]"
        >
          {s.submit}
        </button>
      )}
    </form>
  );
}
