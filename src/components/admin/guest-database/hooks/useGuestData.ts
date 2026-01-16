'use client';

import { useState, useCallback } from 'react';
import type {
  Guest, Email, Task, Booking, GuestCost, RonaldPayment,
  GuestsResponse, EmailsResponse, GuestResponse, BookingsResponse, SetupStatus
} from '../types';

interface UseGuestDataOptions {
  adminPassword: string;
}

export function useGuestData({ adminPassword }: UseGuestDataOptions) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Setup status
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword]);

  // Create new guest
  const createGuest = useCallback(async (guestData: Partial<Guest>): Promise<Guest | null> => {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword]);

  // Delete guest
  const deleteGuest = useCallback(async (guestId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/guests?id=${guestId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
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
  }, [adminPassword]);

  // Update guest status
  const updateGuestStatus = useCallback(async (guestId: number, newStatus: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword]);

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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword, guests]);

  // Check setup status
  const checkSetupStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ action: 'check_setup_status' })
      });
      const data = await response.json() as { success: boolean; status?: SetupStatus };
      if (data.success && data.status) {
        setSetupStatus(data.status);
      }
    } catch (err) {
      console.error('Error checking setup status:', err);
    }
  }, [adminPassword]);

  // Ensure tables exist
  const ensureTablesExist = useCallback(async () => {
    try {
      const checkResponse = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ action: 'check_setup_status' })
      });
      const checkData = await checkResponse.json() as { success: boolean; status?: SetupStatus };

      if (checkData.success && checkData.status && !checkData.status.guestsTableExists) {
        await fetch('/api/admin/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
          },
          body: JSON.stringify({ action: 'migrate_guests_tables' })
        });
      }
    } catch (err) {
      console.error('Error ensuring tables exist:', err);
    }
  }, [adminPassword]);

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
    setupStatus,
    loadGuests,
    saveGuest,
    createGuest,
    deleteGuest,
    updateGuestStatus,
    togglePayment,
    checkSetupStatus,
    ensureTablesExist,
    clearMessages,
  };
}

// Hook for loading emails for a guest
export function useGuestEmails({ adminPassword }: UseGuestDataOptions) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGuestEmails = useCallback(async (guestId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/emails?guest_id=${guestId}`);
      const data = await response.json() as { emails?: Email[] };
      setEmails(data.emails || []);
    } catch (err) {
      console.error('Error loading guest emails:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { emails, setEmails, loading, loadGuestEmails };
}

// Hook for loading tasks for a guest
export function useGuestTasks({ adminPassword }: UseGuestDataOptions) {
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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(taskData)
      });
      const data = await response.json() as { task?: Task };
      return data.task || null;
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  }, [adminPassword]);

  const updateTask = useCallback(async (taskData: Partial<Task> & { id: number }): Promise<Task | null> => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword, tasks]);

  const deleteTask = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      await fetch(`/api/admin/tasks?id=${taskId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
      });
      setTasks(tasks.filter(t => t.id !== taskId));
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  }, [adminPassword, tasks]);

  return { tasks, setTasks, loading, loadGuestTasks, createTask, updateTask, deleteTask };
}

// Hook for loading bookings for a guest
export function useGuestBookings({ adminPassword }: UseGuestDataOptions) {
  const [bookings, setBookings] = useState<Record<number, Booking[]>>({});
  const [ronaldPayments, setRonaldPayments] = useState<Record<number, RonaldPayment[]>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const loadGuestBookings = useCallback(async (guestId: number) => {
    setLoadingIds(prev => new Set(prev).add(guestId));
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/bookings?guest_id=${guestId}`),
        fetch(`/api/admin/ronald-payments?guestId=${guestId}`)
      ]);

      const bookingsData = await bookingsRes.json() as BookingsResponse;
      if (bookingsData.bookings) {
        setBookings(prev => ({ ...prev, [guestId]: bookingsData.bookings || [] }));
      }

      const paymentsData = await paymentsRes.json() as { payments?: RonaldPayment[] };
      if (paymentsData.payments) {
        setRonaldPayments(prev => ({ ...prev, [guestId]: paymentsData.payments || [] }));
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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword]);

  return {
    bookings,
    ronaldPayments,
    loadingIds,
    loadGuestBookings,
    createBooking,
    setBookings,
    setRonaldPayments,
  };
}

// Hook for loading guest costs
export function useGuestCosts({ adminPassword }: UseGuestDataOptions) {
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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
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
  }, [adminPassword]);

  const deleteCost = useCallback(async (costId: number): Promise<boolean> => {
    try {
      await fetch(`/api/admin/guest-costs?id=${costId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
      });
      setCosts(costs.filter(c => c.id !== costId));
      return true;
    } catch (err) {
      console.error('Error deleting cost:', err);
      return false;
    }
  }, [adminPassword, costs]);

  return { costs, setCosts, loading, loadGuestCosts, createCost, deleteCost };
}
