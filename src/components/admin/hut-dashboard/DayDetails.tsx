'use client';

import { X } from 'lucide-react';

import {
  addDays,
  bookingColor,
  bookingLabel,
  dayMonth,
  weekdayDayMonth,
} from '@/lib/dashboard/hutDashboard';

import { euroShort, type HutSlot, pricesForNight } from './api';

// Ein Tag im Detail (Tipp auf einen Tag der Woche/des Monats): Belegung mit
// Gast und Zeitraum, alle Plattformpreise, Mindestaufenthalt, Beds24-Preisfelder.

interface Props {
  day: string;
  slots: HutSlot[];
  onClose: () => void;
}

function HutDay({ day, slot }: { day: string; slot: HutSlot }) {
  const data = slot.data;
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="text-sm font-semibold text-gray-900">{slot.name}</div>
        <p className="mt-1 text-sm text-red-600">{slot.error || 'Keine Daten'}</p>
      </div>
    );
  }
  const state = slot.states[day];
  const values = data.days[day];
  const prices = pricesForNight(data, day);
  const taken = state !== undefined && state.kind !== 'free';
  const slots = Object.entries(values?.p ?? {}).sort((a, b) => Number(a[0]) - Number(b[0]));

  let status = 'Frei — buchbar';
  let statusStyle: { background?: string } = {};
  let statusClass = 'bg-green-50 text-green-700';
  if (!state) {
    status = 'Außerhalb des geladenen Zeitraums';
    statusClass = 'bg-gray-50 text-gray-500';
  } else if (state.kind === 'booked') {
    status = `Belegt · ${bookingLabel(state.booking)}`;
    statusStyle = { background: bookingColor(state.booking) };
    statusClass = 'text-gray-800';
  } else if (state.kind === 'blocked') {
    status = 'Gesperrt';
    statusClass = 'bg-red-50 text-red-700';
  }
  const booking = state && state.kind !== 'free' ? state.booking : undefined;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">{slot.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
          style={statusStyle}
        >
          {status}
        </span>
      </div>

      {booking && (
        <p className="mt-2 text-sm text-gray-700">
          {[
            booking.name,
            `${weekdayDayMonth(booking.arrival)} – ${weekdayDayMonth(booking.departure)}`,
            booking.guests ? `${booking.guests} Pers.` : null,
            booking.ical ? 'per iCal' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      <dl className="mt-3 space-y-1.5">
        {prices.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
              {row.label}
            </dt>
            <dd
              className={`tabular-nums ${taken ? 'text-gray-400' : 'font-semibold text-gray-900'}`}
            >
              {row.price === null ? '—' : euroShort(row.price)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-1.5 text-sm">
          <dt className="text-gray-600">Mindestaufenthalt</dt>
          <dd className="tabular-nums text-gray-900">
            {values?.m !== undefined ? `${values.m} ${values.m === 1 ? 'Nacht' : 'Nächte'}` : '—'}
          </dd>
        </div>
      </dl>

      {slots.length > 0 && (
        <p className="mt-2 text-[11px] text-gray-400">
          Beds24:{' '}
          {slots.map(([slotNo, value]) => `Preis ${slotNo}: ${euroShort(value)}`).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function DayDetails({ day, slots, onClose }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {weekdayDayMonth(day)}
          {day.slice(0, 4)}
          <span className="ml-2 font-normal text-gray-400">
            Nacht auf den {dayMonth(addDays(day, 1))}
          </span>
        </h3>
        <button
          onClick={onClose}
          title="Schließen"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className={`grid grid-cols-1 gap-3 ${slots.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {slots.map((slot) => (
          <HutDay key={slot.key} day={day} slot={slot} />
        ))}
      </div>
    </div>
  );
}
