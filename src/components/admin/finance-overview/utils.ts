// Utility functions for FinanceOverview

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
};

export const getAvailableYears = (allGuests: { arrival_date: string | null }[]): number[] => {
  const years = new Set<number>();
  allGuests.forEach((g) => {
    if (g.arrival_date) {
      years.add(new Date(g.arrival_date).getFullYear());
    }
  });
  years.add(new Date().getFullYear());
  years.add(new Date().getFullYear() + 1);
  return Array.from(years).sort((a, b) => b - a);
};

export const getPlatformDisplay = (platform: string | null): { name: string; classes: string } => {
  if (!platform) return { name: '-', classes: 'bg-gray-100 text-gray-800' };
  const lower = platform.toLowerCase();

  if (lower.includes('booking')) {
    return { name: 'Booking.com', classes: 'bg-blue-100 text-blue-800' };
  }
  if (lower.includes('fewo') || lower.includes('vrbo')) {
    return { name: 'FeWo', classes: 'bg-orange-100 text-orange-800' };
  }
  if (lower.includes('feratel')) {
    return { name: 'Feratel', classes: 'bg-yellow-100 text-yellow-800' };
  }
  if (lower.includes('airbnb')) {
    return { name: 'Airbnb', classes: 'bg-pink-100 text-pink-800' };
  }
  if (lower === 'mail' || lower === 'direkt' || lower === 'telefon' || lower === 'e-mail') {
    return { name: 'Mail', classes: 'bg-green-100 text-green-800' };
  }
  return { name: platform, classes: 'bg-gray-100 text-gray-800' };
};

export const getPlatformBadge = (platform: string | null): React.ReactElement => {
  const { name, classes } = getPlatformDisplay(platform);
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${classes}`}>{name}</span>;
};

// Need React for JSX
import React from 'react';
