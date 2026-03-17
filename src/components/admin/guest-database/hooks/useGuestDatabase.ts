'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Guest, Email, Task, Booking, GuestCost, RonaldPayment,
  GuestDocument, GuestNote, SortColumn, SortDirection, GuestProfileTab,
  GuestsResponse, EmailsResponse, GuestResponse, BookingsResponse, SetupStatus
} from '../types';
import { STANDARD_TASKS } from '../constants';
import {
  loadGuestsFromCache,
  saveGuestsToCache,
  getEffectiveStatus,
  TASK_TO_CHECKBOX_MAP,
  TASK_TITLE_TO_FIELD,
} from '../utils';

interface UseGuestDatabaseOptions {
  adminPassword: string;
  onDataLoaded?: () => void;
}

export function useGuestDatabase({ adminPassword, onDataLoaded }: UseGuestDatabaseOptions) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View state (guests table vs calendar vs tasks)
  const [activeView, setActiveView] = useState<'guests' | 'calendar' | 'tasks'>('guests');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hideCompleted, setHideCompleted] = useState(true);

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('arrival_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Selected guest for detail view
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestEmails, setGuestEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Selected email for viewing
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

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

  // Email sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<string[]>([]);

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
  const [guestRonaldPayments, setGuestRonaldPayments] = useState<Record<number, RonaldPayment[]>>({});
  const [loadingBookings, setLoadingBookings] = useState<Set<number>>(new Set());
  const [allBookingsLoaded, setAllBookingsLoaded] = useState(false);
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [addingBookingForGuest, setAddingBookingForGuest] = useState<number | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  // Setup state
  const [showSetup, setShowSetup] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isRunningSetup, setIsRunningSetup] = useState<string | null>(null);
  const [setupResults, setSetupResults] = useState<string[]>([]);

  // FeWo Import state
  const [isImportingFewo, setIsImportingFewo] = useState(false);
  const [fewoImportResult, setFewoImportResult] = useState<{
    message: string;
    total: number;
    created: number;
    updated: number;
    notFound: number;
    errors: number;
    results: Array<{
      guest_name: string;
      booking_number: string;
      action: string;
      success: boolean;
      error?: string;
    }>;
  } | null>(null);
  const [fewoPreview, setFewoPreview] = useState<{
    totalBookings: number;
    bookings: Array<{ guest_name: string; booking_number: string; arrival_date: string }>;
  } | null>(null);

  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Cache update effect
  useEffect(() => {
    if (guests.length > 0 && !loading && !yearFilter && !statusFilter && !searchTerm) {
      saveGuestsToCache(guests);
    }
  }, [guests, loading, yearFilter, statusFilter, searchTerm]);

  // Load guests (with Local Storage Cache)
  const loadGuests = useCallback(async (forceRefresh = false) => {
    // On tab change, load from cache first (when no filters active)
    if (!forceRefresh && !yearFilter && !statusFilter && !searchTerm) {
      const cachedGuests = loadGuestsFromCache();
      if (cachedGuests && cachedGuests.length > 0) {
        setGuests(cachedGuests);
        if (!initialLoadDone) {
          setInitialLoadDone(true);
          onDataLoaded?.();
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.append('year', yearFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch('/api/admin/guests?' + params.toString());
      const data = await response.json() as GuestsResponse;

      if (data.error) {
        setError(data.error);
      } else {
        const newGuests = data.guests || [];
        setGuests(newGuests);
        if (!yearFilter && !statusFilter && !searchTerm) {
          saveGuestsToCache(newGuests);
        }
      }
    } catch (err) {
      setError('Fehler beim Laden der Gäste');
      console.error(err);
    } finally {
      setLoading(false);
      if (!initialLoadDone) {
        setInitialLoadDone(true);
        onDataLoaded?.();
      }
    }
  }, [yearFilter, statusFilter, searchTerm, initialLoadDone, onDataLoaded]);

  // Load all bookings at once (for display in table)
  const loadAllBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/bookings');
      const data = await response.json() as { bookings: Booking[]; error?: string };

      if (data.bookings) {
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

  // Load all open tasks for the tasks overview
  const loadAllTasks = useCallback(async () => {
    setLoadingAllTasks(true);
    try {
      const response = await fetch('/api/admin/tasks');
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
      const data = await response.json() as { success: boolean; status: SetupStatus };
      if (data.success && data.status) {
        setSetupStatus(data.status);
      }
    } catch (err) {
      console.error('Error checking setup status:', err);
    }
  }, [adminPassword]);

  // Run setup action
  const runSetupAction = async (action: string) => {
    setIsRunningSetup(action);
    setSetupResults([]);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ action })
      });
      const data = await response.json() as { success: boolean; results?: string[]; error?: string };

      if (data.results) {
        setSetupResults(data.results);
      }

      if (data.success) {
        setSuccess(action === 'migrate_guests_tables' ? 'Datenbank-Tabellen erstellt!' : 'Gästedaten importiert!');
        await checkSetupStatus();
        await loadGuests();
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Fehler bei der Ausführung');
      console.error(err);
    } finally {
      setIsRunningSetup(null);
    }
  };

  // Run booking migration actions
  const runMigration = async (action: string) => {
    setIsRunningSetup(action);
    setSetupResults([]);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/migrate-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ action })
      });
      const data = await response.json() as { success: boolean; results?: string[]; error?: string };

      if (data.results) {
        setSetupResults(data.results);
      }

      if (data.success) {
        if (action === 'migrate_first_bookings') {
          setSuccess('Buchungen erfolgreich migriert!');
          await loadAllBookings();
        } else if (action === 'create_notes_table') {
          setSuccess('Notizen-Tabelle erstellt!');
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Fehler bei der Migration');
      console.error(err);
    } finally {
      setIsRunningSetup(null);
    }
  };

  // Load FeWo bookings preview
  const loadFewoPreview = async () => {
    try {
      const response = await fetch('/api/admin/import-fewo-bookings');
      const data = await response.json() as {
        totalBookings: number;
        bookings: Array<{ guest_name: string; booking_number: string; arrival_date: string }>;
      };
      setFewoPreview(data);
    } catch (err) {
      console.error('Error loading FeWo preview:', err);
    }
  };

  // Import FeWo bookings
  const importFewoBookings = async () => {
    setIsImportingFewo(true);
    setFewoImportResult(null);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/import-fewo-bookings', {
        method: 'POST',
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setError(data.error || `Fehler: ${response.status}`);
        return;
      }

      const data = await response.json() as typeof fewoImportResult;
      setFewoImportResult(data);

      if (data && (data.updated > 0 || data.created > 0)) {
        setSuccess(`✅ ${data.updated} aktualisiert, ${data.created} erstellt`);
        await checkSetupStatus();
        await loadGuests(true);
      } else if (data && data.notFound > 0) {
        setError(`⚠️ ${data.notFound} Gäste nicht gefunden - bitte zuerst Gäste anlegen`);
      }
    } catch (err) {
      setError('Fehler beim Import');
      console.error(err);
    } finally {
      setIsImportingFewo(false);
    }
  };

  // Ensure database tables exist (auto-create on first load)
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
        console.log('Tabellen existieren nicht, erstelle automatisch...');
        const createResponse = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
          },
          body: JSON.stringify({ action: 'migrate_guests_tables' })
        });
        const createData = await createResponse.json() as { success: boolean; results?: string[] };
        if (createData.success) {
          console.log('Tabellen erfolgreich erstellt:', createData.results);
        }
      }
    } catch (err) {
      console.error('Error ensuring tables exist:', err);
    }
  }, [adminPassword]);

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      await ensureTablesExist();
      await checkSetupStatus();
      await loadGuests();
      await loadAllBookings();
    };
    initializeData();
  }, [ensureTablesExist, checkSetupStatus, loadGuests, loadAllBookings]);

  // Load all tasks when switching to tasks view
  useEffect(() => {
    if (activeView === 'tasks') {
      loadAllTasks();
    }
  }, [activeView, loadAllTasks]);

  // Load emails for a specific guest
  const loadGuestEmails = async (guestId: number) => {
    setLoadingEmails(true);
    try {
      const response = await fetch(`/api/admin/emails?guest_id=${guestId}`);
      const data = await response.json() as EmailsResponse;
      setGuestEmails(data.emails || []);
    } catch (err) {
      console.error('Error loading guest emails:', err);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Sync emails from IMAP server
  const syncEmails = async () => {
    setIsSyncing(true);
    setSyncResults([]);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/emails/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        }
      });

      if (response.status === 503) {
        setSyncResults([
          '⚠ Service nicht verfügbar (503)',
          '→ E-Mail-Sync benötigt Cloudflare Workers TCP-Sockets',
          '→ Diese Funktion funktioniert nur in der Produktionsumgebung',
          '→ Lokal können E-Mails manuell erfasst werden'
        ]);
        setError('E-Mail-Sync nur in Produktion verfügbar');
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          setError(`Server-Fehler (${response.status})`);
          return;
        }
        try {
          const errorData = JSON.parse(text) as { error?: string };
          setError(errorData.error || `Fehler: ${response.status}`);
        } catch {
          setError(`Server-Fehler: ${response.status}`);
        }
        return;
      }

      const data = await response.json() as {
        success: boolean;
        imported?: number;
        skipped?: number;
        folders?: string[];
        errors?: string[];
        error?: string;
        instructions?: string[];
      };

      if (data.success) {
        const results: string[] = [];
        if (data.folders) {
          results.push(...data.folders.map(f => `✓ ${f}`));
        }
        results.push(`✓ ${data.imported} E-Mails importiert`);
        if (data.skipped && data.skipped > 0) {
          results.push(`○ ${data.skipped} übersprungen (bereits vorhanden)`);
        }
        if (data.errors && data.errors.length > 0) {
          results.push(...data.errors.map(e => `⚠ ${e}`));
        }
        setSyncResults(results);
        setSuccess(`E-Mail-Synchronisation abgeschlossen: ${data.imported} importiert`);
        await checkSetupStatus();
      } else {
        if (data.instructions) {
          setSyncResults(data.instructions);
        }
        setError(data.error || 'Synchronisation fehlgeschlagen');
      }
    } catch (err) {
      console.error('Email sync error:', err);
      setSyncResults([
        '⚠ Verbindungsfehler',
        '→ E-Mail-Sync benötigt Cloudflare Workers Umgebung',
        '→ Lokal können E-Mails manuell erfasst werden'
      ]);
      setError('E-Mail-Sync fehlgeschlagen - nur in Produktion verfügbar');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load bookings and Ronald payments for a guest
  const loadGuestBookings = async (guestId: number) => {
    setLoadingBookings(prev => new Set(prev).add(guestId));
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/bookings?guest_id=${guestId}`),
        fetch(`/api/admin/ronald-payments?guestId=${guestId}`)
      ]);

      const bookingsData = await bookingsRes.json() as BookingsResponse;
      if (bookingsData.bookings) {
        setGuestBookings(prev => ({ ...prev, [guestId]: bookingsData.bookings || [] }));
      }

      const paymentsData = await paymentsRes.json() as { payments?: RonaldPayment[] };
      if (paymentsData.payments) {
        setGuestRonaldPayments(prev => ({ ...prev, [guestId]: paymentsData.payments || [] }));
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

  // Create a new booking for a guest
  const createBooking = async (guestId: number, bookingData: Partial<Booking>) => {
    setIsAddingBooking(true);
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
      if (data.error) {
        setError(data.error);
      } else if (data.booking) {
        setGuestBookings(prev => ({
          ...prev,
          [guestId]: [data.booking!, ...(prev[guestId] || [])]
        }));
        setSuccess('Buchung erfolgreich erstellt');
        setAddingBookingForGuest(null);
      }
    } catch (err) {
      setError('Fehler beim Erstellen der Buchung');
      console.error(err);
    } finally {
      setIsAddingBooking(false);
    }
  };

  // Save edited booking
  const saveBooking = async (
    bookingData: Partial<Booking> & { id: number },
    uploadedFile?: File,
    guestUpdates?: { address?: string }
  ) => {
    setIsSavingBooking(true);
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(bookingData)
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

            if (docResult.success && docResult.r2_key) {
              const additionalCosts = data.booking.additional_costs ? JSON.parse(data.booking.additional_costs) : {};
              additionalCosts.document = {
                r2_key: docResult.r2_key,
                filename: uploadedFile.name,
                type: uploadedFile.type,
                uploaded_at: new Date().toISOString()
              };
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
  const updateBookingPaymentStatus = async (
    bookingId: number,
    field: 'deposit_paid' | 'final_payment_paid',
    value: number
  ) => {
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
      const booking = Object.values(guestBookings).flat().find(b => b.id === bookingId);
      let existingCosts = {};
      if (booking?.additional_costs) {
        try {
          existingCosts = JSON.parse(booking.additional_costs);
        } catch { /* ignore */ }
      }

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
        setAllTasks(prev =>
          prev.map(t => t.id === taskId ? data.task! : t)
        );
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
        newSet.clear();
        newSet.add(guestId);
      }
      return newSet;
    });

    if (!wasExpanded) {
      await Promise.all([
        loadGuestEmails(guestId),
        loadGuestTasks(guestId),
        loadGuestBookings(guestId),
        loadGuestCosts(guestId),
        loadGuestNotes(guestId)
      ]);
    }
  };

  // Open guest detail view
  const openGuestDetail = async (guest: Guest) => {
    setSelectedGuest(guest);
    await Promise.all([
      loadGuestEmails(guest.id),
      loadGuestTasks(guest.id)
    ]);
  };

  // Close guest detail view
  const closeGuestDetail = () => {
    setSelectedGuest(null);
    setGuestEmails([]);
    setGuestTasks([]);
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
  const updateGuestStatus = async (guestId: number, newStatus: string) => {
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
      } else {
        loadGuests();
      }
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
        setGuests(guests.map(g =>
          g.id === guestId ? { ...g, [updateField]: isPaid ? 1 : 0 } : g
        ));

        const correspondingTask = guestTasks.find(t => t.guest_id === guestId && t.title === taskTitle);
        if (correspondingTask) {
          const newTaskStatus = isPaid ? 1 : 0;
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
        setGuests(guests.map(g =>
          g.id === guestId ? { ...g, ...updates } : g
        ));
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren');
      console.error(err);
    }
  };

  // Create new guest or add booking to existing guest
  const handleCreateGuest = async (
    newGuest: Partial<Guest>,
    bookingMode: 'new' | 'existing',
    selectedExistingGuestId: number | null,
    createStandardTasks: boolean,
    importFile: File | null,
    extractedNetRent: number | null,
    isPlatformPayment: boolean,
    extractedCommunication: string | null
  ) => {
    if (bookingMode === 'existing') {
      if (!selectedExistingGuestId) {
        setError('Bitte wählen Sie einen Gast aus');
        return;
      }

      setIsSaving(true);
      try {
        const isFeWo = newGuest.platform === 'FeWo';

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
          if (extractedCommunication && bookingData.booking) {
            try {
              const bookingNumber = newGuest.booking_number || 'Import';
              await fetch('/api/admin/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-password': adminPassword
                },
                body: JSON.stringify({
                  guest_id: selectedExistingGuestId,
                  subject: `Kommunikation aus PDF-Import (${bookingNumber})`,
                  body_text: extractedCommunication,
                  folder: 'CHAT',
                  date_sent: new Date().toISOString(),
                  is_incoming: 1,
                  is_read: 1,
                  from_address: 'PDF Import',
                  to_address: null,
                  message_id: `pdf-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                })
              });
            } catch (e) {
              console.error('Error saving extracted communication:', e);
            }
          }

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
                headers: { 'x-admin-password': adminPassword },
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
        setStatusFilter('');
        setSortColumn('id');
        setSortDirection('desc');
        loadGuests();

        if (data.guest && createStandardTasks) {
          let taskErrors = 0;
          const isBookingCom = data.guest.platform?.toLowerCase().includes('booking');
          const isFeWo = data.guest.platform === 'FeWo';
          const bookingComNATasks = ['angebot', 'vertrag', 'anzahlung', 'restzahlung'];
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
                        is_completed: 2
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

          if (extractedCommunication) {
            try {
              const bookingNumber = data.guest.booking_number || 'Import';
              await fetch('/api/admin/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-password': adminPassword
                },
                body: JSON.stringify({
                  guest_id: data.guest.id,
                  subject: `Kommunikation aus PDF-Import (${bookingNumber})`,
                  body_text: extractedCommunication,
                  folder: 'CHAT',
                  date_sent: new Date().toISOString(),
                  is_incoming: 1,
                  is_read: 1,
                  from_address: 'PDF Import',
                  to_address: null,
                  message_id: `pdf-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                })
              });
            } catch (e) {
              console.error('Error saving extracted communication:', e);
            }
          }

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
                headers: { 'x-admin-password': adminPassword },
                body: formData
              });
            } catch (e) {
              console.error('Error saving import file as document:', e);
            }
          }

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

  // Ensure standard tasks exist for a guest
  const ensureStandardTasks = async (guestId: number, existingTasks: Task[], guest: Guest): Promise<Task[]> => {
    const existingTitles = existingTasks.map(t => t.title);
    const missingTasks = STANDARD_TASKS.filter(st => !existingTitles.includes(st.title));

    if (missingTasks.length === 0) return existingTasks;

    const newTasks: Task[] = [];
    for (const st of missingTasks) {
      try {
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
            description: `[STANDARD:${st.key}]`
          })
        });
        const data = await response.json() as { task?: Task };
        if (data.task) {
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
      const response = await fetch(`/api/admin/tasks?guest_id=${guestId}&show_completed=true`);
      const data = await response.json() as { tasks?: Task[]; error?: string };
      let tasks = data.tasks || [];

      const guestObj = guest || guests.find(g => g.id === guestId);
      if (guestObj) {
        tasks = await ensureStandardTasks(guestId, tasks, guestObj);
      }

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

  // Set task status: 0 = pending, 1 = completed, 2 = N/A
  const setTaskStatus = async (taskId: number, newStatus: number) => {
    try {
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

        if (task) {
          const guestField = TASK_TITLE_TO_FIELD[task.title];
          if (guestField) {
            const fieldValue = newStatus === 1 ? 1 : 0;

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
      const response = await fetch(`/api/admin/costs?guest_id=${guestId}`);
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
      const response = await fetch(`/api/admin/guest-documents?guestId=${guestId}`);
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
    if (guestNotes[guestId]) return;

    setLoadingNotes(prev => new Set(prev).add(guestId));
    try {
      const response = await fetch(`/api/admin/notes?guest_id=${guestId}`);
      const data = await response.json() as { notes?: GuestNote[]; error?: string; tableNotFound?: boolean };

      if (data.tableNotFound) {
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

  // Delete a communication entry
  const deleteCommunication = async (emailId: number) => {
    if (!confirm('Kommunikation wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/admin/emails?id=${emailId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });

      const data = await response.json() as { success?: boolean; error?: string };
      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        setGuestEmails(guestEmails.filter(e => e.id !== emailId));
        setSuccess('Kommunikation gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort guests
  const sortedGuests = [...guests].sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal: string | number | null = null;
    let bVal: string | number | null = null;

    switch (sortColumn) {
      case 'id':
        aVal = a.id;
        bVal = b.id;
        break;
      case 'guest_name':
        aVal = a.guest_name.toLowerCase();
        bVal = b.guest_name.toLowerCase();
        break;
      case 'platform':
        aVal = (a.platform || '').toLowerCase();
        bVal = (b.platform || '').toLowerCase();
        break;
      case 'arrival_date':
        aVal = a.arrival_date || '';
        bVal = b.arrival_date || '';
        break;
      case 'rental_price': {
        const aBookings = guestBookings[a.id] || [];
        const bBookings = guestBookings[b.id] || [];
        aVal = aBookings.length > 0
          ? aBookings.reduce((sum, booking) => sum + (booking.rental_price || 0), 0)
          : a.rental_price;
        bVal = bBookings.length > 0
          ? bBookings.reduce((sum, booking) => sum + (booking.rental_price || 0), 0)
          : b.rental_price;
        break;
      }
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
    }

    if (aVal === null || aVal === '') return 1;
    if (bVal === null || bVal === '') return -1;

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter out completed guests if hideCompleted is true (using effective status)
  const displayedGuests = hideCompleted
    ? sortedGuests.filter(g => {
        const effectiveStatus = getEffectiveStatus(g, guestBookings);
        return effectiveStatus !== 'completed' && effectiveStatus !== 'cancelled';
      })
    : sortedGuests;

  // Count of hidden completed guests
  const completedCount = sortedGuests.filter(g => {
    const effectiveStatus = getEffectiveStatus(g, guestBookings);
    return effectiveStatus === 'completed' || effectiveStatus === 'cancelled';
  }).length;

  // Get unique years from guests
  const years = [...new Set(guests.map(g => g.year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));

  return {
    // State
    guests,
    setGuests,
    emails,
    setEmails,
    loading,
    error,
    setError,
    success,
    setSuccess,
    activeView,
    setActiveView,
    searchTerm,
    setSearchTerm,
    yearFilter,
    setYearFilter,
    statusFilter,
    setStatusFilter,
    hideCompleted,
    setHideCompleted,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    selectedGuest,
    setSelectedGuest,
    guestEmails,
    setGuestEmails,
    loadingEmails,
    selectedEmail,
    setSelectedEmail,
    editingGuest,
    setEditingGuest,
    isSaving,
    isCreatingGuest,
    setIsCreatingGuest,
    guestTasks,
    setGuestTasks,
    loadingTasks,
    allTasks,
    loadingAllTasks,
    guestCosts,
    loadingCosts,
    isSyncing,
    syncResults,
    expandedRows,
    guestProfileTab,
    setGuestProfileTab,
    guestDocuments,
    loadingDocuments,
    uploadingDocument,
    guestNotes,
    loadingNotes,
    guestBookings,
    guestRonaldPayments,
    loadingBookings,
    allBookingsLoaded,
    isAddingBooking,
    addingBookingForGuest,
    setAddingBookingForGuest,
    editingBooking,
    setEditingBooking,
    isSavingBooking,
    showSetup,
    setShowSetup,
    setupStatus,
    isRunningSetup,
    setupResults,
    isImportingFewo,
    fewoImportResult,
    fewoPreview,
    initialLoadDone,
    // Derived state
    sortedGuests,
    displayedGuests,
    completedCount,
    years,
    // Functions
    loadGuests,
    loadAllBookings,
    loadAllTasks,
    loadGuestEmails,
    loadGuestTasks,
    loadGuestBookings,
    loadGuestCosts,
    loadGuestDocuments,
    loadGuestNotes,
    checkSetupStatus,
    runSetupAction,
    runMigration,
    loadFewoPreview,
    importFewoBookings,
    syncEmails,
    createBooking,
    saveBooking,
    updateBookingStatus,
    updateBookingCleaningCash,
    updateBookingPaymentStatus,
    updateBookingTransactions,
    toggleTaskStatus,
    toggleRow,
    openGuestDetail,
    closeGuestDetail,
    openEditModal,
    closeEditModal,
    saveGuest,
    deleteGuest,
    updateGuestStatus,
    togglePayment,
    updateGuest,
    handleCreateGuest,
    setTaskStatus,
    cycleTaskStatus,
    deleteTask,
    deleteCost,
    uploadDocument,
    deleteDocument,
    addNote,
    updateNote,
    deleteNote,
    deleteCommunication,
    handleSort,
  };
}
