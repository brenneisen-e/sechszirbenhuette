'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortColumn, SortDirection } from './types';

interface GuestTableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}

interface ColumnConfig {
  key: SortColumn;
  label: string;
  className?: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'id', label: 'Nr.', className: 'w-16' },
  { key: 'guest_name', label: 'Name' },
  { key: 'arrival_date', label: 'Zeitraum' },
  { key: 'platform', label: 'Kanal' },
  { key: 'rental_price', label: 'Preis', className: 'text-right' },
  { key: 'status', label: 'Status' },
];

export function GuestTableHeader({
  sortColumn,
  sortDirection,
  onSort,
}: GuestTableHeaderProps) {
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    );
  };

  return (
    <thead className="bg-gray-50 sticky top-0">
      <tr>
        {COLUMNS.map((col) => (
          <th
            key={col.key}
            onClick={() => onSort(col.key)}
            className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${col.className ?? ''}`}
          >
            <div className="flex items-center gap-1">
              {col.label}
              {getSortIcon(col.key)}
            </div>
          </th>
        ))}
        <th className="px-4 py-3 w-10" /> {/* Actions column */}
      </tr>
    </thead>
  );
}
