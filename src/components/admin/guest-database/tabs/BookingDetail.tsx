'use client';

import { useState, useRef } from 'react';
import { Calendar, CreditCard, TrendingUp, Plus, CheckCircle2, Circle, Loader2, Check, RotateCcw, Edit3, ChevronDown, ChevronUp, MessageSquare, FileText, X, Upload, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency, nightsBetween } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseTransactionsFromJson,
  parseCommunicationsFromJson,
  parsePayoutDateFromJson,
  parseKomfortpaketFromJson,
  parseChildrenAges,
  parsePrivateConfig,
  type PlatformFees,
} from '@/lib/utils/financeCalculations';
import type { Booking, BankPayment, GuestDocument } from '../types';
import type { PricingSettings } from '../../utility-costs';

// ============================================================================
// WICHTIG: Keine Finanzberechnungen in dieser Komponente!
// Alle Berechnungen erfolgen zentral in lib/utils/financeCalculations.ts
// Diese Komponente zeigt nur die Ergebnisse an.
// ============================================================================

// PDF Viewer Popup Component
function PDFViewerPopup({ url, filename, onClose }: { url: string; filename: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">{filename}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              In neuem Tab öffnen
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={filename}
          />
        </div>
      </div>
    </div>
  );
}

export interface BookingDetailProps {
  booking: Booking;
  guestId: number;
  bankPayments?: BankPayment[];
  bookingDocuments?: GuestDocument[];
  pricing?: PricingSettings;
  onStatusChange?: (status: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleCleaningCash?: (isCash: boolean) => void;
  onUploadDocument?: (file: File) => Promise<void>;
  onTogglePaymentStatus?: (field: 'deposit_paid' | 'final_payment_paid', value: number) => void;
  onUpdateTransactions?: (transactions: Array<{
    date: string;
    amount: number;
    type: 'payment' | 'refund';
    status: string;
    description?: string;
    fee?: number;
  }>, payoutDate: string) => void;
}

// German month name mapping
const GERMAN_MONTHS: Record<string, string> = {
  'jan': '01', 'januar': '01',
  'feb': '02', 'februar': '02',
  'mär': '03', 'märz': '03', 'maer': '03', 'maerz': '03', 'mar': '03',
  'apr': '04', 'april': '04',
  'mai': '05',
  'jun': '06', 'juni': '06',
  'jul': '07', 'juli': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'okt': '10', 'oktober': '10',
  'nov': '11', 'november': '11',
  'dez': '12', 'dezember': '12',
};

// Convert German month name date to standard format
// "07. Okt. 2024 - 22:02" -> "07.10.2024 22:02"
function parseGermanDate(dateStr: string): string | null {
  // Match format: DD. Mon. YYYY - HH:MM or DD. Mon. YYYY
  const match = dateStr.match(/^(\d{1,2})\.\s*([A-Za-zäöü]+)\.?\s+(\d{4})(?:\s*[-–—]\s*(\d{1,2}:\d{2}))?/i);
  if (!match) return null;

  const [, day, monthName, year, time] = match;
  if (!monthName || !day) return null;
  const monthKey = monthName.toLowerCase().replace(/\.$/, '');
  const month = GERMAN_MONTHS[monthKey];

  if (!month) return null;

  const dayPadded = day.padStart(2, '0');
  const timeStr = time ? ` ${time}` : '';
  return `${dayPadded}.${month}.${year}${timeStr}`;
}

// Helper to determine sender and parse message content
function parseMessageContent(
  content: string,
  date: string,
  messages: Array<{ sender: 'host' | 'guest'; text: string; date?: string }>
) {
  // Host indicators: "Sie:", "Sie haben", "Sie die", "Gastgeber:"
  const isHost = /^Sie[:\s]/i.test(content) ||
    /^Sie\s+(haben|die)/i.test(content) ||
    /^Gastgeber:/i.test(content);

  // Guest indicators: "Gast:"
  const isGuest = /^Gast:/i.test(content);

  if (isHost) {
    // Remove "Sie: " or "Gastgeber: " prefix if present
    const text = content.replace(/^(Sie|Gastgeber):\s*/i, '');
    messages.push({ sender: 'host', text, date: date || undefined });
  } else if (isGuest) {
    // Remove "Gast: " prefix
    const text = content.replace(/^Gast:\s*/i, '');
    messages.push({ sender: 'guest', text, date: date || undefined });
  } else {
    // Guest message - remove "Name: " prefix (fallback for old format)
    const nameMatch = content.match(/^([^:]+):\s*/);
    if (nameMatch) {
      const text = content.substring(nameMatch[0].length);
      messages.push({ sender: 'guest', text, date: date || undefined });
    } else {
      messages.push({ sender: 'guest', text: content, date: date || undefined });
    }
  }
}

// Parse communication into chat messages
// Format variations:
// 1. "DD.MM.YYYY" on one line, then message text on following lines
// 2. "DD.MM.YYYY HH:MM - Name: Message" all on one line
// 3. "DD. Mon. YYYY - HH:MM" with German month names (FeWo format)
function parseCommunication(communication: string): Array<{ sender: 'host' | 'guest'; text: string; date?: string }> {
  const messages: Array<{ sender: 'host' | 'guest'; text: string; date?: string }> = [];

  const lines = communication.split('\n');
  let currentDate = '';
  let currentSender: 'host' | 'guest' | null = null;
  let currentText = '';

  // Helper to save current message
  const saveCurrentMessage = () => {
    if (currentText.trim() && currentDate) {
      messages.push({
        sender: currentSender || 'guest',
        text: currentText.trim(),
        date: currentDate
      });
    }
    currentText = '';
    currentSender = null;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for German month name date format: "DD. Mon. YYYY - HH:MM"
    const germanDate = parseGermanDate(trimmedLine);
    if (germanDate) {
      // Save previous message before starting new one
      saveCurrentMessage();
      currentDate = germanDate;
      continue;
    }

    // Check if line is just a numeric date (DD.MM.YYYY)
    const dateOnlyMatch = trimmedLine.match(/^(\d{2}\.\d{2}\.\d{4})$/);
    if (dateOnlyMatch) {
      saveCurrentMessage();
      currentDate = dateOnlyMatch[1] ?? '';
      continue;
    }

    // Check for inline date format: "DD.MM.YYYY HH:MM - ..."
    // Support different dash types: hyphen (-), en-dash (–), em-dash (—)
    const inlineDateMatch = trimmedLine.match(/^(\d{2}\.\d{2}\.\d{4}(?:\s+\d{2}:\d{2})?)\s*[-–—]\s*(.+)$/);
    if (inlineDateMatch) {
      saveCurrentMessage();
      currentDate = inlineDateMatch[1] ?? '';
      const rest = inlineDateMatch[2] ?? '';
      parseMessageContent(rest, currentDate, messages);
      continue;
    }

    // Check for message format: "XX - Name: Message" or "XX - Sie haben..."
    // Support different dash types: hyphen (-), en-dash (–), em-dash (—)
    const msgMatch = trimmedLine.match(/^\d+\s*[-–—]\s*(.+)$/);
    if (msgMatch) {
      parseMessageContent(msgMatch[1] ?? '', currentDate, messages);
      continue;
    }

    // Accumulate text for current message
    // Determine sender from content patterns if not yet determined
    if (!currentSender) {
      // Host patterns: "Sehr geehrte/r ..." (host writing to guest), formal greeting
      // Guest patterns: responses, questions, etc.
      // Common host indicators: starts with formal greeting to guest
      if (/^Sehr geehrte/i.test(trimmedLine) || /^Liebe(?:r|s)?\s/i.test(trimmedLine)) {
        // This is the sender greeting the recipient - check if it mentions the owner name
        // If greeting mentions "Brenneisen" then it's likely from guest to host
        // If greeting doesn't mention owner, it's likely from host to guest
        if (/Brenneisen/i.test(trimmedLine)) {
          currentSender = 'guest';
        } else {
          currentSender = 'host';
        }
      } else if (/^Vielen Dank für Ihr/i.test(trimmedLine) || /^herzlich willkommen/i.test(trimmedLine)) {
        currentSender = 'host';
      } else if (/^Danke|^Hallo|^Guten Tag/i.test(trimmedLine)) {
        currentSender = 'guest';
      }
    }

    if (currentText) {
      currentText += '\n' + trimmedLine;
    } else {
      currentText = trimmedLine;
    }
  }

  // Don't forget the last message
  saveCurrentMessage();

  return messages;
}

// Aufklappbare Kommunikations-Sektion mit Chat-Bubbles
function CommunicationSection({ communication, communications }: {
  communication: string;
  communications?: Array<{
    date: string;
    time?: string;
    type: 'system' | 'guest' | 'host';
    event?: string;
    message?: string;
  }>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out system events from communications array
  const fewoMessages = communications?.filter(c => c.type !== 'system' && c.message) || [];
  // Parse legacy string format
  const legacyMessages = parseCommunication(communication);
  // Use FeWo format if available, otherwise legacy
  const hasFewoMessages = fewoMessages.length > 0;
  const messageCount = hasFewoMessages ? fewoMessages.length : legacyMessages.length;

  return (
    <div className="bg-blue-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-900">Kommunikation</span>
          {messageCount > 0 && (
            <span className="text-xs text-gray-500">({messageCount} Nachrichten)</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="max-h-96 overflow-y-auto space-y-3 p-2">
            {hasFewoMessages ? (
              // FeWo format (communications array)
              fewoMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.type === 'host' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-xs text-gray-400 mb-1 px-1">
                    {formatDate(msg.date)}{msg.time ? ` ${msg.time}` : ''}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.type === 'host'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                  </div>
                </div>
              ))
            ) : legacyMessages.length > 0 ? (
              // Legacy format (parsed from string)
              legacyMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'host' ? 'items-end' : 'items-start'}`}
                >
                  {msg.date && (
                    <div className="text-xs text-gray-400 mb-1 px-1">
                      {msg.date}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender === 'host'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))
            ) : communication ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-blue-100">
                {communication}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">Keine Kommunikation</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingDetail({ booking, guestId, bankPayments = [], bookingDocuments = [], pricing, onStatusChange, onEdit, onDelete, onToggleCleaningCash, onUploadDocument, onTogglePaymentStatus, onUpdateTransactions }: BookingDetailProps) {
  const [showCostDetails, setShowCostDetails] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<GuestDocument | null>(null);
  const [isEditingTransactions, setIsEditingTransactions] = useState(false);
  const [editedTransactions, setEditedTransactions] = useState<Array<{
    date: string;
    amount: number;
    type: 'payment' | 'refund';
    status: string;
    description?: string;
    fee?: number;
  }>>([]);
  const [editedPayoutDate, setEditedPayoutDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // === Basis-Flags aus Buchungsdaten ===
  const hasDog = booking.pets?.toLowerCase().includes('hund') ?? false;
  const isPrivate = booking.is_private === 1 || booking.platform?.toLowerCase() === 'privat';
  const isCleaningCash = booking.cleaning_cash === 1;
  const isUtilitiesCash = booking.utilities_cash === 1;
  const isKurtaxeCash = booking.kurtaxe_cash === 1;
  const isFeWo = booking.platform?.toLowerCase() === 'fewo' ||
                 booking.platform?.toLowerCase() === 'fewo-direkt' ||
                 booking.platform?.toLowerCase() === 'vrbo';

  // === Parse additional_costs JSON (zentrale Hilfsfunktionen) ===
  let platformFees = parsePlatformFeesFromJson(booking.additional_costs);
  const transactions = parseTransactionsFromJson(booking.additional_costs);
  const communications = parseCommunicationsFromJson(booking.additional_costs);
  const payoutDate = parsePayoutDateFromJson(booking.additional_costs);
  const komfortpaket = parseKomfortpaketFromJson(booking.additional_costs);

  // Extrahiere communication und document aus additional_costs
  let communication = '';
  let document: { r2_key: string; filename: string; type: string; uploaded_at?: string } | null = null;
  if (booking.additional_costs) {
    try {
      const parsed = JSON.parse(booking.additional_costs);
      if (parsed.communication) communication = parsed.communication;
      if (parsed.document?.r2_key) document = parsed.document;
      // FeWo breakdown für NK/Cleaning
      if (parsed.fewo_breakdown) {
        const fb = parsed.fewo_breakdown;
        if (!platformFees.nebenkosten_income) {
          platformFees = { ...platformFees, nebenkosten_income: (fb.water || 0) + (fb.electricity || 0) + (fb.heating || 0) + (fb.management_fee || 0) };
        }
        if (!platformFees.cleaning_fee_income) {
          platformFees = { ...platformFees, cleaning_fee_income: fb.cleaning || 0 };
        }
      }
    } catch { /* Not JSON */ }
  }

  // Fallback: Calculate NK from guest_total_payment if fewo_breakdown not available
  const cleaningCostForFallback = hasDog ? 125 : 100;
  if (!platformFees.nebenkosten_income && (platformFees.guest_total_payment || 0) > 0 && (platformFees.platform_service_fee || 0) > 0) {
    const calculatedNK = (platformFees.guest_total_payment || 0) - (booking.rental_price || 0) - cleaningCostForFallback - (platformFees.platform_service_fee || 0);
    if (calculatedNK > 0) {
      platformFees = { ...platformFees, nebenkosten_income: calculatedNK, cleaning_fee_income: cleaningCostForFallback };
    }
  }

  const nights = booking.arrival_date && booking.departure_date
    ? nightsBetween(booking.arrival_date, booking.departure_date)
    : 0;

  // === ZENTRALE FINANZBERECHNUNG ===
  // Alle Berechnungen erfolgen in financeCalculations.ts
  const childrenAges = parseChildrenAges(booking.children_ages);
  const financeResult = calculateBookingFinances({
    arrivalDate: booking.arrival_date,
    departureDate: booking.departure_date,
    adults: booking.adults || 2,
    rentalPrice: booking.rental_price || 0,
    platform: booking.platform,
    hasDog,
    isPrivate,
    privateConfig: parsePrivateConfig(booking.private_config),
    skipNk: false,
    isCleaningCash,
    isUtilitiesCash,
    isKurtaxeCash,
    platformFees: platformFees as PlatformFees,
    pricingSettings: pricing,
    komfortpaket,
    childrenAges,
  });

  // === Alle Werte aus der zentralen Berechnung (NUR ANZEIGE!) ===
  const {
    utilityCosts,
    baseCosts,
    kurtaxe,
    cleaningCost,
    basisMiete,
    mieterlos,
    provision,
    nkEinnahmen,
    reinigungEinnahmen,
    kurtaxeEinnahmen,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
    gesamtauszahlung,
    calculatedCostsForMieterlos,  // Für Mieterlös-Anzeige bei Booking.com
    barNk,
    barKurtaxe,
    barReinigung,
    gesamteinzahlung,
    totalNkCosts,
    gesamtbelastung,
    gesamtertrag,
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,
    // Komfortpaket
    komfortpaketCosts,
    komfortpaketIncome,
    komfortpaketEnabled,
  } = financeResult;

  // Hilfsvariablen für Anzeige-Kompatibilität
  const calculatedCosts = baseCosts;
  const totalEinzahlung = gesamteinzahlung;
  const actualNKCosts = totalNkCosts;
  const rentalIncome = booking.rental_price || 0;

  // Zahlungsstatus
  const bankPaymentsSum = bankPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header mit Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold text-gray-900">
            {formatDate(booking.arrival_date)} - {formatDate(booking.departure_date)}
          </h4>
          <span className="text-sm text-gray-500">({nights} Nächte)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              booking.status === 'active'
                ? 'bg-green-100 text-green-700'
                : booking.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : booking.status === 'cancelled'
                    ? 'bg-red-100 text-red-700'
                    : booking.status === 'refunded'
                      ? 'bg-orange-100 text-orange-700'
                      : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
            }`}
          >
            {booking.status === 'active' ? 'Aktiv'
              : booking.status === 'completed' ? 'Abgeschlossen'
              : booking.status === 'cancelled' ? 'Storniert'
              : booking.status === 'refunded' ? 'Erstattet'
              : booking.status === 'pending' ? 'Ausstehend'
              : 'Aktiv'}
          </span>
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bearbeiten">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Buchung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                  onDelete();
                }
              }}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              title="Buchung löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onStatusChange && booking.status !== 'completed' && (
            <button
              onClick={() => onStatusChange('completed')}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="Als abgeschlossen markieren"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {onStatusChange && booking.status === 'completed' && (
            <button
              onClick={() => onStatusChange('active')}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
              title="Wieder aktivieren"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Finanzergebnis - Zusammenfassung */}
      {!isPrivate && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-0.5">Gesamteinzahlung</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(gesamteinzahlung)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-0.5">Mieterlös</div>
            <div className="text-lg font-bold text-green-700">{formatCurrency(mieterlos)}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-0.5">Gesamtbelastung</div>
            <div className="text-lg font-bold text-red-600">{formatCurrency(gesamtbelastung)}</div>
          </div>
          <div className={`${gesamtertrag >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg p-3 text-center`}>
            <div className="text-xs text-gray-500 mb-0.5">Kalk. Ertrag</div>
            <div className={`text-lg font-bold ${gesamtertrag >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(gesamtertrag)}</div>
          </div>
        </div>
      )}

      {/* Erste Zeile: Buchungsdetails & Gast-Zahlung */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Buchungsdetails */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h5 className="font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Buchungsdetails
            {booking.booking_number && (
              <span className="text-sm font-mono text-gray-500 ml-auto">#{booking.booking_number}</span>
            )}
          </h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Personen:</span>
              <span className="font-medium">
                {booking.adults} Erw.{booking.children > 0 && `, ${booking.children} Ki.`}
              </span>
            </div>
            {booking.pets && (
              <div className="flex justify-between">
                <span className="text-gray-600">Haustiere:</span>
                <span className="font-medium">{booking.pets}</span>
              </div>
            )}
            {booking.platform && (
              <div className="flex justify-between">
                <span className="text-gray-600">Plattform:</span>
                <span className="font-medium">{booking.platform}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Provision (10% v. Mieterlös):</span>
              <span>{formatCurrency(provision)}</span>
            </div>
          </div>
        </div>

        {/* Gast-Zahlung (Plattform) - nur wenn Daten vorhanden */}
        {(platformFees.payout_amount || 0) > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
            <h5 className="font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Zahlungsdetails (Plattform)
            </h5>
            {/* Gesamtzahlung des Gastes an erster Stelle - berechnet wenn nicht vorhanden */}
            {(() => {
              // guest_total_payment = payout + service_fee + payment_fee (rückgerechnet)
              const guestTotal = (platformFees.guest_total_payment || 0) > 0
                ? (platformFees.guest_total_payment || 0)
                : (platformFees.payout_amount || 0) + (platformFees.platform_service_fee || 0) + paymentProcessingFee;
              return guestTotal > 0 ? (
                <div className="flex justify-between pt-1">
                  <span className="text-gray-700">Gesamtzahlung des Gastes:</span>
                  <span className="font-medium">{formatCurrency(guestTotal)}</span>
                </div>
              ) : null;
            })()}
            {/* Gebühren als Abzüge */}
            {(platformFees.platform_service_fee || 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>./. Servicegebühr für Gäste:</span>
                <span>-{formatCurrency(platformFees.platform_service_fee || 0)}</span>
              </div>
            )}
            {paymentProcessingFee > 0 && (
              <div className="flex justify-between text-red-600">
                <span>./. Zahlungsbearbeitungsgebühr:</span>
                <span>-{formatCurrency(paymentProcessingFee)}</span>
              </div>
            )}
            {/* Gesamtauszahlung - direkt aus den importierten Daten */}
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="font-medium text-gray-900">Gesamtauszahlung:</span>
              <span className="font-bold text-green-700">{formatCurrency(platformFees.payout_amount || 0)}</span>
            </div>
            {/* Aufschlüsselung der Auszahlung */}
            {((platformFees.nebenkosten_income || 0) > 0 || (platformFees.cleaning_fee_income || 0) > 0 || (platformFees.kurtaxe_income || 0) > 0) && (
              <div className="pt-2 border-t border-blue-100 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>davon Miete:</span>
                  <span>{formatCurrency(mieterlos)}</span>
                </div>
                {(platformFees.nebenkosten_income || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>davon NK (W/S/H):</span>
                    <span>{formatCurrency(platformFees.nebenkosten_income || 0)}</span>
                  </div>
                )}
                {(platformFees.cleaning_fee_income || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>davon Reinigung:</span>
                    <span>{formatCurrency(platformFees.cleaning_fee_income || 0)}</span>
                  </div>
                )}
                {(platformFees.kurtaxe_income || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>davon Kurtaxe:</span>
                    <span>{formatCurrency(platformFees.kurtaxe_income || 0)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zweite Zeile: Kosten & Ertrag + Zahlungsstatus */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Kosten & Ertrag */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h5 className="font-medium text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Kosten & Ertrag
          </h5>

          {isPrivate ? (
            <div className="text-sm text-gray-500 italic py-4 text-center">
              Private Buchung - keine Kosten
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {/* === EINZAHLUNGEN === */}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Einzahlungen</div>
              {isPlatformWithIncludedCosts && basisMiete === 0 ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Plattform-Auszahlung:</span>
                  <span className="font-medium text-green-700">{formatCurrency(gesamtauszahlung)}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-600">Miete:</span>
                  <span className="font-medium text-green-700">{formatCurrency(basisMiete)}</span>
                </div>
              )}
              {/* NK-Einnahmen: entweder aus Plattform-Daten oder bar bezahlt */}
              {(nkEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">NK:</span>
                  <span className="font-medium text-green-700">
                    {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(nkEinnahmen)}
                  </span>
                </div>
              )}
              {/* NK bar bezahlt - als Einnahme anzeigen */}
              {isUtilitiesCash && (calculatedCosts + kurtaxe) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">NK + Kurtaxe (bar):</span>
                  <span className="font-medium text-green-700">{formatCurrency(calculatedCosts + kurtaxe)}</span>
                </div>
              )}
              {/* Kurtaxe-Einnahmen: aus Plattform-Daten (Feratel/FeWo) */}
              {kurtaxeEinnahmen > 0 && !isPlatformWithIncludedCosts && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kurtaxe:</span>
                  <span className="font-medium text-green-700">{formatCurrency(kurtaxeEinnahmen)}</span>
                </div>
              )}
              {/* Kurtaxe bar bezahlt (separat) - nur wenn nicht alle NK bar */}
              {/* Booking.com/Airbnb: Kurtaxe immer bar (nicht im Payout), daher immer anzeigen */}
              {!isUtilitiesCash && (isKurtaxeCash || isPlatformWithIncludedCosts) && barKurtaxe > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kurtaxe (bar):</span>
                  <span className="font-medium text-green-700">{formatCurrency(barKurtaxe)}</span>
                </div>
              )}
              {/* Reinigung-Einnahmen: entweder aus Plattform-Daten oder bar bezahlt */}
              {(reinigungEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reinigung:</span>
                  <span className="font-medium text-green-700">
                    {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(reinigungEinnahmen)}
                  </span>
                </div>
              )}
              {/* Reinigung bar bezahlt - als Einnahme anzeigen */}
              {isCleaningCash && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reinigung (bar):</span>
                  <span className="font-medium text-green-700">{formatCurrency(cleaningCost)}</span>
                </div>
              )}
              {/* Komfortpaket-Einnahmen (wenn Gast bezahlt hat) */}
              {komfortpaketEnabled && komfortpaketIncome > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Komfortpaket:</span>
                  <span className="font-medium text-green-700">{formatCurrency(komfortpaketIncome)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="font-medium text-gray-900">= Gesamteinzahlung:</span>
                <span className="font-bold text-green-700">
                  {formatCurrency(totalEinzahlung)}
                </span>
              </div>

              {/* === KOSTEN === */}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3">Kosten</div>
              <div>
                <button
                  onClick={() => setShowCostDetails(!showCostDetails)}
                  className="flex justify-between w-full text-left hover:bg-gray-100 -mx-1 px-1 rounded transition-colors"
                >
                  <span className="text-gray-600 flex items-center gap-1">
                    NK (kalk. inkl. Kurtaxe){isUtilitiesCash ? ' (bar)' : isKurtaxeCash ? ' (Kurtaxe bar)' : ''}:
                    {showCostDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {utilityCosts && !showCostDetails && <span className="text-xs text-gray-400 ml-1">{utilityCosts.details}</span>}
                  </span>
                  <span className="font-medium text-red-600">{formatCurrency(calculatedCosts + kurtaxe)}</span>
                </button>
                {showCostDetails && utilityCosts && (
                  <div className="mt-2 ml-2 pl-2 border-l-2 border-gray-200 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Strom ({utilityCosts.breakdown.electricityKwh} kWh inkl.)</span>
                      <span>{formatCurrency(utilityCosts.breakdown.electricity)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Holz ({utilityCosts.breakdown.holzBuendel} Bündel)</span>
                      <span>{formatCurrency(utilityCosts.breakdown.holz)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Wasser</span>
                      <span>{formatCurrency(utilityCosts.breakdown.water)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Müll ({utilityCosts.breakdown.trashBags} Säcke)</span>
                      <span>{formatCurrency(utilityCosts.breakdown.trash)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Kurtaxe ({utilityCosts.kurtaxeDetails})</span>
                      <span>{formatCurrency(kurtaxe)}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Reinigung immer als Kosten anzeigen */}
              <div className="flex justify-between">
                <span className="text-gray-600">Reinigung{isCleaningCash && ' (bar)'}:</span>
                <span className="font-medium text-red-600">{formatCurrency(cleaningCost)}</span>
              </div>
              {/* Komfortpaket-Kosten (16€ pro Person) */}
              {komfortpaketEnabled && komfortpaketCosts > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Komfortpaket ({komfortpaket?.persons || 0} Pers.):</span>
                  <span className="font-medium text-red-600">{formatCurrency(komfortpaketCosts)}</span>
                </div>
              )}
              {/* Zahlungsbearbeitungsgebühren */}
              {paymentProcessingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Zahlungsbearbeitungsgeb.:</span>
                  <span className="font-medium text-red-600">{formatCurrency(paymentProcessingFee)}</span>
                </div>
              )}
              {/* === MIETERLÖS-BERECHNUNG (Basis für Provision) === */}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3">Mieterlös (Basis für Provision)</div>
              {/* Einheitliche Berechnung: Mieterlös = Gesamteinzahlung (Basis) - kalk. Kosten */}
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>Gesamteinzahlung (Basis):</span>
                <span>{formatCurrency(mieterlos + calculatedCostsForMieterlos)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>./. kalk. Kosten (NK+Kurtaxe+Reinigung{komfortpaketEnabled && komfortpaketCosts > 0 ? '+Komfortpaket' : ''}):</span>
                <span>-{formatCurrency(calculatedCostsForMieterlos)}</span>
              </div>
              <div className="flex justify-between font-medium text-purple-700">
                <span>= Mieterlös:</span>
                <span>{formatCurrency(mieterlos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Provision (10% v. {formatCurrency(mieterlos)}):</span>
                <span className="font-medium text-red-600">{formatCurrency(provision)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="font-medium text-gray-900">= Gesamtbelastung:</span>
                <span className="font-bold text-red-600">{formatCurrency(gesamtbelastung)}</span>
              </div>

            </div>
          )}
        </div>

        {/* Zahlungsstatus */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h5 className="font-medium text-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Zahlungsstatus
          </div>
          {onUpdateTransactions && !isEditingTransactions && (transactions.length > 0 || bankPayments.length === 0) && (
            <button
              onClick={() => {
                // Initialize with existing transactions, or create default entries from Anzahlung/Restzahlung
                if (transactions.length > 0) {
                  setEditedTransactions([...transactions]);
                } else {
                  // Start with empty array - user can add entries
                  setEditedTransactions([]);
                }
                setEditedPayoutDate(payoutDate);
                setIsEditingTransactions(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-normal"
            >
              Bearbeiten
            </button>
          )}
          {isEditingTransactions && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onUpdateTransactions) {
                    onUpdateTransactions(editedTransactions, editedPayoutDate);
                  }
                  setIsEditingTransactions(false);
                }}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                Speichern
              </button>
              <button
                onClick={() => setIsEditingTransactions(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-normal"
              >
                Abbrechen
              </button>
            </div>
          )}
        </h5>
        <div className="space-y-2">
          {/* Transaktionen aus PDF - Edit Mode */}
          {isEditingTransactions ? (
            <>
              {editedTransactions.map((t, idx) => {
                const isRefund = t.type === 'refund';
                return (
                  <div key={idx} className="flex items-center gap-2 py-1.5 text-sm bg-white rounded px-2 border border-gray-200">
                    <select
                      value={t.type}
                      onChange={(e) => {
                        const newTransactions = [...editedTransactions];
                        newTransactions[idx] = { ...t, type: e.target.value as 'payment' | 'refund' };
                        setEditedTransactions(newTransactions);
                      }}
                      className="text-xs border rounded px-1 py-0.5"
                    >
                      <option value="payment">Zahlung</option>
                      <option value="refund">Erstattung</option>
                    </select>
                    <input
                      type="text"
                      value={t.description || `Zahlung ${idx + 1} von ${editedTransactions.filter(tx => tx.type === 'payment').length}`}
                      onChange={(e) => {
                        const newTransactions = [...editedTransactions];
                        newTransactions[idx] = { ...t, description: e.target.value };
                        setEditedTransactions(newTransactions);
                      }}
                      className="flex-1 text-xs border rounded px-2 py-0.5 min-w-0"
                      placeholder="Beschreibung"
                    />
                    <input
                      type="text"
                      value={t.date}
                      onChange={(e) => {
                        const newTransactions = [...editedTransactions];
                        newTransactions[idx] = { ...t, date: e.target.value };
                        setEditedTransactions(newTransactions);
                      }}
                      className="w-24 text-xs border rounded px-2 py-0.5"
                      placeholder="TT.MM.JJJJ"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={t.amount}
                      onChange={(e) => {
                        const newTransactions = [...editedTransactions];
                        newTransactions[idx] = { ...t, amount: parseFloat(e.target.value) || 0 };
                        setEditedTransactions(newTransactions);
                      }}
                      className="w-20 text-xs border rounded px-2 py-0.5 text-right"
                      placeholder="Betrag"
                    />
                    <span className="text-xs text-gray-400">€</span>
                    <button
                      onClick={() => {
                        const newTransactions = editedTransactions.filter((_, i) => i !== idx);
                        setEditedTransactions(newTransactions);
                      }}
                      className="text-red-500 hover:text-red-700 p-0.5"
                      title="Entfernen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {/* Neue Transaktion hinzufügen */}
              <button
                onClick={() => {
                  setEditedTransactions([
                    ...editedTransactions,
                    { date: '', amount: 0, type: 'payment', status: 'paid', description: '' }
                  ]);
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 py-1"
              >
                <Plus className="w-3 h-3" />
                Transaktion hinzufügen
              </button>
              {/* Auszahlungsdatum editieren */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 bg-emerald-50 -mx-2 px-2 py-2 rounded">
                <span className="font-medium text-emerald-800 text-sm">Auszahlung auf Konto am:</span>
                <input
                  type="text"
                  value={editedPayoutDate}
                  onChange={(e) => setEditedPayoutDate(e.target.value)}
                  className="w-28 text-sm border border-emerald-300 rounded px-2 py-0.5 text-right font-medium"
                  placeholder="TT.MM.JJJJ"
                />
              </div>
            </>
          ) : transactions.length > 0 ? (
            <>
              {transactions.map((t, idx) => {
                const isRefund = t.type === 'refund';
                return (
                  <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      {isRefund ? (
                        <Circle className="w-4 h-4 text-orange-400" />
                      ) : t.status === 'paid' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={isRefund ? 'text-orange-600' : 'text-gray-700'}>
                        {t.description || (isRefund ? 'Erstattung' : `Zahlung ${idx + 1} von ${transactions.filter(tx => tx.type === 'payment').length}`)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {t.date ? formatDate(t.date) : ''}
                      </span>
                      {t.fee !== undefined && t.fee !== 0 && (
                        <span className={`text-xs ${t.fee > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          (Gebühr: {t.fee > 0 ? '-' : '+'}{formatCurrency(Math.abs(t.fee))})
                        </span>
                      )}
                    </div>
                    <span className={`font-medium ${isRefund ? 'text-orange-600' : t.status === 'paid' ? 'text-green-600' : 'text-gray-600'}`}>
                      {isRefund ? '-' : '+'}{formatCurrency(t.amount)}
                      {t.status === 'paid' && !isRefund && <span className="ml-1 text-xs">✓</span>}
                    </span>
                  </div>
                );
              })}
              {/* Gebühren Summe - ALLE Gebühren anzeigen */}
              {(() => {
                // Servicegebühr (geht an FeWo, vom Gast bezahlt)
                const serviceFee = platformFees.platform_service_fee || 0;
                // Zahlungsbearbeitungsgebühr (entweder aus Transaktionen oder Buchung)
                const transactionFees = transactions.reduce((s, t) => s + (t.fee || 0), 0);
                const processingFee = transactionFees > 0 ? transactionFees : (platformFees.payment_processing_fee || 0);
                // Gesamtgebühren = Service + Zahlungsbearbeitung
                const totalFees = serviceFee + processingFee;
                if (totalFees > 0) {
                  return (
                    <div className="flex items-center justify-between text-sm text-red-600">
                      <span>Gebühren</span>
                      <span>-{formatCurrency(totalFees)}</span>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Summe - use payout_amount for FeWo/platform bookings */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="font-medium">Netto gezahlt</span>
                {(() => {
                  // For FeWo/platform: use payout_amount (actual bank transfer)
                  if ((platformFees.payout_amount || 0) > 0) {
                    return (
                      <span className="font-bold text-green-600">
                        {formatCurrency(platformFees.payout_amount || 0)}
                      </span>
                    );
                  }
                  // Fallback: calculate from transactions
                  const totalPaid = transactions.filter(t => t.type === 'payment' && t.status === 'paid').reduce((s, t) => s + t.amount, 0);
                  const totalRefunded = transactions.filter(t => t.type === 'refund').reduce((s, t) => s + t.amount, 0);
                  const netPaid = totalPaid - totalRefunded;
                  return (
                    <span className={`font-bold ${netPaid > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatCurrency(netPaid)}
                    </span>
                  );
                })()}
              </div>
              {/* Auszahlungsdatum anzeigen */}
              {payoutDate && (() => {
                // Parse payout date to check if it's in the future
                const payoutDateObj = new Date(payoutDate.split('.').reverse().join('-'));
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isFuture = payoutDateObj > today;
                return (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 bg-emerald-50 -mx-3 px-3 py-2 rounded-b">
                    <span className="font-medium text-emerald-800">{isFuture ? 'Auszahlung am:' : 'Eingegangen am:'}</span>
                    <span className="font-bold text-emerald-700">{formatDate(payoutDate)}</span>
                  </div>
                );
              })()}
            </>
          ) : bankPayments.length > 0 ? (
            <>
              {/* Kontobewegungen (Kontobewegungen) anzeigen */}
              {bankPayments.map((payment, idx) => (
                <div key={payment.id || idx} className="flex items-center justify-between py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700">
                      {payment.notes || `Zahlung ${idx + 1}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {payment.payment_date ? formatDate(payment.payment_date) : ''}
                    </span>
                  </div>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(payment.amount)}
                    <span className="ml-1 text-xs">✓</span>
                  </span>
                </div>
              ))}
              {/* Summe */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="font-medium">Bezahlt</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(bankPaymentsSum)}
                </span>
              </div>
              {/* Status */}
              {rentalIncome > bankPaymentsSum && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Offen</span>
                  <span className="text-gray-600">
                    {formatCurrency(rentalIncome - bankPaymentsSum)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Keine Zahlungen vorhanden - zeige Hinweis */}
              <div className="text-sm text-gray-500 py-4 text-center">
                Keine Zahlungen erfasst
              </div>
              {/* Auszahlungsdatum anzeigen (auch ohne Transaktionen) */}
              {payoutDate && (() => {
                // Parse payout date to check if it's in the future
                const payoutDateObj = new Date(payoutDate.split('.').reverse().join('-'));
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isFuture = payoutDateObj > today;
                return (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 bg-emerald-50 -mx-3 px-3 py-2 rounded-b">
                    <span className="font-medium text-emerald-800">{isFuture ? 'Auszahlung am:' : 'Eingegangen am:'}</span>
                    <span className="font-bold text-emerald-700">{formatDate(payoutDate)}</span>
                  </div>
                );
              })()}
            </>
          )}

          {/* Dokumente unterhalb Zahlungsstatus */}
          <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500 uppercase">Dokumente</div>
              {onUploadDocument && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && onUploadDocument) {
                        setIsUploading(true);
                        try {
                          await onUploadDocument(file);
                        } finally {
                          setIsUploading(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    PDF hinzufügen
                  </button>
                </>
              )}
            </div>
            {/* Dokument aus additional_costs (FeWo Import) */}
            {document && (
              <button
                onClick={() => setShowPdfViewer(true)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm w-full text-left"
              >
                <FileText className="w-4 h-4" />
                {document.filename}
              </button>
            )}
            {/* Dokumente aus guest_documents Tabelle */}
            {bookingDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setViewingDocument(doc)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm w-full text-left"
              >
                <FileText className="w-4 h-4" />
                {doc.original_filename}
              </button>
            ))}
            {!document && bookingDocuments.length === 0 && (
              <div className="text-xs text-gray-400 italic">Keine Dokumente vorhanden</div>
            )}
          </div>
          {/* PDF Viewer Popup für additional_costs Dokument */}
          {showPdfViewer && document && (
            <PDFViewerPopup
              url={`/api/admin/guest-documents/download?key=${encodeURIComponent(document.r2_key)}`}
              filename={document.filename}
              onClose={() => setShowPdfViewer(false)}
            />
          )}
          {/* PDF Viewer Popup für guest_documents */}
          {viewingDocument && (
            <PDFViewerPopup
              url={`/api/admin/guest-documents/download?key=${encodeURIComponent(viewingDocument.r2_key)}`}
              filename={viewingDocument.original_filename}
              onClose={() => setViewingDocument(null)}
            />
          )}
        </div>
      </div>
      </div>

      {/* Dritte Zeile: Kommunikation (aufklappbar) */}
      {(communication || communications.length > 0) && (
        <CommunicationSection communication={communication} communications={communications} />
      )}
    </div>
  );
}
