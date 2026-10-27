'use client';

import { type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Settings2,
} from 'lucide-react';

import {
  addDays,
  addMonths,
  dayRange,
  HUT_ORDER,
  HUT_SHORT_NAMES,
  type HutView,
  isoWeek,
  mondayOf,
  monthEnd,
  monthLabel,
  monthStart,
  nightStates,
  weekLabel,
} from '@/lib/dashboard/hutDashboard';

import { type DashboardLoad, type HutSlot, loadDashboard } from './hut-dashboard/api';
import DayDetails from './hut-dashboard/DayDetails';
import MonthView from './hut-dashboard/MonthView';
import PlatformSettings from './hut-dashboard/PlatformSettings';
import TodayCard from './hut-dashboard/TodayCard';
import WeekView from './hut-dashboard/WeekView';
import { viennaToday } from './price-overview/api';

// Reiter „Portalpreise“ (Bereich Preise): Wie stehen die Hütten heute
// da, was kostet eine Nacht auf Booking.com, FeWo-direkt, Feratel …, und wo
// ist noch etwas frei? Wochenweise oder monatsweise, durchwischen bzw. mit
// den Pfeilen blättern. Im Kopf des Admin Centers lässt sich zwischen der
// eigenen Hütte und beiden Hütten umschalten (HutSwitch).

type Mode = 'week' | 'month';

const MODE_KEY = 'hut_dashboard_mode';
const SWIPE_MIN_PX = 50;

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'month' ? 'month' : 'week';
  } catch {
    return 'week';
  }
}

/** Geladener Zeitraum: ab Wochen- bzw. Monatsanfang, gut 13 Monate */
function loadRange(today: string): { from: string; to: string } {
  const monday = mondayOf(today);
  const first = monthStart(today);
  const from = monday < first ? monday : first;
  return { from, to: addDays(addMonths(today, 13), -1) };
}

interface Props {
  view: HutView;
}

export default function HutDashboard({ view }: Props) {
  const today = useMemo(() => viennaToday(), []);
  const range = useMemo(() => loadRange(today), [today]);
  const reduceMotion = useReducedMotion();

  const [result, setResult] = useState<DashboardLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setModeState] = useState<Mode>('week');
  const [focus, setFocus] = useState(today);
  const [direction, setDirection] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [settingsKey, setSettingsKey] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setModeState(readMode()), []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await loadDashboard(range.from, range.to, view === 'both');
    setLoading(false);
    if (res.error && !res.own) {
      setLoadError(res.error);
      return;
    }
    setLoadError(null);
    setResult(res);
  }, [range, view]);

  useEffect(() => {
    load();
  }, [load]);

  const slots = useMemo<HutSlot[]>(() => {
    if (!result) return [];
    const list: HutSlot[] = [];
    const add = (target: HutSlot['target'], hut: DashboardLoad['own'], fallbackName: string) => {
      if (!hut) return;
      list.push({
        target,
        key: hut.data?.hut ?? target,
        name: hut.data?.name ?? fallbackName,
        data: hut.data,
        error: hut.error,
        states: hut.data ? nightStates(hut.data) : {},
      });
    };
    add('own', result.own, 'Diese Hütte');
    if (view === 'both')
      add('partner', result.partner ?? undefined, result.partnerName ?? 'Partner-Hütte');
    return list.sort((a, b) => HUT_ORDER.indexOf(a.key) - HUT_ORDER.indexOf(b.key));
  }, [result, view]);

  const setMode = (next: Mode) => {
    setModeState(next);
    setDirection(0);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  // Blättern: Woche ±7 Tage, Monat ±1 — nur solange der Zeitraum geladen ist
  const periodStart = mode === 'week' ? mondayOf(focus) : monthStart(focus);
  const periodEnd = mode === 'week' ? addDays(periodStart, 6) : monthEnd(focus);
  const canPrev = addDays(periodStart, -1) >= range.from;
  const canNext = addDays(periodEnd, 1) <= range.to;

  const step = useCallback(
    (dir: 1 | -1) => {
      if ((dir === -1 && !canPrev) || (dir === 1 && !canNext)) return;
      setDirection(dir);
      setFocus((prev) => (mode === 'week' ? addDays(prev, 7 * dir) : addMonths(prev, dir)));
    },
    [canNext, canPrev, mode],
  );

  const goToday = () => {
    setDirection(focus < today ? 1 : -1);
    setFocus(today);
  };

  // Pfeiltasten, solange kein Eingabefeld aktiv ist
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (settingsKey) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsKey, step]);

  // Wischen (nur Touch): waagerecht deutlich mehr als senkrecht
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    step(dx < 0 ? 1 : -1);
  };

  const label =
    mode === 'week'
      ? `KW ${isoWeek(periodStart)} · ${weekLabel(periodStart)}`
      : monthLabel(periodStart);
  const onPeriodToday = today >= periodStart && today <= periodEnd;
  const settingsSlot = slots.find((s) => s.key === settingsKey);
  const offset = reduceMotion ? 0 : 40;

  if (loading && !result) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Lade Portalpreise aus Beds24…</span>
      </div>
    );
  }

  if (loadError && !result) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 py-3 md:space-y-6 md:px-0 md:py-0">
      {/* Heute */}
      <div
        className={`grid grid-cols-1 gap-3 md:gap-4 ${slots.length > 1 ? 'lg:grid-cols-2' : ''}`}
      >
        {slots.map((slot) => (
          <TodayCard key={slot.key} slot={slot} />
        ))}
      </div>

      {/* Steuerung */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => step(-1)}
            disabled={!canPrev}
            title={mode === 'week' ? 'Vorige Woche' : 'Voriger Monat'}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            disabled={onPeriodToday}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Heute
          </button>
          <button
            onClick={() => step(1)}
            disabled={!canNext}
            title={mode === 'week' ? 'Nächste Woche' : 'Nächster Monat'}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 text-sm font-medium text-gray-900 tabular-nums">{label}</span>
          {loading && <Loader2 className="ml-2 w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5" role="tablist">
            {(
              [
                { id: 'week', label: 'Woche', icon: CalendarRange },
                { id: 'month', label: 'Monat', icon: CalendarDays },
              ] as const
            ).map(({ id, label: text, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {text}
              </button>
            ))}
          </div>
          {slots.map((slot) =>
            slot.data ? (
              <button
                key={slot.key}
                onClick={() => setSettingsKey(slot.key)}
                title={`Plattformpreise ${slot.name}`}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {slots.length > 1 ? slot.name : 'Plattformpreise'}
                </span>
                {slots.length > 1 && (
                  <span className="sm:hidden">{HUT_SHORT_NAMES[slot.key] ?? slot.name}</span>
                )}
              </button>
            ) : null,
          )}
          <button
            onClick={load}
            disabled={loading}
            title="Neu laden"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Woche bzw. Monat — wischbar */}
      <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={`${mode}:${periodStart}`}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * offset }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: -dir * offset }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {mode === 'week' ? (
              <WeekView
                days={dayRange(periodStart, periodEnd)}
                slots={slots}
                today={today}
                selectedDay={selectedDay}
                onSelectDay={(day) => setSelectedDay((prev) => (prev === day ? null : day))}
              />
            ) : (
              <div className={`grid grid-cols-1 gap-4 ${slots.length > 1 ? 'xl:grid-cols-2' : ''}`}>
                {slots.map((slot) => (
                  <MonthView
                    key={slot.key}
                    month={periodStart}
                    slot={slot}
                    today={today}
                    selectedDay={selectedDay}
                    onSelectDay={(day) => setSelectedDay((prev) => (prev === day ? null : day))}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {selectedDay && (
        <DayDetails day={selectedDay} slots={slots} onClose={() => setSelectedDay(null)} />
      )}

      <p className="text-xs text-gray-400">
        Preise und Belegung live aus Beds24. Wischen oder Pfeiltasten zum Blättern, Tipp auf einen
        Tag für Details.
      </p>

      {settingsSlot && (
        <PlatformSettings
          slot={settingsSlot}
          previewDay={selectedDay ?? today}
          onClose={() => setSettingsKey(null)}
          onSaved={() => {
            setSettingsKey(null);
            load();
          }}
        />
      )}
    </div>
  );
}
