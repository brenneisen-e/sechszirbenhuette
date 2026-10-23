'use client';

import { AlertCircle, CalendarCheck, LogIn, LogOut } from 'lucide-react';
import type { CSSProperties } from 'react';

import {
  addDays,
  bookingColor,
  bookingLabel,
  departureOn,
  mondayOf,
  nextArrival,
  nextFreeWindow,
  occupancy,
  occupancyPct,
  shortRange,
  weekdayDayMonth,
} from '@/lib/dashboard/hutDashboard';

import { euroShort, type HutSlot, pricesForNight } from './api';

// Kopf der Übersicht: Wie steht die Hütte heute da — belegt oder frei, was
// kostet die Nacht auf den Plattformen, wann ist die nächste buchbare Lücke?

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900 tabular-nums truncate">{value}</div>
      {hint && <div className="text-xs leading-snug text-gray-500">{hint}</div>}
    </div>
  );
}

export default function TodayCard({ slot }: { slot: HutSlot }) {
  if (!slot.data) {
    return (
      <div className="min-w-0 rounded-xl border border-gray-200 p-4">
        <div className="text-sm font-semibold text-gray-900">{slot.name}</div>
        <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{slot.error || 'Keine Daten'}</span>
        </div>
      </div>
    );
  }

  const data = slot.data;
  const today = data.today;
  const tonight = slot.states[today];
  const prices = pricesForNight(data, today);
  const minStay = data.days[today]?.m;
  const taken = tonight !== undefined && tonight.kind !== 'free';

  const arrivingToday = tonight?.kind === 'booked' && tonight.booking.arrival === today;
  const leavingToday = departureOn(data, today);
  const arrival = nextArrival(data, addDays(today, 1));
  const freeWindow = nextFreeWindow(data, slot.states, today);

  const monday = mondayOf(today);
  const week = occupancy(slot.states, monday, addDays(monday, 6));
  const next30 = occupancy(slot.states, today, addDays(today, 29));
  const next30Pct = occupancyPct(next30);

  let pill: { text: string; className: string; style: CSSProperties } = {
    text: 'Heute frei',
    className: 'bg-green-50 text-green-700',
    style: {},
  };
  let detail = arrival
    ? `Nächste Anreise ${weekdayDayMonth(arrival.arrival)} · ${bookingLabel(arrival)}`
    : 'Keine weitere Buchung im Zeitraum';
  if (tonight?.kind === 'booked') {
    const b = tonight.booking;
    pill = { text: 'Belegt', className: 'text-gray-800', style: { background: bookingColor(b) } };
    detail = [bookingLabel(b), b.name, `bis ${weekdayDayMonth(b.departure)}`]
      .filter(Boolean)
      .join(' · ');
  } else if (tonight?.kind === 'blocked') {
    pill = { text: 'Gesperrt', className: 'bg-red-50 text-red-700', style: {} };
    detail = tonight.booking
      ? `Sperre bis ${weekdayDayMonth(tonight.booking.departure)}`
      : 'In Beds24 nicht verfügbar';
  }

  let windowText = '—';
  let windowHint: string | undefined;
  if (freeWindow) {
    const nights = `${freeWindow.nights} ${freeWindow.nights === 1 ? 'Nacht' : 'Nächte'}`;
    if (freeWindow.from === today) {
      windowText = `ab heute, ${nights}`;
      windowHint = `bis ${weekdayDayMonth(freeWindow.to)}`;
    } else {
      windowText = shortRange(freeWindow.from, freeWindow.to);
      windowHint = `${nights}, mind. ${freeWindow.minStay}`;
    }
  }

  return (
    <div className="min-w-0 rounded-xl border border-gray-200 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">{slot.name}</h3>
          <p className="mt-0.5 text-sm text-gray-600">{detail}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${pill.className}`}
          style={pill.style}
        >
          {pill.text}
        </span>
      </div>

      {(arrivingToday || leavingToday) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {leavingToday && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-gray-700">
              <LogOut className="w-3.5 h-3.5" />
              Abreise heute · {bookingLabel(leavingToday)}
              {leavingToday.name ? ` · ${leavingToday.name}` : ''}
            </span>
          )}
          {arrivingToday && tonight?.kind === 'booked' && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-gray-700">
              <LogIn className="w-3.5 h-3.5" />
              Anreise heute · {bookingLabel(tonight.booking)}
              {tonight.booking.name ? ` · ${tonight.booking.name}` : ''}
            </span>
          )}
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-400">
            Preis heute Nacht
          </span>
          {minStay !== undefined && (
            <span className="text-xs text-gray-500">
              mind. {minStay} {minStay === 1 ? 'Nacht' : 'Nächte'}
            </span>
          )}
        </div>
        {prices.length === 0 ? (
          <p className="mt-1.5 text-sm text-gray-500">Keine Plattform eingeschaltet</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {prices.map((row) => (
              <div
                key={row.key}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                  taken ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                <span className="text-xs text-gray-500">{row.label}</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    taken ? 'text-gray-400' : 'text-gray-900'
                  }`}
                >
                  {row.price === null ? '—' : euroShort(row.price)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
        <Stat
          label="Diese Woche"
          value={`${week.booked}/${week.nights} belegt`}
          hint={week.blocked > 0 ? `${week.blocked} gesperrt` : undefined}
        />
        <Stat
          label="30 Tage"
          value={next30Pct === null ? '—' : `${next30Pct} % belegt`}
          hint={`${next30.free} Nächte frei`}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-400">
            <CalendarCheck className="w-3 h-3" />
            Buchbar
          </div>
          <div className="mt-0.5 text-sm font-medium text-gray-900 tabular-nums truncate">
            {windowText}
          </div>
          {windowHint && <div className="text-xs leading-snug text-gray-500">{windowHint}</div>}
        </div>
      </div>
    </div>
  );
}
