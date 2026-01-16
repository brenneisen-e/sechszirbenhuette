'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Guest, SortColumn, SortDirection } from '../types';

interface UseGuestFilteringOptions {
  initialSortColumn?: SortColumn;
  initialSortDirection?: SortDirection;
  initialHideCompleted?: boolean;
}

export function useGuestFiltering(
  guests: Guest[],
  options: UseGuestFilteringOptions = {},
) {
  const {
    initialSortColumn = 'arrival_date',
    initialSortDirection = 'desc',
    initialHideCompleted = true,
  } = options;

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hideCompleted, setHideCompleted] = useState(initialHideCompleted);

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    guests.forEach((g) => {
      if (g.arrival_date) {
        years.add(new Date(g.arrival_date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [guests]);

  // Completed count
  const completedCount = useMemo(
    () => guests.filter((g) => g.status === 'completed').length,
    [guests],
  );

  // Filtered and sorted guests
  const filteredGuests = useMemo(() => {
    let result = [...guests];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (g) =>
          g.guest_name?.toLowerCase().includes(search) ||
          g.email?.toLowerCase().includes(search) ||
          g.phone?.includes(search) ||
          g.booking_number?.toLowerCase().includes(search) ||
          g.platform?.toLowerCase().includes(search) ||
          g.address?.toLowerCase().includes(search),
      );
    }

    // Year filter
    if (yearFilter) {
      result = result.filter((g) => {
        if (!g.arrival_date) return false;
        return new Date(g.arrival_date).getFullYear().toString() === yearFilter;
      });
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((g) => g.status === statusFilter);
    }

    // Hide completed
    if (hideCompleted) {
      result = result.filter((g) => g.status !== 'completed');
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'guest_name':
          aVal = a.guest_name?.toLowerCase() ?? '';
          bVal = b.guest_name?.toLowerCase() ?? '';
          break;
        case 'arrival_date':
          aVal = a.arrival_date ?? '';
          bVal = b.arrival_date ?? '';
          break;
        case 'departure_date':
          aVal = a.departure_date ?? '';
          bVal = b.departure_date ?? '';
          break;
        case 'platform':
          aVal = a.platform?.toLowerCase() ?? '';
          bVal = b.platform?.toLowerCase() ?? '';
          break;
        case 'rental_price':
          aVal = a.rental_price ?? 0;
          bVal = b.rental_price ?? 0;
          break;
        case 'status':
          aVal = a.status ?? '';
          bVal = b.status ?? '';
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [guests, searchTerm, yearFilter, statusFilter, hideCompleted, sortColumn, sortDirection]);

  // Handle sort toggle
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('desc');
      }
    },
    [sortColumn],
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setYearFilter('');
    setStatusFilter('');
    setHideCompleted(true);
  }, []);

  return {
    // State
    searchTerm,
    yearFilter,
    statusFilter,
    hideCompleted,
    sortColumn,
    sortDirection,
    // Computed
    filteredGuests,
    availableYears,
    completedCount,
    // Actions
    setSearchTerm,
    setYearFilter,
    setStatusFilter,
    setHideCompleted,
    handleSort,
    clearFilters,
  };
}
