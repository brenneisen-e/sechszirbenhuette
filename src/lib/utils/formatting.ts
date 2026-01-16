/**
 * Formatting utilities for dates, currency, and text
 * ES2024 optimized with Intl API
 */

// Currency formatter for Euro
const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const euroFormatterNoDecimals = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Date formatters
const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
});

const monthYearFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat('de-DE', {
  numeric: 'auto',
});

/**
 * Format a number as Euro currency
 */
export function formatCurrency(amount: number | null | undefined, showDecimals = true): string {
  if (amount === null || amount === undefined) return '0,00 €';
  return showDecimals
    ? euroFormatter.format(amount)
    : euroFormatterNoDecimals.format(amount);
}

/**
 * Format a date string or Date object
 * Handles German date format (DD.MM.YYYY), ISO format (YYYY-MM-DD), and Date objects
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';

  let d: Date;
  if (typeof date === 'string') {
    // Check for German date format (DD.MM.YYYY)
    const germanMatch = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      d = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return '-';
  return dateFormatter.format(d);
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return dateTimeFormatter.format(d);
}

/**
 * Format a date in short form (dd.mm)
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return shortDateFormatter.format(d);
}

/**
 * Format month and year
 */
export function formatMonthYear(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return monthYearFormatter.format(d);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate nights between two dates (days - 1)
 */
export function nightsBetween(start: string | Date, end: string | Date): number {
  return Math.max(0, daysBetween(start, end));
}

/**
 * Format relative time (e.g., "vor 2 Tagen")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return relativeTimeFormatter.format(diffMinutes, 'minute');
    }
    return relativeTimeFormatter.format(diffHours, 'hour');
  }

  if (Math.abs(diffDays) < 30) {
    return relativeTimeFormatter.format(diffDays, 'day');
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return relativeTimeFormatter.format(diffMonths, 'month');
  }

  const diffYears = Math.round(diffDays / 365);
  return relativeTimeFormatter.format(diffYears, 'year');
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  // Simple formatting - could be enhanced with libphonenumber
  return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
}

/**
 * Parse German date format (dd.mm.yyyy) to Date
 */
export function parseGermanDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
}

/**
 * Get quarter from date (1-4)
 */
export function getQuarter(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(d.getMonth() / 3) + 1;
}

/**
 * Get German month name
 */
export function getGermanMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('de-DE', { month: 'long' });
}
