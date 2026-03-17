'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, ChevronDown, ChevronUp,
  RefreshCw, X, Check, AlertCircle,
  Loader2, Filter, Plus, Save,
  ArrowUpDown, ArrowUp, ArrowDown,
  ListTodo, CalendarDays, LayoutGrid, List, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { calculateUtilityCostsForBooking } from './UtilityCostsCalculator';
import type { PricingSettings } from './utility-costs';
import { DEFAULT_PRICING } from './utility-costs';

// Import from modular guest-database
import {
  // Types
  type Guest,
  type Task,
  type Booking,
  type GuestCost,
  type BankPayment,
  type GuestDocument,
  type GuestNote,
  type SortColumn,
  type SortDirection,
  type GuestProfileTab,
  type GuestsResponse,
  type GuestResponse,
  type BookingsResponse,
  // Constants
  STANDARD_TASKS,
  // Components
  AdminCalendar,
  GuestEditModal,
  CreateGuestModal,
  AllTasksView,
  GuestTableRow,
  BookingCard,
  // Helpers
  sortGuests,
  getEffectiveStatus,
  getEffectiveBookingStatus,
} from './guest-database';
import { BookingWizard } from './guest-database/BookingWizard';

interface GuestDatabaseProps {
  adminPassword: string;
  onDataLoaded?: () => void;
  demoMode?: boolean;
}

export default function GuestDatabase({ adminPassword, onDataLoaded, demoMode = false }: GuestDatabaseProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View state (guests table vs calendar vs tasks)
  const [activeView, setActiveView] = useState<'guests' | 'calendar' | 'tasks'>('guests');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedGuestId, setSelectedGuestId] = useState<number | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hideCompleted, setHideCompleted] = useState(true);

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('arrival_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Edit modal state
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Create new guest modal state
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);


  // Task state (for individual guest)
  const [guestTasks, setGuestTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // All tasks state (for tasks overview tab)
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loadingAllTasks, setLoadingAllTasks] = useState(false);

  // Guest costs state
  const [guestCosts, setGuestCosts] = useState<GuestCost[]>([]);
  const [loadingCosts, setLoadingCosts] = useState(false);

  // Pricing settings for consistent calculations
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);



  // Expanded row state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Guest profile tab state
  const [guestProfileTab, setGuestProfileTab] = useState<GuestProfileTab>('overview');

  // Guest documents state
  const [guestDocuments, setGuestDocuments] = useState<GuestDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Guest notes state
  const [guestNotes, setGuestNotes] = useState<Record<number, GuestNote[]>>({});
  const [loadingNotes, setLoadingNotes] = useState<Set<number>>(new Set());

  // Bookings state - stores bookings per guest
  const [guestBookings, setGuestBookings] = useState<Record<number, Booking[]>>({});
  const [guestBankPayments, setGuestBankPayments] = useState<Record<number, BankPayment[]>>({});
  const [loadingBookings, setLoadingBookings] = useState<Set<number>>(new Set());
  const [allBookingsLoaded, setAllBookingsLoaded] = useState(false);
  const [addingBookingForGuest, setAddingBookingForGuest] = useState<number | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);



  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Local Storage Cache Keys
  const CACHE_KEY_GUESTS = 'sechszirben_guests_cache';
  const CACHE_KEY_TIMESTAMP = 'sechszirben_guests_timestamp';
  const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 Minuten

  // Helper: Gäste aus Local Storage laden
  const loadGuestsFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_GUESTS);
      const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < CACHE_MAX_AGE) {
          return JSON.parse(cached) as Guest[];
        }
      }
    } catch (e) {
      console.error('Error reading from cache:', e);
    }
    return null;
  }, []);

  // Helper: Gäste in Local Storage speichern
  const saveGuestsToCache = useCallback((guestsData: Guest[]) => {
    try {
      localStorage.setItem(CACHE_KEY_GUESTS, JSON.stringify(guestsData));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
    } catch (e) {
      console.error('Error saving to cache:', e);
    }
  }, []);

  // Cache aktualisieren wenn sich Gäste ändern (nach API-Updates)
  useEffect(() => {
    if (guests.length > 0 && !loading && !yearFilter && !searchTerm) {
      saveGuestsToCache(guests);
    }
  }, [guests, loading, yearFilter, searchTerm, saveGuestsToCache]);

  // Load guests (mit Local Storage Cache)
  // HINWEIS: statusFilter wird NICHT an die API gesendet, da der DB-Status
  // nicht dem effektiven Status entspricht. Status wird client-seitig gefiltert
  // basierend auf getGuestEffectiveStatus() (abgeleitet aus Buchungen).
  const loadGuests = useCallback(async (forceRefresh = false) => {
    // Bei Tab-Wechsel erst aus Cache laden (wenn keine Filter aktiv)
    if (!forceRefresh && !yearFilter && !searchTerm) {
      const cachedGuests = loadGuestsFromCache();
      if (cachedGuests && cachedGuests.length > 0) {
        setGuests(cachedGuests);
        // Trotzdem im Hintergrund aktualisieren
        if (!initialLoadDone) {
          setInitialLoadDone(true);
          onDataLoaded?.();
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      let url = '/api/admin/guests?';
      const params = new URLSearchParams();
      if (yearFilter) params.append('year', yearFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(url + params.toString(), {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as GuestsResponse;

      if (data.error) {
        setError(data.error);
      } else {
        const newGuests = data.guests || [];
        setGuests(newGuests);
        // Cache nur wenn keine Filter aktiv sind (vollständige Daten)
        if (!yearFilter && !searchTerm) {
          saveGuestsToCache(newGuests);
        }
      }
    } catch (err) {
      setError('Fehler beim Laden der Gäste');
      console.error(err);
    } finally {
      setLoading(false);
      // Call onDataLoaded callback on first successful load
      if (!initialLoadDone) {
        setInitialLoadDone(true);
        onDataLoaded?.();
      }
    }
  }, [yearFilter, searchTerm, initialLoadDone, onDataLoaded, loadGuestsFromCache, saveGuestsToCache]);

  // Load all bookings at once (for display in table)
  const loadAllBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/bookings', {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { bookings: Booking[]; error?: string };

      if (data.bookings) {
        // Group bookings by guest_id
        const bookingsByGuest: Record<number, Booking[]> = {};
        for (const booking of data.bookings) {
          if (!bookingsByGuest[booking.guest_id]) {
            bookingsByGuest[booking.guest_id] = [];
          }
          bookingsByGuest[booking.guest_id].push(booking);
        }
        setGuestBookings(bookingsByGuest);
        setAllBookingsLoaded(true);
      }
    } catch (err) {
      console.error('Error loading all bookings:', err);
    }
  }, []);

  // Get the latest (newest) booking for a guest - only from bookings table (authoritative source)
  const getLatestBooking = useCallback((guest: Guest): { arrival: string | null; departure: string | null } => {
    const bookings = guestBookings[guest.id] || [];

    const validBookings = bookings
      .filter(b => b.arrival_date)
      .sort((a, b) => {
        const dateA = new Date(a.arrival_date!).getTime();
        const dateB = new Date(b.arrival_date!).getTime();
        return dateB - dateA;
      });

    if (validBookings.length === 0) {
      return { arrival: null, departure: null };
    }

    return { arrival: validBookings[0].arrival_date, departure: validBookings[0].departure_date };
  }, [guestBookings]);

  // Calculate effective status - delegates to shared utility in helpers.ts
  // Legacy-Gäste ohne Buchungen: Nutze die Gastdaten als Fallback
  const getGuestEffectiveStatus = useCallback((guest: Guest): string => {
    const bookings = guestBookings[guest.id] || [];
    if (bookings.length === 0 && guest.departure_date) {
      // Legacy-Gast ohne Einträge in bookings-Tabelle — Status aus Gastdaten ableiten
      return getEffectiveBookingStatus(guest.status, guest.departure_date, guest.arrival_date);
    }
    return getEffectiveStatus(guest.status, bookings);
  }, [guestBookings]);

  // Load all open tasks for the tasks overview
  const loadAllTasks = useCallback(async () => {
    setLoadingAllTasks(true);
    try {
      const response = await fetch('/api/admin/tasks', {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { tasks: Task[]; error?: string };

      if (data.error) {
        console.error('Error loading tasks:', data.error);
      } else {
        setAllTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error loading all tasks:', err);
    } finally {
      setLoadingAllTasks(false);
    }
  }, []);

  // Load pricing settings for consistent financial calculations
  const loadPricingSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { settings?: Record<string, string> };
      if (data.settings) {
        // Parse kurtaxeRates from database (same as ExpensePanel)
        let kurtaxeRates = DEFAULT_PRICING.kurtaxeRates;
        if (data.settings.kurtaxe_rates) {
          try {
            const parsed = JSON.parse(data.settings.kurtaxe_rates);
            if (Array.isArray(parsed)) {
              kurtaxeRates = parsed.map((r: { from: string; to: string; rate: number }) => ({
                from: r.from,
                to: r.to,
                rate: r.rate,
              }));
            }
          } catch (e) {
            console.error('Error parsing kurtaxe_rates:', e);
          }
        }

        setPricing({
          ...DEFAULT_PRICING,
          kurtaxe: parseFloat(data.settings.kurtaxe_rate) || DEFAULT_PRICING.kurtaxe,
          kurtaxeRates: kurtaxeRates,
          holz: parseFloat(data.settings.holz_rate) || DEFAULT_PRICING.holz,
          water: parseFloat(data.settings.water_rate) || DEFAULT_PRICING.water,
          trash: parseFloat(data.settings.trash_rate) || DEFAULT_PRICING.trash,
          electricity: parseFloat(data.settings.electricity_rate) || DEFAULT_PRICING.electricity,
          reinigung: parseFloat(data.settings.reinigung_rate) || DEFAULT_PRICING.reinigung,
        });
      }
    } catch (err) {
      console.error('Error loading pricing settings:', err);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await loadGuests();
      await loadAllBookings();
      await loadPricingSettings();
    };
    initializeData();
  }, [loadGuests, loadAllBookings, loadPricingSettings]);

  // Load all tasks when switching to tasks view
  useEffect(() => {
    if (activeView === 'tasks') {
      loadAllTasks();
    }
  }, [activeView, loadAllTasks]);

  // Load bookings and bank payments for a guest
  const loadGuestBookings = async (guestId: number) => {
    setLoadingBookings(prev => new Set(prev).add(guestId));
    try {
      // Load bookings and bank payments in parallel
      const [bookingsRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/bookings?guest_id=${guestId}`, {
          headers: { 'x-admin-password': adminPassword }
        }),
        fetch(`/api/admin/bank-transactions?guestId=${guestId}`, {
          headers: { 'x-admin-password': adminPassword }
        })
      ]);

      const bookingsData = await bookingsRes.json() as BookingsResponse;
      if (bookingsData.bookings) {
        setGuestBookings(prev => ({ ...prev, [guestId]: bookingsData.bookings || [] }));
      }

      const paymentsData = await paymentsRes.json() as { payments?: BankPayment[] };
      if (paymentsData.payments) {
        setGuestBankPayments(prev => ({ ...prev, [guestId]: paymentsData.payments || [] }));
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoadingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(guestId);
        return newSet;
      });
    }
  };

  // Save booking (create new or update existing)
  const saveBooking = async (
    bookingData: Partial<Booking> & { id: number },
    uploadedFile?: File,
    guestUpdates?: { address?: string }
  ) => {
    setIsSavingBooking(true);
    const isNewBooking = !bookingData.id || bookingData.id === 0;
    try {
      // Create or update booking in bookings table
      const response = await fetch('/api/admin/bookings', {
        method: isNewBooking ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(isNewBooking ? { ...bookingData, guest_id: addingBookingForGuest } : bookingData)
      });

      const data = await response.json() as { booking?: Booking; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.booking) {
        const guestId = data.booking.guest_id;

        // Upload document if file was analyzed
        if (uploadedFile && guestId) {
          try {
            const docType = uploadedFile.type.includes('pdf') ? 'booking_pdf' : 'screenshot';
            const formData = new FormData();
            formData.append('file', uploadedFile);
            formData.append('guestId', guestId.toString());
            formData.append('bookingId', data.booking.id.toString());
            formData.append('documentType', docType);
            formData.append('description', `Buchung #${data.booking.booking_number || data.booking.id} - Importiert am ${new Date().toLocaleDateString('de-DE')}`);

            const docResponse = await fetch('/api/admin/guest-documents', {
              method: 'POST',
              headers: { 'x-admin-password': adminPassword },
              body: formData
            });
            const docResult = await docResponse.json() as { success?: boolean; r2_key?: string; id?: number };

            // Update booking with document reference
            if (docResult.success && docResult.r2_key) {
              const additionalCosts = data.booking.additional_costs ? JSON.parse(data.booking.additional_costs) : {};
              additionalCosts.document = {
                r2_key: docResult.r2_key,
                filename: uploadedFile.name,
                type: uploadedFile.type,
                uploaded_at: new Date().toISOString()
              };
              // Update booking with document info
              await fetch('/api/admin/bookings', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-password': adminPassword
                },
                body: JSON.stringify({
                  id: data.booking.id,
                  additional_costs: JSON.stringify(additionalCosts)
                })
              });
              // Update local booking data
              data.booking.additional_costs = JSON.stringify(additionalCosts);
            }
          } catch (e) {
            console.error('Error uploading document:', e);
          }
        }

        // Update guest if new info was extracted (e.g., address)
        if (guestUpdates && Object.keys(guestUpdates).length > 0 && guestId) {
          try {
            await fetch('/api/admin/guests', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPassword
              },
              body: JSON.stringify({ id: guestId, ...guestUpdates })
            });

            // Update local guest state if address was updated
            if (guestUpdates.address) {
              setGuests(prev => prev.map(g =>
                g.id === guestId ? { ...g, address: guestUpdates.address || g.address } : g
              ));
            }
          } catch (e) {
            console.error('Error updating guest:', e);
          }
        }

        // Update in local state
        if (isNewBooking) {
          // Add new booking to state
          const guestId = data.booking.guest_id;
          setGuestBookings(prev => ({
            ...prev,
            [guestId]: [data.booking!, ...(prev[guestId] || [])]
          }));
          setSuccess('Buchung erfolgreich erstellt');
          setAddingBookingForGuest(null);
        } else {
          // Update existing booking
          setGuestBookings(prev => {
            const updated = { ...prev };
            for (const gId of Object.keys(updated)) {
              const bookings = updated[Number(gId)];
              const idx = bookings.findIndex(b => b.id === bookingData.id);
              if (idx >= 0) {
                updated[Number(gId)] = [
                  ...bookings.slice(0, idx),
                  data.booking!,
                  ...bookings.slice(idx + 1)
                ];
                break;
              }
            }
            return updated;
          });
          setSuccess('Buchung erfolgreich aktualisiert');
        }
        setEditingBooking(null);
      }
    } catch (err) {
      setError('Fehler beim Speichern der Buchung');
      console.error(err);
    } finally {
      setIsSavingBooking(false);
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: bookingId, status })
      });

      const data = await response.json() as { booking?: Booking; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.booking) {
        // Update in local state
        setGuestBookings(prev => {
          const updated = { ...prev };
          for (const guestId of Object.keys(updated)) {
            const bookings = updated[Number(guestId)];
            const idx = bookings.findIndex(b => b.id === bookingId);
            if (idx >= 0) {
              updated[Number(guestId)] = [
                ...bookings.slice(0, idx),
                data.booking!,
                ...bookings.slice(idx + 1)
              ];
              break;
            }
          }
          return updated;
        });
        setSuccess('Buchungsstatus aktualisiert');
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren des Buchungsstatus');
      console.error(err);
    }
  };

  // Delete a booking
  const deleteBooking = async (bookingId: number) => {
    try {
      const response = await fetch(`/api/admin/bookings?id=${bookingId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { success?: boolean; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        // Remove from local state
        setGuestBookings(prev => {
          const updated = { ...prev };
          for (const guestId of Object.keys(updated)) {
            const bookings = updated[Number(guestId)];
            const idx = bookings.findIndex(b => b.id === bookingId);
            if (idx >= 0) {
              updated[Number(guestId)] = [
                ...bookings.slice(0, idx),
                ...bookings.slice(idx + 1)
              ];
              break;
            }
          }
          return updated;
        });
        setSuccess('Buchung gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen der Buchung');
      console.error(err);
    }
  };

  // Update booking cleaning_cash field
  const updateBookingCleaningCash = async (bookingId: number, isCash: boolean) => {
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: bookingId, cleaning_cash: isCash ? 1 : 0 })
      });

      const data = await response.json() as { booking?: Booking; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.booking) {
        // Update in local state
        setGuestBookings(prev => {
          const updated = { ...prev };
          for (const guestId of Object.keys(updated)) {
            const bookings = updated[Number(guestId)];
            const idx = bookings.findIndex(b => b.id === bookingId);
            if (idx >= 0) {
              updated[Number(guestId)] = [
                ...bookings.slice(0, idx),
                data.booking!,
                ...bookings.slice(idx + 1)
              ];
              break;
            }
          }
          return updated;
        });
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Reinigungsoption');
      console.error(err);
    }
  };

  // Update booking payment status (deposit_paid or final_payment_paid)
  const updateBookingPaymentStatus = async (bookingId: number, field: 'deposit_paid' | 'final_payment_paid', value: number) => {
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: bookingId, [field]: value })
      });

      const data = await response.json() as { booking?: Booking; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.booking) {
        // Update in local state
        setGuestBookings(prev => {
          const updated = { ...prev };
          for (const guestId of Object.keys(updated)) {
            const bookings = updated[Number(guestId)];
            const idx = bookings.findIndex(b => b.id === bookingId);
            if (idx >= 0) {
              updated[Number(guestId)] = [
                ...bookings.slice(0, idx),
                data.booking!,
                ...bookings.slice(idx + 1)
              ];
              break;
            }
          }
          return updated;
        });
        setSuccess(field === 'deposit_paid' ? 'Anzahlung aktualisiert' : 'Restzahlung aktualisiert');
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren des Zahlungsstatus');
      console.error(err);
    }
  };

  // Update booking transactions and payout_date
  const updateBookingTransactions = async (
    bookingId: number,
    transactions: Array<{
      date: string;
      amount: number;
      type: 'payment' | 'refund';
      status: string;
      description?: string;
      fee?: number;
    }>,
    payoutDate: string
  ) => {
    try {
      // First get the current booking to preserve other additional_costs fields
      const booking = Object.values(guestBookings).flat().find(b => b.id === bookingId);
      let existingCosts = {};
      if (booking?.additional_costs) {
        try {
          existingCosts = JSON.parse(booking.additional_costs);
        } catch { /* ignore */ }
      }

      // Merge with updated transactions and payout_date
      const updatedCosts = {
        ...existingCosts,
        transactions,
        payout_date: payoutDate || undefined,
      };

      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: bookingId, additional_costs: JSON.stringify(updatedCosts) })
      });

      const data = await response.json() as { booking?: Booking; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.booking) {
        // Update in local state
        setGuestBookings(prev => {
          const updated = { ...prev };
          for (const guestId of Object.keys(updated)) {
            const bookings = updated[Number(guestId)];
            const idx = bookings.findIndex(b => b.id === bookingId);
            if (idx >= 0) {
              updated[Number(guestId)] = [
                ...bookings.slice(0, idx),
                data.booking!,
                ...bookings.slice(idx + 1)
              ];
              break;
            }
          }
          return updated;
        });
        setSuccess('Transaktionen aktualisiert');
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Transaktionen');
      console.error(err);
    }
  };

  // Toggle task completion status
  const toggleTaskStatus = async (taskId: number, isCompleted: boolean) => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: taskId, is_completed: isCompleted ? 1 : 0 })
      });

      const data = await response.json() as { task?: Task; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.task) {
        // Update in all tasks
        setAllTasks(prev =>
          prev.map(t => t.id === taskId ? data.task! : t)
        );
        // Also update in guest tasks if loaded
        setGuestTasks(prev =>
          prev.map(t => t.id === taskId ? data.task! : t)
        );
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Aufgabe');
      console.error(err);
    }
  };

  // Toggle row expansion
  const toggleRow = async (guestId: number) => {
    const wasExpanded = expandedRows.has(guestId);
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        // Close other expanded rows for cleaner view
        newSet.clear();
        newSet.add(guestId);
      }
      return newSet;
    });

    // Load data for this guest when expanding
    if (!wasExpanded) {
      await Promise.all([
        loadGuestTasks(guestId),
        loadGuestBookings(guestId),
        loadGuestCosts(guestId),
        loadGuestNotes(guestId)
      ]);
    }
  };


  // Open edit modal
  const openEditModal = (guest: Guest) => {
    setEditingGuest({ ...guest });
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingGuest(null);
  };

  // Save guest changes
  const saveGuest = async () => {
    if (!editingGuest) {
      console.log('saveGuest: no editingGuest');
      return;
    }

    console.log('Saving guest:', editingGuest.id);
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(editingGuest)
      });

      const data = await response.json() as GuestResponse;
      console.log('Save response:', response.status, JSON.stringify(data));

      if (data.error) {
        setError(`Fehler: ${data.error}`);
      } else if (data.guest) {
        setSuccess('Gast erfolgreich aktualisiert');
        closeEditModal();
        loadGuests();
      } else {
        setError('Unerwartete Server-Antwort');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete guest
  const deleteGuest = async (guestId: number) => {
    if (!confirm('Gast wirklich löschen? Die zugehörigen E-Mails bleiben erhalten.')) return;

    try {
      const response = await fetch(`/api/admin/guests?id=${guestId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { error?: string; success?: boolean };
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess('Gast erfolgreich gelöscht');
        loadGuests();
      }
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  // Update guest status directly from table
  // Also updates non-cancelled booking statuses so the effective status reflects the manual override
  const updateGuestStatus = async (guestId: number, newStatus: string) => {
    try {
      // Update guest record
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
        return;
      }

      // Also update booking statuses so the effective (date-based) status reflects the change
      const bookings = guestBookings[guestId] || [];
      const bookingsToUpdate = bookings.filter(b =>
        b.status !== 'cancelled' && b.status !== newStatus
      );
      await Promise.all(bookingsToUpdate.map(booking =>
        fetch('/api/admin/bookings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
          },
          body: JSON.stringify({ id: booking.id, status: newStatus })
        })
      ));

      // Reload bookings and guests to reflect changes
      await loadAllBookings();
      loadGuests();
    } catch (err) {
      setError('Fehler beim Aktualisieren des Status');
      console.error(err);
    }
  };

  // Toggle payment status (deposit or final payment)
  const togglePayment = async (guestId: number, paymentType: 'deposit' | 'final', isPaid: boolean) => {
    try {
      const updateField = paymentType === 'deposit' ? 'deposit_paid' : 'final_payment_paid';
      const taskTitle = paymentType === 'deposit' ? 'Anzahlung erhalten' : 'Restzahlung erhalten';

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
      } else {
        // Update local state
        setGuests(guests.map(g =>
          g.id === guestId ? { ...g, [updateField]: isPaid ? 1 : 0 } : g
        ));

        // Also update the corresponding task if it exists
        const correspondingTask = guestTasks.find(t => t.guest_id === guestId && t.title === taskTitle);
        if (correspondingTask) {
          const newTaskStatus = isPaid ? 1 : 0; // 1 = completed, 0 = pending
          const taskResponse = await fetch('/api/admin/tasks', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-password': adminPassword
            },
            body: JSON.stringify({
              id: correspondingTask.id,
              is_completed: newTaskStatus
            })
          });
          // Update local task state with the returned task (includes completed_at)
          const taskData = await taskResponse.json() as { task?: Task };
          if (taskData.task) {
            setGuestTasks(guestTasks.map(t =>
              t.id === correspondingTask.id ? taskData.task! : t
            ));
          }
        }

        setSuccess(isPaid ? 'Zahlung als bezahlt markiert' : 'Zahlung als offen markiert');
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Zahlung');
      console.error(err);
    }
  };

  // Generic function to update guest fields
  const updateGuest = async (guestId: number, updates: Partial<Guest>) => {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: guestId, ...updates })
      });

      const data = await response.json() as GuestResponse;
      if (data.error) {
        setError(`Fehler: ${data.error}`);
      } else {
        // Update local state
        setGuests(guests.map(g =>
          g.id === guestId ? { ...g, ...updates } : g
        ));
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren');
      console.error(err);
    }
  };

  // Create new guest or add booking to existing guest (called from CreateGuestModal)
  const handleCreateGuest = async (
    newGuest: Partial<Guest>,
    bookingMode: 'new' | 'existing',
    selectedExistingGuestId: number | null,
    createStandardTasks: boolean,
    importFile: File | null,
    extractedNetRent: number | null,
    isPlatformPayment: boolean
  ) => {
    // Handle existing guest mode - add booking
    if (bookingMode === 'existing') {
      if (!selectedExistingGuestId) {
        setError('Bitte wählen Sie einen Gast aus');
        return;
      }

      setIsSaving(true);
      try {
        const isFeWo = newGuest.platform === 'FeWo';

        // Create booking for existing guest
        const bookingResponse = await fetch('/api/admin/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
          },
          body: JSON.stringify({
            guest_id: selectedExistingGuestId,
            booking_number: newGuest.booking_number,
            platform: newGuest.platform,
            arrival_date: newGuest.arrival_date,
            departure_date: newGuest.departure_date,
            adults: newGuest.adults || 2,
            children: newGuest.children || 0,
            pets: newGuest.pets,
            rental_price: newGuest.rental_price || 0,
            deposit_amount: newGuest.deposit_amount || 0,
            deposit_paid: isFeWo ? 1 : 0,
            final_payment_paid: isFeWo ? 1 : 0,
            first_contact_date: newGuest.first_contact_date,
            notes: newGuest.other_notes,
            status: 'active',
          })
        });

        const bookingData = await bookingResponse.json() as { error?: string; booking?: { id: number } };
        if (bookingData.error) {
          setError(bookingData.error);
        } else {
          // Upload import file (PDF or screenshot) as document
          if (importFile && selectedExistingGuestId) {
            try {
              const docType = importFile.type.includes('pdf') ? 'booking_pdf' : 'screenshot';
              const formData = new FormData();
              formData.append('file', importFile);
              formData.append('guestId', selectedExistingGuestId.toString());
              formData.append('documentType', docType);
              formData.append('description', `Importiert am ${new Date().toLocaleDateString('de-DE')}`);

              await fetch('/api/admin/guest-documents', {
                method: 'POST',
                headers: {
                  'x-admin-password': adminPassword
                },
                body: formData
              });
            } catch (e) {
              console.error('Error saving import file as document:', e);
            }
          }

          setSuccess('Neue Buchung erfolgreich angelegt');
          setIsCreatingGuest(false);
          loadGuests();
        }
      } catch (err) {
        console.error('Error creating booking:', err);
        setError('Fehler beim Erstellen der Buchung');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Handle new guest mode
    if (!newGuest.guest_name) {
      setError('Name ist erforderlich');
      return;
    }

    setIsSaving(true);
    try {
      const guestToCreate = {
        ...newGuest,
        year: newGuest.arrival_date ? new Date(newGuest.arrival_date).getFullYear() : new Date().getFullYear(),
        month: newGuest.arrival_date ? new Date(newGuest.arrival_date).toLocaleString('de-DE', { month: 'long' }) : null,
        // Include net_rent from FeWo screenshot for commission calculation
        net_rent: extractedNetRent,
      };

      const response = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(guestToCreate)
      });

      const data = await response.json() as { error?: string; guest?: Guest };
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess('Neuer Gast erfolgreich angelegt');
        setIsCreatingGuest(false);
        // Reset filters to ensure new guest is visible
        setStatusFilter('');
        // Sort by ID descending so newest guest appears at top
        setSortColumn('id');
        setSortDirection('desc');
        loadGuests();

        // Create standard tasks for new guest
        if (data.guest && createStandardTasks) {
          let taskErrors = 0;
          const isBookingCom = data.guest.platform?.toLowerCase().includes('booking');
          const isFeWo = data.guest.platform === 'FeWo';
          // Tasks that should be N/A for booking.com guests
          const bookingComNATasks = ['angebot', 'vertrag', 'anzahlung', 'restzahlung'];
          // Tasks that should be N/A for FeWo guests (payment via platform, no contract needed)
          const feWoNATasks = ['angebot', 'vertrag', 'anzahlung', 'restzahlung'];

          for (const st of STANDARD_TASKS) {
            try {
              const taskResponse = await fetch('/api/admin/tasks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-password': adminPassword
                },
                body: JSON.stringify({
                  guest_id: data.guest.id,
                  title: st.title,
                  description: `[STANDARD:${st.key}]`
                })
              });
              if (!taskResponse.ok) {
                const errorData = await taskResponse.json();
                console.error('Task creation failed:', errorData);
                taskErrors++;
              } else {
                // If booking.com or FeWo guest, set certain tasks to N/A
                const shouldSetNA = (isBookingCom && bookingComNATasks.includes(st.key)) ||
                                   (isFeWo && feWoNATasks.includes(st.key));
                if (shouldSetNA) {
                  const taskData = await taskResponse.json() as { task?: { id: number } };
                  if (taskData.task?.id) {
                    await fetch('/api/admin/tasks', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPassword
                      },
                      body: JSON.stringify({
                        id: taskData.task.id,
                        is_completed: 2 // N/A status
                      })
                    });
                  }
                }
              }
            } catch (e) {
              console.error('Error creating standard task:', e);
              taskErrors++;
            }
          }
          if (taskErrors > 0) {
            setError(`${taskErrors} Aufgabe(n) konnten nicht erstellt werden. Bitte führe "Datenbank-Tabellen erstellen" im Setup aus.`);
          }

          // For booking.com and FeWo guests, mark payments as paid (handled by platform)
          if (isBookingCom || isFeWo) {
            try {
              await fetch('/api/admin/guests', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-password': adminPassword
                },
                body: JSON.stringify({
                  id: data.guest.id,
                  deposit_paid: 1,
                  final_payment_paid: 1
                })
              });
            } catch (e) {
              console.error('Error setting payment status for platform guest:', e);
            }
          }

          // Upload import file (PDF or screenshot) as document
          if (importFile) {
            try {
              const docType = importFile.type.includes('pdf') ? 'booking_pdf' : 'screenshot';
              const formData = new FormData();
              formData.append('file', importFile);
              formData.append('guestId', data.guest.id.toString());
              formData.append('documentType', docType);
              formData.append('description', `Importiert am ${new Date().toLocaleDateString('de-DE')}`);

              await fetch('/api/admin/guest-documents', {
                method: 'POST',
                headers: {
                  'x-admin-password': adminPassword
                },
                body: formData
              });
            } catch (e) {
              console.error('Error saving import file as document:', e);
            }
          }

          // Auto-expand the new guest to show tasks
          setTimeout(() => {
            toggleRow(data.guest!.id);
          }, 500);
        }
      }
    } catch (err) {
      setError('Fehler beim Erstellen');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Mapping of standard task keys to guest checkbox fields
  const TASK_TO_CHECKBOX_MAP: Record<string, keyof Guest> = {
    'angebot': 'offer_sent',
    'vertrag': 'contract_sent',
    'anzahlung': 'deposit_paid',
    'welcome_guide': 'welcome_guide_sent',
    'restzahlung': 'final_payment_paid',
    'verwaltung': 'admin_briefed'
  };

  // Ensure standard tasks exist for a guest
  const ensureStandardTasks = async (guestId: number, existingTasks: Task[], guest: Guest) => {
    const existingTitles = existingTasks.map(t => t.title);
    const missingTasks = STANDARD_TASKS.filter(st => !existingTitles.includes(st.title));

    if (missingTasks.length === 0) return existingTasks;

    // Create missing standard tasks
    const newTasks: Task[] = [];
    for (const st of missingTasks) {
      try {
        // Check if corresponding checkbox is checked - if so, mark task as completed
        const checkboxField = TASK_TO_CHECKBOX_MAP[st.key];
        const isCompleted = checkboxField && guest[checkboxField] === 1 ? 1 : 0;

        const response = await fetch('/api/admin/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
          },
          body: JSON.stringify({
            guest_id: guestId,
            title: st.title,
            description: `[STANDARD:${st.key}]` // Mark as standard task
          })
        });
        const data = await response.json() as { task?: Task };
        if (data.task) {
          // If checkbox was checked, immediately mark as completed
          if (isCompleted) {
            const updateResponse = await fetch('/api/admin/tasks', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPassword
              },
              body: JSON.stringify({
                id: data.task.id,
                is_completed: 1
              })
            });
            const updateData = await updateResponse.json() as { task?: Task };
            if (updateData.task) {
              newTasks.push(updateData.task);
            } else {
              newTasks.push(data.task);
            }
          } else {
            newTasks.push(data.task);
          }
        }
      } catch (err) {
        console.error('Error creating standard task:', err);
      }
    }

    return [...existingTasks, ...newTasks];
  };

  // Load tasks for a guest
  const loadGuestTasks = async (guestId: number, guest?: Guest) => {
    setLoadingTasks(true);
    try {
      const response = await fetch(`/api/admin/tasks?guest_id=${guestId}&show_completed=true`, {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { tasks?: Task[]; error?: string };
      let tasks = data.tasks || [];

      // Ensure standard tasks exist - pass guest to transfer checkbox values
      const guestObj = guest || guests.find(g => g.id === guestId);
      if (guestObj) {
        tasks = await ensureStandardTasks(guestId, tasks, guestObj);
      }

      // Sort: standard tasks first (by order), then custom tasks by date
      tasks.sort((a, b) => {
        const aStandard = STANDARD_TASKS.find(st => st.title === a.title);
        const bStandard = STANDARD_TASKS.find(st => st.title === b.title);

        if (aStandard && bStandard) {
          return aStandard.order - bStandard.order;
        }
        if (aStandard) return -1;
        if (bStandard) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setGuestTasks(tasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Mapping of standard task titles to guest checkbox fields
  const TASK_TITLE_TO_FIELD: Record<string, keyof Guest> = {
    'Angebot senden': 'offer_sent',
    'Vertrag senden': 'contract_sent',
    'Anzahlung erhalten': 'deposit_paid',
    'Welcome Guide senden': 'welcome_guide_sent',
    'Restzahlung erhalten': 'final_payment_paid',
    'Verwaltung briefen': 'admin_briefed'
  };

  // Set task status: 0 = pending, 1 = completed, 2 = N/A
  const setTaskStatus = async (taskId: number, newStatus: number) => {
    try {
      // Find the task to get its title and guest_id
      const task = guestTasks.find(t => t.id === taskId);

      const response = await fetch('/api/admin/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({
          id: taskId,
          is_completed: newStatus
        })
      });

      const data = await response.json() as { task?: Task; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.task) {
        setGuestTasks(guestTasks.map(t => t.id === taskId ? data.task! : t));

        // If this is a standard task, also update the guest's checkbox field
        if (task) {
          const guestField = TASK_TITLE_TO_FIELD[task.title];
          if (guestField) {
            // Update guest field: 1 if completed, 0 otherwise
            const fieldValue = newStatus === 1 ? 1 : 0;

            // Update via API
            await fetch('/api/admin/guests', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPassword
              },
              body: JSON.stringify({
                id: task.guest_id,
                [guestField]: fieldValue
              })
            });

            // Update local state
            setGuests(guests.map(g =>
              g.id === task.guest_id
                ? { ...g, [guestField]: fieldValue }
                : g
            ));
          }
        }
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren');
      console.error(err);
    }
  };

  // Cycle task status: pending (0) -> completed (1) -> N/A (2) -> pending (0)
  const cycleTaskStatus = (taskId: number, currentStatus: number) => {
    const nextStatus = (currentStatus + 1) % 3;
    setTaskStatus(taskId, nextStatus);
  };

  // Delete a task
  const deleteTask = async (taskId: number) => {
    if (!confirm('Task wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/admin/tasks?id=${taskId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { success?: boolean; error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        setGuestTasks(guestTasks.filter(t => t.id !== taskId));
        setSuccess('Task gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  // Load costs for a guest
  const loadGuestCosts = async (guestId: number) => {
    setLoadingCosts(true);
    try {
      const response = await fetch(`/api/admin/costs?guest_id=${guestId}`, {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { costs?: GuestCost[]; error?: string };
      setGuestCosts(data.costs || []);
    } catch (err) {
      console.error('Error loading costs:', err);
    } finally {
      setLoadingCosts(false);
    }
  };

  // Delete a cost entry
  const deleteCost = async (costId: number) => {
    if (!confirm('Kosten wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/admin/costs?id=${costId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { success?: boolean; error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        setGuestCosts(guestCosts.filter(c => c.id !== costId));
        setSuccess('Kosten gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  // Load documents for a guest
  const loadGuestDocuments = async (guestId: number) => {
    setLoadingDocuments(true);
    try {
      const response = await fetch(`/api/admin/guest-documents?guestId=${guestId}`, {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { documents?: GuestDocument[]; error?: string };
      setGuestDocuments(data.documents || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Upload a document for a guest
  const uploadDocument = async (guestId: number, file: File, description?: string) => {
    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('guestId', guestId.toString());
      formData.append('documentType', file.type.includes('pdf') ? 'booking_pdf' : 'screenshot');
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch('/api/admin/guest-documents', {
        method: 'POST',
        headers: {
          'x-admin-password': adminPassword
        },
        body: formData
      });

      const data = await response.json() as { success?: boolean; id?: number; error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        await loadGuestDocuments(guestId);
        setSuccess('Dokument hochgeladen');
      }
    } catch (err) {
      setError('Fehler beim Hochladen');
      console.error(err);
    } finally {
      setUploadingDocument(false);
    }
  };

  // Delete a document
  const deleteDocument = async (documentId: number, guestId: number) => {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/admin/guest-documents?id=${documentId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { success?: boolean; error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        setGuestDocuments(guestDocuments.filter(d => d.id !== documentId));
        setSuccess('Dokument gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  // Load notes for a guest
  const loadGuestNotes = async (guestId: number) => {
    if (guestNotes[guestId]) return; // Already loaded

    setLoadingNotes(prev => new Set(prev).add(guestId));
    try {
      const response = await fetch(`/api/admin/notes?guest_id=${guestId}`, {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json() as { notes?: GuestNote[]; error?: string; tableNotFound?: boolean };

      if (data.tableNotFound) {
        // Table doesn't exist yet
        setGuestNotes(prev => ({ ...prev, [guestId]: [] }));
      } else {
        setGuestNotes(prev => ({ ...prev, [guestId]: data.notes || [] }));
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setGuestNotes(prev => ({ ...prev, [guestId]: [] }));
    } finally {
      setLoadingNotes(prev => {
        const next = new Set(prev);
        next.delete(guestId);
        return next;
      });
    }
  };

  // Add a note
  const addNote = async (guestId: number, content: string) => {
    try {
      const response = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ guest_id: guestId, content })
      });

      const data = await response.json() as { note?: GuestNote; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.note) {
        setGuestNotes(prev => ({
          ...prev,
          [guestId]: [data.note!, ...(prev[guestId] || [])]
        }));
        setSuccess('Notiz hinzugefügt');
      }
    } catch (err) {
      setError('Fehler beim Hinzufügen der Notiz');
      console.error(err);
    }
  };

  // Update a note
  const updateNote = async (guestId: number, noteId: number, content: string) => {
    try {
      const response = await fetch('/api/admin/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: noteId, content })
      });

      const data = await response.json() as { note?: GuestNote; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.note) {
        setGuestNotes(prev => ({
          ...prev,
          [guestId]: (prev[guestId] || []).map(n => n.id === noteId ? data.note! : n)
        }));
        setSuccess('Notiz aktualisiert');
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Notiz');
      console.error(err);
    }
  };

  // Delete a note
  const deleteNote = async (guestId: number, noteId: number) => {
    try {
      const response = await fetch(`/api/admin/notes?id=${noteId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { success?: boolean; error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        setGuestNotes(prev => ({
          ...prev,
          [guestId]: (prev[guestId] || []).filter(n => n.id !== noteId)
        }));
        setSuccess('Notiz gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen der Notiz');
      console.error(err);
    }
  };

  // Get unique years from guests
  const years = [...new Set(guests.map(g => g.year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort guests using extracted helper
  const sortedGuests = sortGuests(guests, sortColumn, sortDirection, guestBookings);

  // Filter by status (client-side, basierend auf effektivem Status aus Buchungen)
  const statusFilteredGuests = statusFilter
    ? sortedGuests.filter(g => getGuestEffectiveStatus(g) === statusFilter)
    : sortedGuests;

  // Filter out completed guests if hideCompleted is true (using effective status)
  const displayedGuests = hideCompleted
    ? statusFilteredGuests.filter(g => {
        const effectiveStatus = getGuestEffectiveStatus(g);
        return effectiveStatus !== 'completed' && effectiveStatus !== 'cancelled';
      })
    : statusFilteredGuests;

  // Count of hidden completed guests (using effective status)
  const completedCount = statusFilteredGuests.filter(g => {
    const effectiveStatus = getGuestEffectiveStatus(g);
    return effectiveStatus === 'completed' || effectiveStatus === 'cancelled';
  }).length;

  // Sort icon component
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="hidden sm:block">
          <h2 className="text-lg font-medium text-gray-900">
            Gästedatenbank
          </h2>
          <p className="text-sm text-gray-500">
            {guests.length} Gäste gesamt
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreatingGuest(true)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Neuer Gast / Buchung</span>
            <span className="sm:hidden">Neu</span>
          </button>
          <button
            onClick={() => loadGuests(true)}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Aktualisieren</span>
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        <button
          onClick={() => setActiveView('guests')}
          className={`px-1 py-2 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
            activeView === 'guests'
              ? 'border-green-600 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Gäste
        </button>
        <button
          onClick={() => setActiveView('calendar')}
          className={`px-1 py-2 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
            activeView === 'calendar'
              ? 'border-green-600 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Kalender
        </button>
        <button
          onClick={() => setActiveView('tasks')}
          className={`px-1 py-2 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
            activeView === 'tasks'
              ? 'border-green-600 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Aufgaben
        </button>
      </div>

      {/* === GUESTS VIEW === */}
      {activeView === 'guests' && (
        <>
      {/* Filters */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name, E-Mail oder Telefon suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Alle Jahre</option>
              {years.map(year => (
                <option key={year} value={year || ''}>{year}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="completed">Abgeschlossen</option>
              <option value="cancelled">Storniert</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                title="Kartenansicht"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                title="Tabellenansicht"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sort Controls for Card View */}
          {viewMode === 'cards' && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Sortierung:</span>
              {(['arrival_date', 'guest_name', 'platform', 'status'] as const).map(col => {
                const labels = { arrival_date: 'Datum', guest_name: 'Name', platform: 'Plattform', status: 'Status' } as const;
                return (
                  <button
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`px-2 py-1 rounded transition-colors ${sortColumn === col ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    {labels[col]}
                    {sortColumn === col && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'cards' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : displayedGuests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Keine Gäste gefunden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedGuests.map((guest) => (
                <BookingCard
                  key={guest.id}
                  guest={guest}
                  bookings={guestBookings[guest.id] || []}
                  latestBooking={getLatestBooking(guest)}
                  effectiveStatus={getGuestEffectiveStatus(guest)}
                  isSelected={selectedGuestId === guest.id || expandedRows.has(guest.id)}
                  onClick={() => {
                    toggleRow(guest.id);
                    setSelectedGuestId(guest.id);
                  }}
                  onEdit={() => openEditModal(guest)}
                  onDelete={() => deleteGuest(guest.id)}
                  demoMode={demoMode}
                />
              ))}
            </div>
          )}

          {/* Toggle completed */}
          {completedCount > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 text-sm ${
                  hideCompleted
                    ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                }`}
              >
                {hideCompleted ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {completedCount} abgeschlossene anzeigen
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Abgeschlossene ausblenden
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Table View (original) */}
      {viewMode === 'table' && (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Keine Gäste gefunden</p>
            <p className="text-sm mt-2">Öffne Setup oben und klicke auf &quot;Gäste importieren&quot;</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('guest_name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIcon column="guest_name" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontakt
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('arrival_date')}
                  >
                    <div className="flex items-center gap-1">
                      Buchungen
                      <SortIcon column="arrival_date" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('platform')}
                  >
                    <div className="flex items-center gap-1">
                      Plattform
                      <SortIcon column="platform" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedGuests.map((guest) => {
                  const fullIndex = sortedGuests.findIndex(g => g.id === guest.id);
                  const displayNumber = sortDirection === 'desc'
                    ? sortedGuests.length - fullIndex
                    : fullIndex + 1;
                  return (
                    <GuestTableRow
                      key={guest.id}
                      guest={guest}
                      isExpanded={expandedRows.has(guest.id)}
                      displayNumber={displayNumber}
                      bookings={guestBookings[guest.id] || []}
                      bankPayments={guestBankPayments[guest.id] || []}
                      guestTasks={guestTasks}
                      guestDocuments={guestDocuments}
                      notes={guestNotes[guest.id] || []}
                      notesLoading={loadingNotes.has(guest.id)}
                      pricing={pricing}
                      loadingBookings={loadingBookings.has(guest.id)}
                      loadingTasks={loadingTasks}
                      guestProfileTab={guestProfileTab}
                      adminPassword={adminPassword}
                      onToggleRow={() => toggleRow(guest.id)}
                      onEditGuest={() => openEditModal(guest)}
                      onDeleteGuest={() => deleteGuest(guest.id)}
                      onUpdateStatus={(status) => updateGuestStatus(guest.id, status)}
                      onTabChange={setGuestProfileTab}
                      onLoadNotes={() => loadGuestNotes(guest.id)}
                      onLoadDocuments={() => loadGuestDocuments(guest.id)}
                      onAddBooking={() => setAddingBookingForGuest(guest.id)}
                      onUpdateBookingStatus={updateBookingStatus}
                      onEditBooking={(booking) => setEditingBooking(booking)}
                      onDeleteBooking={deleteBooking}
                      onToggleCleaningCash={(bookingId, isCash) => updateBookingCleaningCash(bookingId, isCash)}
                      onTogglePaymentStatus={(bookingId, field, value) => updateBookingPaymentStatus(bookingId, field, value)}
                      onUpdateTransactions={(bookingId, transactions, payoutDate) => updateBookingTransactions(bookingId, transactions, payoutDate)}
                      onUploadDocument={async (bookingId, guestId, file) => {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('guestId', guestId.toString());
                        formData.append('bookingId', bookingId.toString());
                        formData.append('documentType', file.type.includes('pdf') ? 'booking_pdf' : 'screenshot');
                        formData.append('description', `Buchung #${bookingId} - ${new Date().toLocaleDateString('de-DE')}`);

                        const response = await fetch('/api/admin/guest-documents', {
                          method: 'POST',
                          headers: { 'x-admin-password': adminPassword },
                          body: formData
                        });

                        if (response.ok) {
                          await loadGuestDocuments(guestId);
                          setSuccess('Dokument hochgeladen');
                        } else {
                          setError('Fehler beim Hochladen');
                        }
                      }}
                      onAddNote={(content) => addNote(guest.id, content)}
                      onUpdateNote={(noteId, content) => updateNote(guest.id, noteId, content)}
                      onDeleteNote={(noteId) => deleteNote(guest.id, noteId)}
                      onCreateTask={async (title, assignee, dueDate) => {
                        const response = await fetch('/api/admin/tasks', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-admin-password': adminPassword
                          },
                          body: JSON.stringify({
                            guest_id: guest.id,
                            title: title.trim(),
                            assigned_to: assignee || null,
                            due_date: dueDate || null
                          })
                        });
                        const data = await response.json() as { task?: Task; error?: string };
                        if (data.error) {
                          setError(data.error);
                        } else if (data.task) {
                          setGuestTasks([...guestTasks, data.task]);
                          setSuccess('Task erstellt');
                        }
                      }}
                      onUpdateTask={async (taskId, updates) => {
                        const response = await fetch('/api/admin/tasks', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-admin-password': adminPassword
                          },
                          body: JSON.stringify({ id: taskId, ...updates })
                        });
                        const data = await response.json() as { task?: Task; error?: string };
                        if (data.error) {
                          setError(data.error);
                        } else if (data.task) {
                          setGuestTasks(guestTasks.map(t => t.id === taskId ? data.task! : t));
                        }
                      }}
                      onDeleteTask={async (taskId) => {
                        await deleteTask(taskId);
                      }}
                      onCycleTaskStatus={(taskId, currentStatus) => {
                        cycleTaskStatus(taskId, currentStatus);
                      }}
                      getLatestBooking={() => getLatestBooking(guest)}
                      getEffectiveStatus={() => getGuestEffectiveStatus(guest)}
                      demoMode={demoMode}
                    />
                  );
                })}
              </tbody>
            </table>

            {/* Toggle button to show/hide completed guests - below table */}
            {completedCount > 0 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                    hideCompleted
                      ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {hideCompleted ? (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-sm">{completedCount} abgeschlossene Gäste anzeigen</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-sm">Abgeschlossene ausblenden</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}
        </>
      )}

      {/* === CALENDAR VIEW === */}
      {activeView === 'calendar' && (
        <AdminCalendar
          guests={guests}
          adminPassword={adminPassword}
          onSwitchToGuests={() => setActiveView('guests')}
          onSelectGuest={(guestId) => {
            setActiveView('guests');
            toggleRow(guestId);
          }}
        />
      )}

      {/* === TASKS VIEW === */}
      {activeView === 'tasks' && (
        <AllTasksView
          allTasks={allTasks}
          guests={guests}
          loadingAllTasks={loadingAllTasks}
          onLoadAllTasks={loadAllTasks}
          onToggleTaskStatus={toggleTaskStatus}
          onNavigateToGuest={(guest) => {
            setActiveView('guests');
            setGuestProfileTab('tasks');
            toggleRow(guest.id);
          }}
          getLatestBooking={getLatestBooking}
        />
      )}

      {/* Edit Modal */}
      {editingGuest && (
        <GuestEditModal
          guest={editingGuest}
          onClose={closeEditModal}
          onSave={async (guest) => {
            setIsSaving(true);
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
              }
              setSuccess('Gast erfolgreich aktualisiert');
              loadGuests();
              return true;
            } catch (err) {
              setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
              return false;
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}



      {/* Create Guest Modal */}
      <CreateGuestModal
        isOpen={isCreatingGuest}
        guests={guests}
        isSaving={isSaving}
        onClose={() => setIsCreatingGuest(false)}
        onCreateGuest={handleCreateGuest}
        onSuccess={setSuccess}
        onError={setError}
      />
      {/* Booking Wizard (Create or Edit) */}
      {(editingBooking || addingBookingForGuest !== null) && (() => {
        const wizardGuestId = editingBooking?.guest_id || addingBookingForGuest || 0;
        const wizardGuest = guests.find(g => g.id === wizardGuestId);
        return (
          <BookingWizard
            isOpen={true}
            mode={editingBooking ? 'edit' : 'create'}
            booking={editingBooking || undefined}
            guestId={wizardGuestId}
            guestName={wizardGuest?.guest_name || ''}
            adminPassword={adminPassword}
            isSubmitting={isSavingBooking}
            onClose={() => {
              setEditingBooking(null);
              setAddingBookingForGuest(null);
            }}
            onSave={saveBooking}
            onSuccess={setSuccess}
            onError={setError}
          />
        );
      })()}

    </div>
  );
}
