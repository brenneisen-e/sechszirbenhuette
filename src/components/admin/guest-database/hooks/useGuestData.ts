'use client';

import { useState, useCallback } from 'react';
import type {
  Guest, Task, Booking, GuestCost, BankPayment,
  GuestsResponse, GuestResponse, BookingsResponse
} from '../types';

interface UseGuestDataOptions {
}

export function useGuestData({}: UseGuestDataOptions) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load guests with optional filters
  const loadGuests = useCallback(async (filters?: { year?: string; status?: string; search?: string }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters?.year) params.append('year', filters.year);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/guests?${params.toString()}`);
      const data = await response.json() as GuestsResponse;

      if (data.error) {
        setError(data.error);
      } else {
        setGuests(data.guests || []);
      }
    } catch (err) {
      setError('Fehler beim Laden der Gäste');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save guest changes
  const saveGuest = useCallback(async (guest: Guest): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guest)
      });

      const data = await response.json() as GuestResponse;
      if (data.error) {
        setError(`Fehler: ${data.error}`);
        return false;
      } else if (data.guest) {
        setSuccess('Gast erfolgreich aktualisiert');
        return true;
      }
      return false;
    } catch (err) {
      setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
      return false;
    }
  }, []);

  // Create new guest
  const createGuest = useCallback(async (guestData: Partial<Guest>): Promise<Guest | null> => {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData)
      });

      const data = await response.json() as { guest?: Guest; error?: string };
      if (data.error) {
        setError(data.error);
        return null;
      }
      setSuccess('Neuer Gast erfolgreich angelegt');
      return data.guest || null;
    } catch (err) {
      setError('Fehler beim Erstellen');
      console.error(err);
      return null;
    }
  }, []);

  // Delete guest
  const deleteGuest = useCallback(async (guestId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/guests?id=${guestId}`, {
        method: 'DELETE',
        });

      const data = await response.json() as { error?: string; success?: boolean };
      if (data.error) {
        setError(data.error);
        return false;
      }
      setSuccess('Gast erfolgreich gelöscht');
      return true;
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
      return false;
    }
  }, []);

  // Update guest status
  const updateGuestStatus = useCallback(async (guestId: number, newStatus: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guestId, status: newStatus })
      });

      const data = await response.json() as GuestResponse;
      if (data.error) {
        setError(`Fehler: ${data.error}`);
        return false;
      }
      return true;
    } catch (err) {
      setError('Fehler beim Aktualisieren des Status');
      console.error(err);
      return false;
    }
  }, []);

  // Toggle payment status
  const togglePayment = useCallback(async (
    guestId: number,
    paymentType: 'deposit' | 'final',
    isPaid: boolean
  ): Promise<boolean> => {
    try {
      const updateField = paymentType === 'deposit' ? 'deposit_paid' : 'final_payment_paid';

      const response = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guestId, [updateField]: isPaid ? 1 : 0 })
      });

      const data = await response.json() as GuestResponse;
      if (data.error) {
        setError(`Fehler: ${data.error}`);
        return false;
      }

      // Update local state
      setGuests(guests.map(g =>
        g.id === guestId ? { ...g, [updateField]: isPaid ? 1 : 0 } : g
      ));

      setSuccess(isPaid ? 'Zahlung als bezahlt markiert' : 'Zahlung als offen markiert');
      return true;
    } catch (err) {
      setError('Fehler beim Aktualisieren der Zahlung');
      console.error(err);
      return false;
    }
  }, [guests]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    guests,
    setGuests,
    loading,
    error,
    setError,
    success,
    setSuccess,
    loadGuests,
    saveGuest,
    createGuest,
    deleteGuest,
    updateGuestStatus,
    togglePayment,
    clearMessages,
  };
}

// Hook for loading tasks for a guest
export function useGuestTasks({}: UseGuestDataOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGuestTasks = useCallback(async (guestId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tasks?guest_id=${guestId}`);
      const data = await response.json() as { tasks?: Task[] };
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error loading guest tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await response.json() as { task?: Task };
      return data.task || null;
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (taskData: Partial<Task> & { id: number }): Promise<Task | null> => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await response.json() as { task?: Task };
      if (data.task) {
        setTasks(tasks.map(t => t.id === data.task!.id ? data.task! : t));
      }
      return data.task || null;
    } catch (err) {
      console.error('Error updating task:', err);
      return null;
    }
  }, [tasks]);

  const deleteTask = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      await fetch(`/api/admin/tasks?id=${taskId}`, {
        method: 'DELETE',
        });
      setTasks(tasks.filter(t => t.id !== taskId));
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  }, [tasks]);

  return { tasks, setTasks, loading, loadGuestTasks, createTask, updateTask, deleteTask };
}

// Hook for loading bookings for a guest
export function useGuestBookings({}: UseGuestDataOptions) {
  const [bookings, setBookings] = useState<Record<number, Booking[]>>({});
  const [bankPayments, setBankPayments] = useState<Record<number, BankPayment[]>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const loadGuestBookings = useCallback(async (guestId: number) => {
    setLoadingIds(prev => new Set(prev).add(guestId));
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/bookings?guest_id=${guestId}`),
        fetch(`/api/admin/bank-transactions?guestId=${guestId}`)
      ]);

      const bookingsData = await bookingsRes.json() as BookingsResponse;
      if (bookingsData.bookings) {
        setBookings(prev => ({ ...prev, [guestId]: bookingsData.bookings || [] }));
      }

      const paymentsData = await paymentsRes.json() as { payments?: BankPayment[] };
      if (paymentsData.payments) {
        setBankPayments(prev => ({ ...prev, [guestId]: paymentsData.payments || [] }));
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(guestId);
        return newSet;
      });
    }
  }, []);

  const createBooking = useCallback(async (guestId: number, bookingData: Partial<Booking>): Promise<Booking | null> => {
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingData, guest_id: guestId })
      });

      const data = await response.json() as { booking?: Booking; error?: string };
      if (data.booking) {
        setBookings(prev => ({
          ...prev,
          [guestId]: [data.booking!, ...(prev[guestId] || [])]
        }));
        return data.booking;
      }
      return null;
    } catch (err) {
      console.error('Error creating booking:', err);
      return null;
    }
  }, []);

  return {
    bookings,
    bankPayments,
    loadingIds,
    loadGuestBookings,
    createBooking,
    setBookings,
    setBankPayments,
  };
}

// Hook for loading guest costs
export function useGuestCosts({}: UseGuestDataOptions) {
  const [costs, setCosts] = useState<GuestCost[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGuestCosts = useCallback(async (guestId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/guest-costs?guest_id=${guestId}`);
      const data = await response.json() as { costs?: GuestCost[] };
      setCosts(data.costs || []);
    } catch (err) {
      console.error('Error loading guest costs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCost = useCallback(async (costData: Partial<GuestCost>): Promise<GuestCost | null> => {
    try {
      const response = await fetch('/api/admin/guest-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costData)
      });
      const data = await response.json() as { cost?: GuestCost };
      if (data.cost) {
        setCosts(prev => [...prev, data.cost!]);
      }
      return data.cost || null;
    } catch (err) {
      console.error('Error creating cost:', err);
      return null;
    }
  }, []);

  const deleteCost = useCallback(async (costId: number): Promise<boolean> => {
    try {
      await fetch(`/api/admin/guest-costs?id=${costId}`, {
        method: 'DELETE',
        });
      setCosts(costs.filter(c => c.id !== costId));
      return true;
    } catch (err) {
      console.error('Error deleting cost:', err);
      return false;
    }
  }, [costs]);

  return { costs, setCosts, loading, loadGuestCosts, createCost, deleteCost };
}
