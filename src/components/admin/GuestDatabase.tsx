'use client';

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
  // Hooks
  useGuestDatabase,
  // Utils
  formatDate,
  formatCurrency,
  parseGuestInfo,
  normalizePlatformDisplay,
  getPlatformBadgeStyle,
  getGuestPlatforms,
  getLatestBooking,
  getEffectiveStatus,
  SortIcon,
} from './guest-database';

interface GuestDatabaseProps {
  adminPassword: string;
  onDataLoaded?: () => void;
}

export default function GuestDatabase({ adminPassword, onDataLoaded }: GuestDatabaseProps) {
  const {
    // State
    guests,
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
    sortDirection,
    selectedGuest,
    guestEmails,
    loadingEmails,
    selectedEmail,
    setSelectedEmail,
    editingGuest,
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
    isAddingBooking,
    addingBookingForGuest,
    setAddingBookingForGuest,
    editingBooking,
    setEditingBooking,
    isSavingBooking,
    // Derived state
    sortedGuests,
    displayedGuests,
    completedCount,
    years,
    // Functions
    loadGuests,
    loadAllTasks,
    loadGuestDocuments,
    loadGuestNotes,
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
    handleCreateGuest,
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
  } = useGuestDatabase({ adminPassword, onDataLoaded });

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
                      <SortIcon column="id" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('guest_name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIcon column="guest_name" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('arrival_date')}
                  >
                    <div className="flex items-center gap-1">
                      Zeitraum
                      <SortIcon column="arrival_date" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('platform')}
                  >
                    <div className="flex items-center gap-1">
                      Kanal
                      <SortIcon column="platform" sortColumn={sortColumn} sortDirection={sortDirection} />
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
                      <SortIcon column="rental_price" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon column="status" sortColumn={sortColumn} sortDirection={sortDirection} />
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
                          const latestBooking = getLatestBooking(guest, guestBookings);
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
                          const platforms = getGuestPlatforms(guest, guestBookings);
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
                          const effectiveStatus = getEffectiveStatus(guest, guestBookings);
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
                                const latestBooking = getLatestBooking(guest, guestBookings);
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
            setSuccess('');
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
