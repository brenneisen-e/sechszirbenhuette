// Constants for FinanceOverview

export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export const QUARTER_LABELS = ['Q1 (Jan-Mär)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Okt-Dez)'];

// Helper to get quarter from month (0-based)
export function getQuarterFromMonth(month: number): number {
  return Math.floor(month / 3);
}

// Helper to get months in a quarter
export function getMonthsInQuarter(quarter: number): number[] {
  const start = quarter * 3;
  return [start, start + 1, start + 2];
}
