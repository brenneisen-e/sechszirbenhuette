'use client';

import { useState } from 'react';
import {
  Mail, Phone, MapPin, Users, Euro, Calendar, TrendingUp, CalendarRange,
  CheckCircle2, Clock, CreditCard, MessageSquare, Plus, Edit3, Trash2, Save, X, Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import type { Guest, Booking, RonaldPayment, GuestNote } from '../types';
import { FlagIcon } from '../FlagIcon';

interface GuestOverviewTabProps {
  guest: Guest;
  bookings: Booking[];
  ronaldPayments: RonaldPayment[];
  adminPassword: string;
  notes: GuestNote[];
  notesLoading: boolean;
  onAddNote: (content: string) => Promise<void>;
  onUpdateNote: (id: number, content: string) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return formatDateTime(dateString);
}

export function GuestOverviewTab({
  guest,
  bookings,
  ronaldPayments,
  notes,
  notesLoading,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: GuestOverviewTabProps) {
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Note handling functions
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
      setIsAdding(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (id: number) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateNote(id, editContent.trim());
      setEditingId(null);
      setEditContent('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!confirm('Notiz wirklich löschen?')) return;
    setDeletingId(id);
    try {
      await onDeleteNote(id);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (note: GuestNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  // Berechne Gesamtstatistiken - nur aus bookings-Tabelle
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;

  // Gesamtumsatz nur aus bookings-Tabelle
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.rental_price || 0), 0);

  // Gesamtzahlungen (Ronald-Einzahlungen)
  const totalPayments = ronaldPayments.reduce((sum, p) => sum + p.amount, 0);

  // Offener Betrag
  const openAmount = Math.max(0, totalRevenue - totalPayments);

  // Erste und letzte Buchung (nur aus bookings-Tabelle)
  const allArrivalDates = bookings
    .map(b => b.arrival_date)
    .filter(Boolean) as string[];

  const sortedArrivalDates = allArrivalDates.sort();
  const firstBooking = sortedArrivalDates[0];
  const lastBooking = sortedArrivalDates[sortedArrivalDates.length - 1];

  // Gesamtnächte
  const calculateNights = (arrival: string | null, departure: string | null) => {
    if (!arrival || !departure) return 0;
    const diff = new Date(departure).getTime() - new Date(arrival).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const totalNights = bookings.reduce((sum, b) =>
    sum + calculateNights(b.arrival_date, b.departure_date), 0);

  return (
    <div className="space-y-4">
      {/* Kontaktdaten & Notizen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kontaktdaten */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Kontaktdaten
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-gray-900">{guest.guest_name}</span>
              {guest.nationality && <FlagIcon code={guest.nationality} size="small" />}
            </div>
            {guest.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${guest.email}`} className="hover:text-blue-600">
                  {guest.email}
                </a>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${guest.phone}`} className="hover:text-blue-600">
                  {guest.phone}
                </a>
              </div>
            )}
            {guest.address && (
              <div className="flex items-start gap-2 text-gray-600 mt-3 pt-3 border-t border-gray-100">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="whitespace-pre-line">{guest.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notizen */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Notizen
          </h4>

          {notesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Add Note Button/Form */}
              {isAdding ? (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Notiz eingeben..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setIsAdding(false); setNewNote(''); }}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Abbrechen
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isSaving}
                      className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Notiz hinzufügen
                </button>
              )}

              {/* Notes List */}
              {notes.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-2">Keine Notizen</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3 group">
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setEditingId(null); setEditContent(''); }}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Abbrechen
                            </button>
                            <button
                              onClick={() => handleUpdateNote(note.id)}
                              disabled={!editContent.trim() || isSaving}
                              className="px-2 py-1 text-xs bg-primary text-white rounded disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Speichern'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{note.content}</p>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(note)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Bearbeiten"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={deletingId === note.id}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Löschen"
                              >
                                {deletingId === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1" title={formatDateTime(note.created_at)}>
                            {formatRelativeTime(note.created_at)}
                            {note.updated_at !== note.created_at && ' • bearbeitet'}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Buchungen */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <CalendarRange className="w-4 h-4" />
            <span className="text-xs font-medium">Buchungen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
          <p className="text-xs text-gray-500">{completedBookings} abgeschlossen</p>
        </div>

        {/* Nächte */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Nächte gesamt</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalNights}</p>
          <p className="text-xs text-gray-500">über alle Buchungen</p>
        </div>

        {/* Umsatz */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Gesamtumsatz</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue, false)}</p>
          <p className="text-xs text-gray-500">Mieteinnahmen</p>
        </div>

        {/* Zahlungen */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-medium">Eingegangen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPayments, false)}</p>
          {openAmount > 0 ? (
            <p className="text-xs text-red-500">{formatCurrency(openAmount)} offen</p>
          ) : (
            <p className="text-xs text-green-500">Vollständig bezahlt</p>
          )}
        </div>
      </div>

      {/* Buchungshistorie */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Buchungshistorie
        </h4>

        {firstBooking && lastBooking && (
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span>Erste Buchung: <strong>{formatDate(firstBooking)}</strong></span>
            <span>•</span>
            <span>Letzte Buchung: <strong>{formatDate(lastBooking)}</strong></span>
          </div>
        )}

        <div className="space-y-2">
          {/* Alle Buchungen aus bookings-Tabelle */}
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">Keine Buchungen vorhanden</p>
          ) : bookings.map((booking) => {
            const nights = calculateNights(booking.arrival_date, booking.departure_date);
            return (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {booking.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : booking.status === 'cancelled' ? (
                    <span className="w-5 h-5 text-red-500">✕</span>
                  ) : (
                    <Clock className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(booking.arrival_date)} - {formatDate(booking.departure_date)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {nights} Nächte • {booking.adults} Erw.{booking.children > 0 && `, ${booking.children} Ki.`}
                      {booking.platform && ` • ${booking.platform}`}
                    </p>
                  </div>
                </div>
                <span className={`font-medium ${booking.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {formatCurrency(booking.rental_price || 0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zahlungsübersicht */}
      {ronaldPayments.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Zahlungseingänge
          </h4>
          <div className="space-y-2">
            {ronaldPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="text-sm">
                  <span className="text-gray-600">{formatDate(payment.payment_date)}</span>
                  {payment.notes && <span className="text-gray-400 ml-2">• {payment.notes}</span>}
                </div>
                <span className="font-medium text-green-700">+{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-medium">
              <span>Gesamt eingegangen:</span>
              <span className="text-green-600">{formatCurrency(totalPayments)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
