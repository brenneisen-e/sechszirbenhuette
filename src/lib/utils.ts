import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date, locale: string = 'de'): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatPrice(price: number, locale: string = 'de'): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export function calculateNights(arrival: Date, departure: Date): number {
  const diffTime = Math.abs(departure.getTime() - arrival.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
