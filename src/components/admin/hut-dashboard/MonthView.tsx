'use client';

import type { CSSProperties } from 'react';

import {
  addDays,
  BLOCKED_STRIPES,
  bookingColor,
  enabledPlatforms,
  monthEnd,
  monthGrid,
  monthStart,
  type NightState,
  occupancy,
  occupancyPct,
  platformInfo,
  platformPrice,
  WEEKDAYS_SHORT,
} from '@/lib/dashboard/hutDashboard';

import { euroShort, type HutSlot } from './api';

// Monatsansicht einer Hütte: Kalender Mo–So. Der Streifen in jeder Kachel
// zeigt links die Nacht davor und rechts die Nacht des Tages — An- und
// Abreisetage sind so geteilt. Darunter die Preise der Plattformen (Handy:
// nur die erste Plattform, Details per Tipp auf den Tag).

interface Props {
  month: string;
  slot: HutSlot;
  today: string;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}

function halfStyle(state: NightState | undefined): CSSProperties {
  if (!state || state.kind === 'free') return {};
  if (state.kind === 'blocked' && !state.booking) return { background: BLOCKED_STRIPES };
  return { background: state.booking ? bookingColor(state.booking) : undefined };
}

export default function MonthView({ month, slot, today, selectedDay, onSelectDay }: Props) {
  const weeks = monthGrid(month);
  const first = monthStart(month);
  const last = monthEnd(month);
  const stats = occupancy(slot.states, first, last);
  const pct = occupancyPct(stats);
  const data = slot.data;
  const platforms = data ? enabledPlatforms(data.config) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-gray-200 bg-gray-50/60 px-3 py-2.5">
        <span className="text-sm font-semibold text-gray-900">{slot.name}</span>
        {data && (
          <span className="text-xs text-gray-500 tabular-nums">
            {pct === null ? 'keine Daten' : `${pct} % belegt`} · {stats.free} Nächte frei
          </span>
        )}
      </div>

      {!data ? (
        <p className="px-3 py-4 text-sm text-red-600">{slot.error || 'Keine Daten'}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS_SHORT.map((label, i) => (
              <div
                key={label}
                className={`py-1.5 text-center text-[11px] ${i >= 5 ? 'text-gray-700' : 'text-gray-400'}`}
              >
                {label}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7">
              {week.map((day, i) => {
                const outside = day < first || day > last;
                const state = slot.states[day];
                const taken = state !== undefined && state.kind !== 'free';
                const isToday = day === today;
                const selected = day === selectedDay;
                const firstPlatform = platforms[0];
                const mobilePrice = firstPlatform
                  ? platformPrice(data.days[day], firstPlatform, data.config.rounding)
                  : null;
                let tone = '';
                if (selected) tone = 'bg-gray-100';
                else if (isToday) tone = 'bg-green-50/70';
                return (
                  <button
                    key={day}
                    onClick={() => onSelectDay(day)}
                    className={`flex min-h-[3.75rem] flex-col border-t border-gray-100 p-1 text-left transition-colors hover:bg-gray-100 sm:min-h-[5.75rem] sm:p-1.5 ${
                      i > 0 ? 'border-l' : ''
                    } ${tone} ${outside ? 'opacity-40' : ''}`}
                  >
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center self-start rounded-full px-1 text-[11px] tabular-nums ${
                        isToday ? 'bg-gray-900 font-semibold text-white' : 'text-gray-700'
                      }`}
                    >
                      {Number(day.slice(8, 10))}
                    </span>
                    <span className="mt-1 flex h-2 w-full overflow-hidden">
                      <span className="w-1/2" style={halfStyle(slot.states[addDays(day, -1)])} />
                      <span className="w-1/2" style={halfStyle(state)} />
                    </span>
                    {/* Handy: nur der Preis der ersten Plattform */}
                    <span
                      className={`mt-1 text-[10px] tabular-nums sm:hidden ${
                        taken ? 'text-gray-300' : 'font-medium text-gray-900'
                      }`}
                    >
                      {mobilePrice === null ? '' : euroShort(mobilePrice).replace(' €', '')}
                    </span>
                    <span className="mt-1 hidden w-full space-y-0.5 sm:block">
                      {platforms.map((setting) => {
                        const price = platformPrice(data.days[day], setting, data.config.rounding);
                        const info = platformInfo(setting.key);
                        return (
                          <span
                            key={setting.key}
                            className="flex items-center justify-between gap-1 text-[10px] leading-tight"
                          >
                            <span className="truncate text-gray-400">{info.short}</span>
                            <span
                              className={`tabular-nums ${taken ? 'text-gray-300' : 'font-medium text-gray-900'}`}
                            >
                              {price === null ? '—' : euroShort(price)}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
