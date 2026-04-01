'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface GermanDateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatToGerman(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '';
  return `${d}.${m}.${y}`;
}

function parseGermanDate(german: string): string {
  const match = german.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  return `${y}-${(m ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // Convert from Sun=0 to Mon=0
  return day === 0 ? 6 : day - 1;
}

export function GermanDateInput({ value, onChange, required, className = '', min, max }: GermanDateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(formatToGerman(value));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    if (value) {
      const d = new Date(value);
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value when external value changes
  useEffect(() => {
    setInputValue(formatToGerman(value));
  }, [value]);

  // Sync calendar month when value changes (only if calendar is closed)
  useEffect(() => {
    if (!isOpen && value) {
      const d = new Date(value);
      setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value, isOpen]);

  // Close calendar on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');

    // Auto-format as user types: DD.MM.YYYY
    // Insert dots automatically after day (2 digits) and month (4 digits)
    let formatted: string;
    if (digitsOnly.length <= 2) {
      formatted = digitsOnly;
      // Auto-add dot after 2-digit day (e.g., "30" → "30.")
      if (digitsOnly.length === 2 && raw.length <= 2) {
        formatted = digitsOnly + '.';
      }
    } else if (digitsOnly.length <= 4) {
      formatted = `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2)}`;
      // Auto-add dot after 2-digit month (e.g., "30.07" → "30.07.")
      if (digitsOnly.length === 4 && !raw.endsWith('.')) {
        formatted += '.';
      }
    } else {
      formatted = `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4, 8)}`;
    }

    setInputValue(formatted);

    // Parse complete date
    if (digitsOnly.length >= 8) {
      const iso = parseGermanDate(formatted);
      if (iso) onChange(iso);
    }
  };

  const handleInputBlur = () => {
    const iso = parseGermanDate(inputValue);
    if (iso) {
      onChange(iso);
      setInputValue(formatToGerman(iso));
    } else if (value) {
      // Reset to last valid value
      setInputValue(formatToGerman(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      setIsOpen(false);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectDate = useCallback((day: number) => {
    const m = (calendarMonth.month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const iso = `${calendarMonth.year}-${m}-${d}`;
    onChange(iso);
    setIsOpen(false);
  }, [calendarMonth, onChange]);

  const prevMonth = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  }, []);

  const nextMonth = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  }, []);

  const isDateDisabled = useCallback((day: number): boolean => {
    const m = (calendarMonth.month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const iso = `${calendarMonth.year}-${m}-${d}`;
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }, [calendarMonth, min, max]);

  const isSelected = useCallback((day: number): boolean => {
    if (!value) return false;
    const parts = value.split('-').map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const d = parts[2] ?? 0;
    return y === calendarMonth.year && m - 1 === calendarMonth.month && d === day;
  }, [value, calendarMonth]);

  const isToday = useCallback((day: number): boolean => {
    const now = new Date();
    return now.getFullYear() === calendarMonth.year &&
      now.getMonth() === calendarMonth.month &&
      now.getDate() === day;
  }, [calendarMonth]);

  const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month);
  const firstDay = getFirstDayOfMonth(calendarMonth.year, calendarMonth.month);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="TT.MM.JJJJ"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          required={required}
          maxLength={10}
          className={className}
        />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-[280px]">
          {/* Month/Year navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isDateDisabled(day);
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => { e.preventDefault(); selectDate(day); }}
                  className={`text-xs py-1.5 rounded-lg transition-colors
                    ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-green-50 cursor-pointer'}
                    ${selected ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                    ${today && !selected ? 'font-bold text-green-700 ring-1 ring-green-300' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const now = new Date();
                const iso = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                onChange(iso);
                setIsOpen(false);
              }}
              className="w-full text-xs text-center text-green-700 hover:bg-green-50 py-1 rounded"
            >
              Heute
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
