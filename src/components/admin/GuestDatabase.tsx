'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Mail, Phone, Calendar, Euro, Search, ChevronDown, ChevronUp,
  RefreshCw, Download, Upload, Edit3, Trash2, X, Check, AlertCircle,
  Loader2, MessageSquare, ExternalLink, Filter, Plus, Save, Home, Dog,
  Database, Settings, CheckCircle2, Circle, Play, ArrowUpDown, ArrowUp, ArrowDown,
  ListTodo, UserCircle, MessageCircle, CalendarDays, ChevronLeft, ChevronRight,
  AlertTriangle, FileText, CalendarRange, ArrowRight
} from 'lucide-react';
import { calculateUtilityCostsForBooking } from './UtilityCostsCalculator';

// Import from modular guest-database
import {
  // Types
  type Guest,
  type Email,
  type Task,
  type Booking,
  type GuestCost,
  type RonaldPayment,
  type GuestDocument,
  type GuestNote,
  type SortColumn,
  type SortDirection,
  type GuestProfileTab,
  type GuestsResponse,
  type EmailsResponse,
  type GuestResponse,
  type BookingsResponse,
  type SetupStatus,
  // Constants
  COST_TYPES,
  ASSIGNEES,
  STANDARD_TASKS,
  PLATFORMS,
  // Components
  FlagIcon,
  NationalityFlags,
  AdminCalendar,
  GuestEditModal,
  EmailViewerModal,
  // Tab Components
  GuestOverviewTab,
  GuestTasksTab,
  GuestDocumentsTab,
  GuestCommunicationTab,
  GuestBookingsTab,
  // Modals
  NewBookingModal,
  EditBookingModal,
  CreateGuestModal,
} from './guest-database';

interface GuestDatabaseProps {
  adminPassword: string;
  onDataLoaded?: () => void;
}

export default function GuestDatabase({ adminPassword, onDataLoaded }: GuestDatabaseProps) {
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
  const [setupStatus, setSetupStatus] = useState<{
    guestsTableExists: boolean;
    emailsTableExists: boolean;
    guestsCount: number;
    emailsCount: number;
  } | null>(null);
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

  // Local Storage Cache Keys
  const CACHE_KEY_GUESTS = 'natberger_guests_cache';
  const CACHE_KEY_TIMESTAMP = 'natberger_guests_timestamp';
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
    if (guests.length > 0 && !loading && !yearFilter && !statusFilter && !searchTerm) {
      saveGuestsToCache(guests);
    }
  }, [guests, loading, yearFilter, statusFilter, searchTerm, saveGuestsToCache]);

  // Load guests (mit Local Storage Cache)
  const loadGuests = useCallback(async (forceRefresh = false) => {
    // Bei Tab-Wechsel erst aus Cache laden (wenn keine Filter aktiv)
    if (!forceRefresh && !yearFilter && !statusFilter && !searchTerm) {
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
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(url + params.toString());
      const data = await response.json() as GuestsResponse;

      if (data.error) {
        setError(data.error);
      } else {
        const newGuests = data.guests || [];
        setGuests(newGuests);
        // Cache nur wenn keine Filter aktiv sind (vollständige Daten)
        if (!yearFilter && !statusFilter && !searchTerm) {
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
  }, [yearFilter, statusFilter, searchTerm, initialLoadDone, onDataLoaded, loadGuestsFromCache, saveGuestsToCache]);

  // Load all bookings at once (for display in table)
  const loadAllBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/bookings');
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

  // Get the latest (newest) booking for a guest - considering main booking AND additional bookings
  const getLatestBooking = useCallback((guest: Guest): { arrival: string | null; departure: string | null } => {
    const additionalBookings = guestBookings[guest.id] || [];

    // Collect all bookings (main + additional)
    const allBookings = [
      { arrival_date: guest.arrival_date, departure_date: guest.departure_date },
      ...additionalBookings.map(b => ({ arrival_date: b.arrival_date, departure_date: b.departure_date }))
    ].filter(b => b.arrival_date);

    if (allBookings.length === 0) {
      return { arrival: guest.arrival_date, departure: guest.departure_date };
    }

    // Sort by arrival_date descending (newest first)
    allBookings.sort((a, b) => {
      const dateA = new Date(a.arrival_date!).getTime();
      const dateB = new Date(b.arrival_date!).getTime();
      return dateB - dateA;
    });

    return { arrival: allBookings[0].arrival_date, departure: allBookings[0].departure_date };
  }, [guestBookings]);

  // Calculate effective status - active if ANY booking is in the future
  const getEffectiveStatus = useCallback((guest: Guest): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const additionalBookings = guestBookings[guest.id] || [];

    // Check main booking
    if (guest.departure_date && new Date(guest.departure_date) >= today) {
      return 'active';
    }

    // Check additional bookings
    for (const booking of additionalBookings) {
      if (booking.status !== 'cancelled' && booking.departure_date && new Date(booking.departure_date) >= today) {
        return 'active';
      }
    }

    // No future bookings - return original status
    return guest.status || 'completed';
  }, [guestBookings]);

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
      const data = await response.json() as { success: boolean; status: typeof setupStatus };
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
        // Refresh status and guests
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
          // Reload all bookings
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
      // Check if tables exist
      const checkResponse = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ action: 'check_setup_status' })
      });
      const checkData = await checkResponse.json() as { success: boolean; status?: typeof setupStatus };

      // If guests table doesn't exist, create all tables automatically
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

  useEffect(() => {
    // First ensure tables exist, then load data
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

      // Check for server errors before parsing JSON
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
        // Check if response is HTML (error page)
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
      // Load bookings and Ronald payments in parallel
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
        // Add to local state
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
      // Update booking in bookings table
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
    isPlatformPayment: boolean,
    extractedCommunication: string | null
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
          // Create communication record if extracted from PDF
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

          // Create communication record if extracted from PDF
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
      const response = await fetch(`/api/admin/tasks?guest_id=${guestId}&show_completed=true`);
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
    if (guestNotes[guestId]) return; // Already loaded

    setLoadingNotes(prev => new Set(prev).add(guestId));
    try {
      const response = await fetch(`/api/admin/notes?guest_id=${guestId}`);
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

  // Calculate nights between two dates
  const calculateNights = (arrival: string | null, departure: string | null): number => {
    if (!arrival || !departure) return 0;
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    const diffTime = departureDate.getTime() - arrivalDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate Kurtaxe for a guest
  const calculateKurtaxe = (guest: Guest): number => {
    const nights = calculateNights(guest.arrival_date, guest.departure_date);
    return nights * guest.adults * 2.70;
  };

  // Calculate total costs for a guest
  const calculateTotalCosts = (guest: Guest): number => {
    return guestCosts.reduce((sum, cost) => sum + cost.amount, 0);
  };

  // Calculate Mietertrag (rental income = rent - costs)
  const calculateMietertrag = (guest: Guest): number => {
    const totalCosts = calculateTotalCosts(guest);
    return guest.rental_price - totalCosts;
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
        // Remove from guest emails list
        setGuestEmails(guestEmails.filter(e => e.id !== emailId));
        setSuccess('Kommunikation gelöscht');
      }
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  // Normalize platform name for display
  const normalizePlatformDisplay = (platform: string | null): string => {
    if (!platform) return '-';
    const lower = platform.toLowerCase();
    if (lower.includes('whats')) return 'WhatsApp';
    if (lower.includes('feratel') || lower.includes('kaernten') || lower.includes('kärnten')) return 'Feratel';
    if (lower.includes('fewo') || lower.includes('ferienwohnung')) return 'FeWo';
    if (lower.includes('booking')) return 'Booking.com';
    if (lower.includes('airbnb')) return 'Airbnb';
    if (lower.includes('privat')) return 'Privat';
    if (lower.includes('mail') || lower.includes('direkt')) return 'E-Mail';
    return platform;
  };

  // Get platform badge style
  const getPlatformBadgeStyle = (platform: string): string => {
    const lower = platform.toLowerCase();
    if (lower.includes('fewo')) return 'bg-orange-100 text-orange-700';
    if (lower.includes('airbnb')) return 'bg-pink-100 text-pink-700';
    if (lower.includes('booking')) return 'bg-blue-100 text-blue-700';
    if (lower.includes('whats')) return 'bg-lime-100 text-lime-700';
    if (lower.includes('mail') || lower.includes('direkt')) return 'bg-green-100 text-green-700';
    if (lower.includes('feratel') || lower.includes('kaernten') || lower.includes('kärnten')) return 'bg-cyan-100 text-cyan-700';
    if (lower.includes('privat')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Get all unique platforms for a guest (from guest record + bookings)
  const getGuestPlatforms = (guest: Guest): string[] => {
    const platforms = new Set<string>();

    // Add guest's main platform(s) - can be comma-separated
    if (guest.platform) {
      guest.platform.split(',').forEach(p => {
        const normalized = normalizePlatformDisplay(p.trim());
        if (normalized !== '-') platforms.add(normalized);
      });
    }

    // Add platforms from bookings
    const bookings = guestBookings[guest.id] || [];
    bookings.forEach(b => {
      if (b.platform) {
        const normalized = normalizePlatformDisplay(b.platform);
        if (normalized !== '-') platforms.add(normalized);
      }
    });

    return Array.from(platforms);
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Parse guest name to extract name and address
  const parseGuestInfo = (guestName: string, address: string | null) => {
    // If address field is filled, use it directly
    if (address) {
      return { name: guestName, address };
    }

    // Try to extract address from combined guest_name field
    // Pattern: "Name Straße Nr PLZ Ort" or "Name + Name Straße Nr PLZ Ort"
    const lines = guestName.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean);

    if (lines.length === 1) {
      // Try to find address pattern (street with number, postal code)
      const match = guestName.match(/^(.+?)\s+([A-Za-zäöüßÄÖÜ]+(?:str(?:aße|\.)?|weg|allee|platz|gasse)\s*\.?\s*\d+.*)$/i);
      if (match) {
        return { name: match[1].trim(), address: match[2].trim() };
      }
      // Try postal code pattern
      const postalMatch = guestName.match(/^(.+?)\s+(\d{4,5}\s+.+)$/);
      if (postalMatch) {
        return { name: postalMatch[1].trim(), address: postalMatch[2].trim() };
      }
      return { name: guestName, address: null };
    }

    // Multiple lines - first is name, rest is address
    return { name: lines[0], address: lines.slice(1).join(', ') };
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
      case 'rental_price':
        // Calculate from bookings if available
        const aBookings = guestBookings[a.id] || [];
        const bBookings = guestBookings[b.id] || [];
        aVal = aBookings.length > 0
          ? aBookings.reduce((sum, booking) => sum + (booking.rental_price || 0), 0)
          : a.rental_price;
        bVal = bBookings.length > 0
          ? bBookings.reduce((sum, booking) => sum + (booking.rental_price || 0), 0)
          : b.rental_price;
        break;
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
        const effectiveStatus = getEffectiveStatus(g);
        return effectiveStatus !== 'completed' && effectiveStatus !== 'cancelled';
      })
    : sortedGuests;

  // Count of hidden completed guests (using effective status)
  const completedCount = sortedGuests.filter(g => {
    const effectiveStatus = getEffectiveStatus(g);
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            Gästedatenbank
          </h2>
          <p className="text-sm text-gray-600">
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
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveView('guests')}
          className={`px-4 py-2 rounded-t-lg flex items-center gap-2 font-medium transition-colors ${
            activeView === 'guests'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Gäste
        </button>
        <button
          onClick={() => setActiveView('calendar')}
          className={`px-4 py-2 rounded-t-lg flex items-center gap-2 font-medium transition-colors ${
            activeView === 'calendar'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Kalender
        </button>
        <button
          onClick={() => setActiveView('tasks')}
          className={`px-4 py-2 rounded-t-lg flex items-center gap-2 font-medium transition-colors ${
            activeView === 'tasks'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      <div className="bg-white rounded-xl shadow-sm p-4">
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
              <option value="pending">Ausstehend</option>
              <option value="completed">Abgeschlossen</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1">
                      Nr.
                      <SortIcon column="id" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('guest_name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIcon column="guest_name" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('arrival_date')}
                  >
                    <div className="flex items-center gap-1">
                      Zeitraum
                      <SortIcon column="arrival_date" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('platform')}
                  >
                    <div className="flex items-center gap-1">
                      Kanal
                      <SortIcon column="platform" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adresse
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontakt
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pers.
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rental_price')}
                  >
                    <div className="flex items-center gap-1">
                      Preis
                      <SortIcon column="rental_price" />
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
                  const guestInfo = parseGuestInfo(guest.guest_name, guest.address);
                  // Display number based on position in full sorted list (stays constant when filtering)
                  const fullIndex = sortedGuests.findIndex(g => g.id === guest.id);
                  const displayNumber = sortDirection === 'desc'
                    ? sortedGuests.length - fullIndex
                    : fullIndex + 1;
                  return (
                  <>
                    <tr
                      key={guest.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(guest.id)}
                    >
                      <td className="px-3 py-3 text-gray-500">
                        <div className="flex items-center gap-1">
                          {expandedRows.has(guest.id) ? (
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          )}
                          {displayNumber}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <NationalityFlags nationality={guest.nationality} size="tiny" round />
                          {guestInfo.name}
                          {guest.is_returning_guest === 1 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                              Stammgast
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          const latestBooking = getLatestBooking(guest);
                          return (
                            <div className="text-xs">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {formatDate(latestBooking.arrival)}
                              </div>
                              <div className="text-gray-500">
                                bis {formatDate(latestBooking.departure)}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          const platforms = getGuestPlatforms(guest);
                          return platforms.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {platforms.map((platform, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPlatformBadgeStyle(platform)}`}
                                >
                                  {platform}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 text-gray-600 max-w-[200px]">
                        {guestInfo.address ? (
                          <span className="text-xs leading-tight block">{guestInfo.address}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-0.5">
                          {guest.email && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{guest.email}</span>
                            </div>
                          )}
                          {guest.phone && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{guest.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          {guest.adults} Erw.
                          {guest.children > 0 && `, ${guest.children} Ki.`}
                          {guest.pets && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Dog className="w-3 h-3" />
                              {guest.pets}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          // Calculate total rental price from bookings
                          const bookings = guestBookings[guest.id] || [];
                          const bookingCount = bookings.length;
                          const totalRentalPrice = bookingCount > 0
                            ? bookings.reduce((sum, b) => sum + (b.rental_price || 0), 0)
                            : guest.rental_price;
                          return (
                            <>
                              <div className="text-xs font-medium text-gray-900">
                                {formatCurrency(totalRentalPrice)}
                                {bookingCount > 1 && (
                                  <span className="text-gray-400 font-normal ml-1">
                                    ({bookingCount})
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const effectiveStatus = getEffectiveStatus(guest);
                          return (
                            <div className="flex flex-col gap-1">
                              <select
                                value={guest.status}
                                onChange={(e) => updateGuestStatus(guest.id, e.target.value)}
                                className={`px-1.5 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${
                                  effectiveStatus === 'active' ? 'bg-green-100 text-green-800' :
                                  effectiveStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  effectiveStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                <option value="active">Aktiv</option>
                                <option value="pending">Ausstehend</option>
                                <option value="completed">Abgeschlossen</option>
                            <option value="cancelled">Storniert</option>
                          </select>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(guest)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title="Bearbeiten"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteGuest(guest.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded row with full details */}
                    {expandedRows.has(guest.id) && (
                      <tr key={`expanded-${guest.id}`}>
                        <td colSpan={10} className="px-4 py-4 bg-gray-50 border-t-2 border-primary/20">
                          {/* Tab Navigation */}
                          <div className="flex gap-1 mb-4 border-b border-gray-200">
                            <button
                              onClick={(e) => { e.stopPropagation(); setGuestProfileTab('overview'); loadGuestNotes(guest.id); }}
                              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                                guestProfileTab === 'overview'
                                  ? 'bg-white text-primary border-t border-l border-r border-gray-200 -mb-px'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              Übersicht
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setGuestProfileTab('bookings'); loadGuestDocuments(guest.id); }}
                              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                                guestProfileTab === 'bookings'
                                  ? 'bg-white text-primary border-t border-l border-r border-gray-200 -mb-px'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <CalendarRange className="w-4 h-4" />
                              Buchungen
                              {guestBookings[guest.id]?.length > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">
                                  {guestBookings[guest.id].length}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setGuestProfileTab('tasks'); }}
                              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                                guestProfileTab === 'tasks'
                                  ? 'bg-white text-primary border-t border-l border-r border-gray-200 -mb-px'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <ListTodo className="w-4 h-4" />
                              Aufgaben
                              {guestTasks.filter(t => !t.is_completed).length > 0 && (
                                <span className="bg-purple-100 text-purple-700 text-xs px-1.5 rounded-full">
                                  {guestTasks.filter(t => !t.is_completed).length}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Tab Content */}
                          <div className="bg-white rounded-lg p-4">
                            {/* Overview Tab */}
                            {guestProfileTab === 'overview' && (
                              <GuestOverviewTab
                                guest={guest}
                                bookings={guestBookings[guest.id] || []}
                                ronaldPayments={guestRonaldPayments[guest.id] || []}
                                adminPassword={adminPassword}
                                notes={guestNotes[guest.id] || []}
                                notesLoading={loadingNotes.has(guest.id)}
                                onAddNote={(content) => addNote(guest.id, content)}
                                onUpdateNote={(noteId, content) => updateNote(guest.id, noteId, content)}
                                onDeleteNote={(noteId) => deleteNote(guest.id, noteId)}
                              />
                            )}

                            {/* Bookings Tab */}
                            {guestProfileTab === 'bookings' && (
                              <GuestBookingsTab
                                guest={guest}
                                bookings={guestBookings[guest.id] || []}
                                ronaldPayments={guestRonaldPayments[guest.id] || []}
                                documents={guestDocuments}
                                loading={loadingBookings.has(guest.id)}
                                onAddBooking={() => setAddingBookingForGuest(guest.id)}
                                onUpdateBookingStatus={updateBookingStatus}
                                onEditBooking={(booking) => setEditingBooking(booking)}
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
                              />
                            )}

                            {/* Tasks Tab */}
                            {guestProfileTab === 'tasks' && (
                              <GuestTasksTab
                                tasks={guestTasks}
                                loading={loadingTasks}
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
                                onCycleStatus={(taskId, currentStatus) => {
                                  cycleTaskStatus(taskId, currentStatus);
                                }}
                              />
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
        </>
      )}

      {/* === CALENDAR VIEW === */}
      {activeView === 'calendar' && (
        <AdminCalendar
          guests={guests}
          onSwitchToGuests={() => setActiveView('guests')}
          onSelectGuest={(guestId) => {
            const guest = guests.find(g => g.id === guestId);
            if (guest) {
              setActiveView('guests');
              openGuestDetail(guest);
            }
          }}
        />
      )}

      {/* === TASKS VIEW === */}
      {activeView === 'tasks' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Offene Aufgaben
            </h3>
            <button
              onClick={loadAllTasks}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAllTasks ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>

          {loadingAllTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : allTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium">Keine offenen Aufgaben</p>
              <p className="text-sm">Alle Aufgaben wurden erledigt!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Group tasks by guest */}
              {(() => {
                const tasksByGuest = allTasks.reduce((acc, task) => {
                  if (!acc[task.guest_id]) {
                    acc[task.guest_id] = [];
                  }
                  acc[task.guest_id].push(task);
                  return acc;
                }, {} as Record<number, Task[]>);

                return Object.entries(tasksByGuest).map(([guestIdStr, tasks]) => {
                  const guestId = parseInt(guestIdStr);
                  const guest = guests.find(g => g.id === guestId);
                  if (!guest) return null;

                  return (
                    <div key={guestId} className="p-4 hover:bg-gray-50">
                      {/* Guest Header */}
                      <div
                        className="flex items-center justify-between mb-3 cursor-pointer"
                        onClick={() => {
                          setActiveView('guests');
                          openGuestDetail(guest);
                          setGuestProfileTab('tasks');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 hover:text-primary">
                              {guest.guest_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(() => {
                                const latestBooking = getLatestBooking(guest);
                                return latestBooking.arrival && latestBooking.departure
                                  ? `${new Date(latestBooking.arrival).toLocaleDateString('de-DE')} - ${new Date(latestBooking.departure).toLocaleDateString('de-DE')}`
                                  : 'Keine Buchungsdaten';
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            {tasks.filter(t => t.is_completed === 0).length} offen
                          </span>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      {/* Task List */}
                      <div className="ml-13 space-y-2">
                        {tasks.map(task => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-2 rounded-lg ${
                              task.is_completed ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-200'
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskStatus(task.id, !task.is_completed);
                              }}
                              className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                                task.is_completed
                                  ? 'bg-green-500 text-white'
                                  : 'border-2 border-gray-300 hover:border-primary'
                              }`}
                            >
                              {task.is_completed ? <Check className="w-3 h-3" /> : null}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {task.title}
                              </p>
                              {task.due_date && (
                                <p className="text-xs text-gray-400">
                                  Fällig: {new Date(task.due_date).toLocaleDateString('de-DE')}
                                </p>
                              )}
                            </div>
                            {task.assigned_to && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {task.assigned_to}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
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

      {/* Email Viewer Modal */}
      {selectedEmail && (
        <EmailViewerModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
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
      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={addingBookingForGuest !== null}
        guestId={addingBookingForGuest || 0}
        isSubmitting={isAddingBooking}
        onClose={() => setAddingBookingForGuest(null)}
        onCreateBooking={createBooking}
      />

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          isSubmitting={isSavingBooking}
          adminPassword={adminPassword}
          onClose={() => setEditingBooking(null)}
          onSave={saveBooking}
          onSuccess={setSuccess}
          onError={setError}
        />
      )}

    </div>
  );
}
