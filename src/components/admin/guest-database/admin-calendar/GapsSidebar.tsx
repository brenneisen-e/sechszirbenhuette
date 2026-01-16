'use client';

import { AlertTriangle } from 'lucide-react';

interface Gap {
  start: Date;
  end: Date;
  days: number;
}

interface GapsSidebarProps {
  gaps: Gap[];
}

export function GapsSidebar({ gaps }: GapsSidebarProps) {
  return (
    <div className="w-full lg:w-72 bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
        Unbelegte Zeiträume
      </h4>
      {gaps.length === 0 ? (
        <p className="text-sm text-gray-500">Keine Lücken von 3+ Tagen gefunden</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:max-h-[600px] lg:overflow-y-auto">
          {gaps.map((gap, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-medium text-amber-900">
                  {gap.start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  {' - '}
                  {gap.end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="text-xs bg-amber-200 text-amber-800 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">{gap.days} Tage</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
