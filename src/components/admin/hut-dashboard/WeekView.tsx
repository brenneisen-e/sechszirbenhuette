'use client';

import { Fragment } from 'react';

import {
  BLOCKED_STRIPES,
  bookingColor,
  bookingLabel,
  dayMonth,
  enabledPlatforms,
  platformInfo,
  platformPrice,
  stayBars,
  weekdayDayMonth,
  weekdayIndex,
  WEEKDAYS_SHORT,
} from '@/lib/dashboard/hutDashboard';

import { euroShort, type HutSlot } from './api';

// Wochenansicht: sieben Tage nebeneinander, je Hütte eine Belegungszeile
// (Balken von Anreise- bis Abreisetag, jeweils ab Tagesmitte) und darunter
// eine Zeile je Plattform mit dem Preis der Nacht. Belegte Nächte grau.

// Handy: Zeilenbeschriftung als eigene Zeile über den sieben Tagen,
// ab md eine Spalte links
const GRID = 'grid grid-cols-7 md:grid-cols-[10rem_repeat(7,minmax(0,1fr))]';

interface Props {
  days: string[];
  slots: HutSlot[];
  today: string;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}

function RowLabel({ label, short, color }: { label: string; short?: string; color?: string }) {
  return (
    <div className="col-span-7 md:col-span-1 flex items-center gap-2 px-3 pt-2 md:py-2 text-[11px] md:text-xs text-gray-500 md:border-r md:border-gray-100">
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span className="md:hidden">{short ?? label}</span>
      <span className="hidden md:inline truncate">{label}</span>
    </div>
  );
}

function cellTone(day: string, today: string, selectedDay: string | null): string {
  if (day === selectedDay) return 'bg-gray-100';
  if (day === today) return 'bg-green-50/70';
  return '';
}

function OccupancyRow({
  slot,
  days,
  today,
  selectedDay,
}: Omit<Props, 'slots' | 'onSelectDay'> & { slot: HutSlot }) {
  const bars = stayBars(days, slot.states);
  return (
    <div className="col-span-7 relative h-10">
      <div className="absolute inset-0 grid grid-cols-7">
        {days.map((day) => (
          <div
            key={day}
            className={`border-l border-gray-100 first:border-l-0 ${cellTone(day, today, selectedDay)}`}
          />
        ))}
      </div>
      <div className="absolute inset-0 grid grid-cols-[repeat(14,minmax(0,1fr))] items-stretch py-1.5">
        {bars.map((bar) => {
          const label = bar.booking
            ? [bookingLabel(bar.booking), bar.booking.name].filter(Boolean).join(' · ')
            : 'Gesperrt';
          const title = bar.booking
            ? `${label} · ${dayMonth(bar.booking.arrival)} – ${dayMonth(bar.booking.departure)}${
                bar.booking.guests ? ` · ${bar.booking.guests} Pers.` : ''
              }`
            : 'In Beds24 gesperrt';
          return (
            <div
              key={bar.id}
              title={title}
              className={`relative mx-px flex items-center overflow-hidden px-1.5 text-[11px] font-medium text-gray-800 ${
                bar.clippedStart ? 'rounded-l-none' : 'rounded-l-md'
              } ${bar.clippedEnd ? 'rounded-r-none' : 'rounded-r-md'}`}
              style={{
                gridColumn: `${bar.start} / ${bar.end}`,
                background: bar.booking ? bookingColor(bar.booking) : BLOCKED_STRIPES,
              }}
            >
              {bar.booking && <span className="truncate">{label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WeekView({ days, slots, today, selectedDay, onSelectDay }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Kopfzeile mit den Tagen */}
      <div className={`${GRID} border-b border-gray-200 bg-gray-50/60`}>
        <div className="hidden md:block md:border-r md:border-gray-100" />
        {days.map((day) => {
          const isToday = day === today;
          const weekend = weekdayIndex(day) >= 5;
          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              title={weekdayDayMonth(day)}
              className={`flex flex-col items-center py-2 transition-colors hover:bg-gray-100 ${cellTone(day, today, selectedDay)}`}
            >
              <span className={`text-[11px] ${weekend ? 'text-gray-700' : 'text-gray-400'}`}>
                {WEEKDAYS_SHORT[weekdayIndex(day)]}
              </span>
              <span
                className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums ${
                  isToday ? 'bg-gray-900 font-semibold text-white' : 'text-gray-900'
                }`}
              >
                {dayMonth(day)}
              </span>
            </button>
          );
        })}
      </div>

      {slots.map((slot, slotIndex) => (
        <section
          key={slot.key}
          className={slotIndex > 0 ? 'border-t-4 border-gray-100' : ''}
          aria-label={slot.name}
        >
          <div className={GRID}>
            <div className="col-span-7 md:col-span-8 flex items-center justify-between bg-white px-3 pt-3 pb-1">
              <span className="text-sm font-semibold text-gray-900">{slot.name}</span>
              {slot.data && (
                <span className="text-[11px] text-gray-400 truncate ml-3">
                  {slot.data.roomName}
                </span>
              )}
            </div>
          </div>

          {!slot.data ? (
            <p className="px-3 pb-4 pt-1 text-sm text-red-600">{slot.error || 'Keine Daten'}</p>
          ) : (
            <div className={GRID}>
              <RowLabel label="Belegung" />
              <OccupancyRow slot={slot} days={days} today={today} selectedDay={selectedDay} />

              {enabledPlatforms(slot.data.config).map((setting) => {
                const info = platformInfo(setting.key);
                const data = slot.data;
                if (!data) return null;
                return (
                  <Fragment key={setting.key}>
                    <RowLabel label={info.label} short={info.short} color={info.color} />
                    {days.map((day, i) => {
                      const price = platformPrice(data.days[day], setting, data.config.rounding);
                      const taken =
                        slot.states[day] !== undefined && slot.states[day]?.kind !== 'free';
                      return (
                        <button
                          key={day}
                          onClick={() => onSelectDay(day)}
                          className={`${i > 0 ? 'border-l border-gray-100' : ''} py-2 text-center text-xs md:text-sm tabular-nums transition-colors hover:bg-gray-100 ${cellTone(
                            day,
                            today,
                            selectedDay,
                          )} ${taken ? 'text-gray-300' : 'font-medium text-gray-900'}`}
                        >
                          {price === null ? '—' : euroShort(price)}
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}

              <RowLabel label="Mindestaufenthalt" short="mind. Nächte" />
              {days.map((day, i) => {
                const minStay = slot.data?.days[day]?.m;
                return (
                  <button
                    key={day}
                    onClick={() => onSelectDay(day)}
                    className={`${i > 0 ? 'border-l border-gray-100' : ''} pt-1 pb-2.5 md:py-2 text-center text-xs tabular-nums text-gray-500 transition-colors hover:bg-gray-100 ${cellTone(
                      day,
                      today,
                      selectedDay,
                    )}`}
                  >
                    {minStay ?? '—'}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
