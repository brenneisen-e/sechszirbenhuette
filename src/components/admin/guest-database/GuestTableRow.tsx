'use client';

import {
  Mail, Phone, Calendar, ChevronDown, ChevronUp,
  Edit3, Trash2, Users, ListTodo, CalendarRange
} from 'lucide-react';
import type {
  Guest, Booking, Task, BankPayment,
  GuestDocument, GuestNote, GuestProfileTab
} from './types';
import type { PricingSettings } from '../utility-costs';
import { NationalityFlags } from './FlagIcon';
import {
  formatDate, formatCurrency, parseGuestInfo,
  getGuestPlatforms, getPlatformBadgeStyle,
  getEffectiveBookingAmount,
} from './helpers';
import { getStatusClasses } from './constants';
import { GuestOverviewTab } from './tabs';
import { GuestBookingsTab } from './tabs';
import { GuestTasksTab } from './tabs';
import {
  anonymizeGuestName,
  anonymizeEmail,
  anonymizePhone,
  roundDemoAmount,
} from '@/lib/utils/demoMode';

interface GuestTableRowProps {
  guest: Guest;
  isExpanded: boolean;
  displayNumber: number;
  // Related data
  bookings: Booking[];
  bankPayments: BankPayment[];
  guestTasks: Task[];
  guestDocuments: GuestDocument[];
  notes: GuestNote[];
  notesLoading: boolean;
  pricing: PricingSettings;
  loadingBookings: boolean;
  loadingTasks: boolean;
  guestProfileTab: GuestProfileTab;
  adminPassword: string;
  // Row handlers
  onToggleRow: () => void;
  onEditGuest: () => void;
  onDeleteGuest: () => void;
  onUpdateStatus: (status: string) => void;
  // Tab handlers
  onTabChange: (tab: GuestProfileTab) => void;
  onLoadNotes: () => void;
  onLoadDocuments: () => void;
  // Booking handlers
  onAddBooking: () => void;
  onUpdateBookingStatus: (bookingId: number, status: string) => Promise<void>;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: number) => Promise<void>;
  onToggleCleaningCash: (bookingId: number, isCash: boolean) => Promise<void>;
  onTogglePaymentStatus: (bookingId: number, field: 'deposit_paid' | 'final_payment_paid', value: number) => void;
  onUpdateTransactions: (bookingId: number, transactions: Array<{
    date: string;
    amount: number;
    type: 'payment' | 'refund';
    status: string;
    description?: string;
    fee?: number;
  }>, payoutDate: string) => void;
  onUploadDocument: (bookingId: number, guestId: number, file: File) => Promise<void>;
  // Note handlers
  onAddNote: (content: string) => Promise<void>;
  onUpdateNote: (noteId: number, content: string) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
  // Task handlers
  onCreateTask: (title: string, assignee?: string, dueDate?: string) => Promise<void>;
  onUpdateTask: (taskId: number, updates: Record<string, unknown>) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onCycleTaskStatus: (taskId: number, currentStatus: number) => void;
  // Computed helpers
  getLatestBooking: () => { arrival: string | null; departure: string | null };
  getEffectiveStatus: () => string;
  // Demo mode
  demoMode?: boolean;
}

export function GuestTableRow({
  guest,
  isExpanded,
  displayNumber,
  bookings,
  bankPayments,
  guestTasks,
  guestDocuments,
  notes,
  notesLoading,
  pricing,
  loadingBookings,
  loadingTasks,
  guestProfileTab,
  adminPassword,
  onToggleRow,
  onEditGuest,
  onDeleteGuest,
  onUpdateStatus,
  onTabChange,
  onLoadNotes,
  onLoadDocuments,
  onAddBooking,
  onUpdateBookingStatus,
  onEditBooking,
  onDeleteBooking,
  onToggleCleaningCash,
  onTogglePaymentStatus,
  onUpdateTransactions,
  onUploadDocument,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCycleTaskStatus,
  getLatestBooking,
  getEffectiveStatus,
  demoMode = false,
}: GuestTableRowProps) {
  const guestInfo = parseGuestInfo(guest.guest_name, guest.address);
  const platforms = getGuestPlatforms(guest, bookings);
  const effectiveStatus = getEffectiveStatus();

  // Demo mode display helpers
  const displayName = demoMode ? anonymizeGuestName(guest.guest_name) : guestInfo.name;
  const displayEmail = demoMode ? anonymizeEmail(guest.email) : guest.email;
  const displayPhone = demoMode ? anonymizePhone(guest.phone) : guest.phone;
  const demoFormatCurrency = (amount: number) => {
    if (!demoMode) return formatCurrency(amount);
    return `~${roundDemoAmount(amount).toLocaleString('de-DE')} €`;
  };

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={onToggleRow}
      >
        {/* Name */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs w-5 flex items-center gap-0.5">
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {displayNumber}
            </span>
            <NationalityFlags nationality={guest.nationality} size="tiny" round />
            <span className="font-medium text-gray-900">{displayName}</span>
            {guest.is_returning_guest === 1 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                Stammgast
              </span>
            )}
          </div>
        </td>
        {/* Kontakt */}
        <td className="px-3 py-3">
          <div className="text-xs space-y-0.5">
            {(guest.email || (demoMode && guest.email !== null)) && (
              <div className="flex items-center gap-1 text-gray-600">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[160px]">{displayEmail}</span>
              </div>
            )}
            {(guest.phone || (demoMode && guest.phone !== null)) && (
              <div className="flex items-center gap-1 text-gray-500">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{displayPhone}</span>
              </div>
            )}
            {!guest.email && !guest.phone && (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </td>
        {/* Buchungen */}
        <td className="px-3 py-3">
          {(() => {
            const bookingCount = bookings.length;
            if (bookingCount === 0) return <span className="text-xs text-gray-400">Keine Buchungen</span>;
            const latestBooking = getLatestBooking();
            const totalRentalPrice = bookings.reduce((sum, b) => sum + getEffectiveBookingAmount(b), 0);
            return (
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span>{formatDate(latestBooking.arrival)} - {formatDate(latestBooking.departure)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="font-medium text-gray-700">{demoFormatCurrency(totalRentalPrice)}</span>
                  {bookingCount > 1 && (
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                      {bookingCount} Buchungen
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </td>
        {/* Plattform */}
        <td className="px-3 py-3">
          {platforms.length > 0 ? (
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
          )}
        </td>
        {/* Status */}
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <select
            value={effectiveStatus}
            onChange={(e) => onUpdateStatus(e.target.value)}
            className={`px-1.5 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatusClasses(effectiveStatus)}`}
          >
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Storniert</option>
          </select>
        </td>
        {/* Aktionen */}
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              onClick={onEditGuest}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Bearbeiten"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDeleteGuest}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {/* Expanded row with full details */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50 border-t-2 border-primary/20">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-4 border-b border-gray-200">
              <button
                onClick={(e) => { e.stopPropagation(); onTabChange('overview'); onLoadNotes(); }}
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
                onClick={(e) => { e.stopPropagation(); onTabChange('bookings'); onLoadDocuments(); }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                  guestProfileTab === 'bookings'
                    ? 'bg-white text-primary border-t border-l border-r border-gray-200 -mb-px'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                Buchungen
                {bookings.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">
                    {bookings.length}
                  </span>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTabChange('tasks'); }}
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
                  bookings={bookings}
                  bankPayments={bankPayments}
                  adminPassword={adminPassword}
                  notes={notes}
                  notesLoading={notesLoading}
                  onAddNote={onAddNote}
                  onUpdateNote={onUpdateNote}
                  onDeleteNote={onDeleteNote}
                />
              )}

              {/* Bookings Tab */}
              {guestProfileTab === 'bookings' && (
                <GuestBookingsTab
                  guest={guest}
                  bookings={bookings}
                  bankPayments={bankPayments}
                  documents={guestDocuments}
                  loading={loadingBookings}
                  pricing={pricing}
                  onAddBooking={onAddBooking}
                  onUpdateBookingStatus={onUpdateBookingStatus}
                  onEditBooking={onEditBooking}
                  onDeleteBooking={onDeleteBooking}
                  onToggleCleaningCash={onToggleCleaningCash}
                  onTogglePaymentStatus={onTogglePaymentStatus}
                  onUpdateTransactions={onUpdateTransactions}
                  onUploadDocument={(bookingId, guestId, file) => onUploadDocument(bookingId, guestId, file)}
                />
              )}

              {/* Tasks Tab */}
              {guestProfileTab === 'tasks' && (
                <GuestTasksTab
                  tasks={guestTasks}
                  loading={loadingTasks}
                  onCreateTask={onCreateTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onCycleStatus={onCycleTaskStatus}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
