'use client';

import { FULL_MONTH_NAMES } from './constants';

interface MonthlyOverviewProps {
  year: number;
  getColumnTotal: (month: number) => number;
}

export function MonthlyOverview({ year, getColumnTotal }: MonthlyOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Monatsübersicht {year}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {FULL_MONTH_NAMES.map((monthName, idx) => {
          const monthTotal = getColumnTotal(idx + 1);
          return (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-600">{monthName}</p>
              <p className={`text-lg font-bold ${monthTotal > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                {monthTotal > 0 ? formatCurrency(monthTotal) : '-'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
