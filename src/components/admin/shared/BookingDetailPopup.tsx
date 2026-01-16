'use client';

import { useState } from 'react';
import { Calendar, Euro, Users, X, User, ChevronDown, ChevronUp, CheckCircle2, Circle, MessageCircle, FileText, Send, Inbox, Upload, Download, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseTransactionsFromJson,
  parseCommunicationsFromJson,
  parsePayoutDateFromJson,
  type PlatformFees,
} from '@/lib/utils/financeCalculations';
import type { PricingSettings } from '../utility-costs';

// ============================================================================
// WICHTIG: Keine Finanzberechnungen in dieser Komponente!
// Alle Berechnungen erfolgen zentral in lib/utils/financeCalculations.ts
// Diese Komponente zeigt nur die Ergebnisse an.
// ============================================================================

// Document interface for booking documents
export interface BookingDocument {
  id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number | null;
  document_type: string;
  r2_key: string;
  created_at: string;
}

// Unified booking data interface that works with both use cases
export interface BookingDetailData {
  // IDs for document association
  guest_id?: number;
  booking_id?: number;

  // Guest info
  guest_name: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;

  // Booking dates
  arrival_date: string | null;
  departure_date: string | null;

  // Guests
  adults?: number | null;
  children?: number;

  // Platform & booking
  platform?: string | null;
  booking_number?: string | null;

  // Financial
  rental_price?: number | null;

  // Flags
  pets?: string | null;
  no_nebenkosten?: number;
  cleaning_cash?: number;
  utilities_cash?: number;
  is_private?: number;
  final_cleaning?: string | null;

  // Additional costs JSON (can be from booking or guest table)
  additional_costs?: string | null;
  booking_additional_costs?: string | null;

  // Notes
  notes?: string | null;
  other_notes?: string | null;
}

interface BookingDetailPopupProps {
  data: BookingDetailData;
  pricing?: PricingSettings;
  documents?: BookingDocument[];
  onClose: () => void;
  onNavigateToGuest?: () => void;
  onUploadDocument?: (file: File) => Promise<void>;
}

export function BookingDetailPopup({ data, pricing, documents, onClose, onNavigateToGuest, onUploadDocument }: BookingDetailPopupProps) {
  const [showNkDetails, setShowNkDetails] = useState(false);
  const [uploading, setUploading] = useState(false);

  // === Basis-Flags aus Buchungsdaten ===
  const hasDog = data.pets?.toLowerCase().includes('hund') ?? false;
  const skipNk = data.no_nebenkosten === 1;
  const isCleaningCash = data.cleaning_cash === 1 || (data.final_cleaning?.includes('vor Ort') ?? false);
  const isUtilitiesCash = data.utilities_cash === 1;

  // === Parse additional_costs JSON (zentrale Hilfsfunktionen) ===
  const additionalCostsJson = data.booking_additional_costs || data.additional_costs;
  const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
  const transactions = parseTransactionsFromJson(additionalCostsJson);
  const communications = parseCommunicationsFromJson(additionalCostsJson);
  const payoutDate = parsePayoutDateFromJson(additionalCostsJson);

  // === ZENTRALE FINANZBERECHNUNG ===
  // Alle Berechnungen erfolgen in financeCalculations.ts
  const financeResult = calculateBookingFinances({
    arrivalDate: data.arrival_date,
    departureDate: data.departure_date,
    adults: data.adults || 2,
    rentalPrice: data.rental_price ?? 0,
    platform: data.platform ?? null,
    hasDog,
    isPrivate: data.is_private === 1,
    skipNk,
    isCleaningCash,
    isUtilitiesCash,
    platformFees: platformFees as PlatformFees,
    pricingSettings: pricing,
  });

  // === Alle Werte aus der zentralen Berechnung (NUR ANZEIGE!) ===
  const {
    utilityCosts: costCalc,
    baseCosts,
    kurtaxe,
    cleaningCost,
    calculatedCostsForMieterlos: calculatedCosts,
    basisMiete,
    nkEinnahmen,
    reinigungEinnahmen,
    provision: commission,
    gesamteinzahlung,
    gesamtkosten,
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,
  } = financeResult;

  const formatDateWithWeekday = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get notes from either field
  const notes = data.other_notes || data.notes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 sticky top-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Buchungsdetails
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Guest Info */}
          <div className="flex items-center gap-3">
            {data.nationality && (
              <img
                src={`https://flagcdn.com/w40/${data.nationality.split(',')[0]?.toLowerCase()}.png`}
                alt=""
                className="w-8 h-6 rounded shadow-sm"
              />
            )}
            <div>
              <h3 className="font-bold text-xl text-gray-900">{data.guest_name}</h3>
              {data.email && <p className="text-sm text-gray-500">{data.email}</p>}
              {data.phone && <p className="text-sm text-gray-500">{data.phone}</p>}
            </div>
          </div>

          {/* Dates & Stay Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
            <div>
              <span className="text-xs text-gray-500 uppercase">Anreise</span>
              <p className="font-medium text-green-700">{formatDateWithWeekday(data.arrival_date)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Abreise</span>
              <p className="font-medium text-red-700">{formatDateWithWeekday(data.departure_date)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Nächte</span>
              <p className="font-medium">{costCalc?.days || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Personen</span>
              <p className="font-medium flex items-center gap-1">
                <Users className="w-4 h-4" />
                {data.adults || 0} Erw.
                {(data.children ?? 0) > 0 && `, ${data.children} Kind.`}
              </p>
            </div>
          </div>

          {/* Platform & Booking Info */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                data.platform?.toLowerCase().includes('booking')
                  ? 'bg-blue-100 text-blue-800'
                  : data.platform?.toLowerCase().includes('fewo') || data.platform?.toLowerCase().includes('vrbo')
                    ? 'bg-orange-100 text-orange-800'
                    : data.platform?.toLowerCase().includes('airbnb')
                      ? 'bg-pink-100 text-pink-800'
                      : 'bg-gray-100 text-gray-800'
              }`}
            >
              {data.platform || 'Direkt'}
            </span>
            {data.booking_number && <span className="text-sm text-gray-500 font-mono">#{data.booking_number}</span>}
            {data.is_private === 1 && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Privat</span>
            )}
            {skipNk && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Keine NK</span>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
              <Euro className="w-4 h-4" />
              Finanzen
            </h4>
            <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <tbody>
                {/* === EINZAHLUNGEN === */}
                <tr>
                  <td colSpan={2} className="py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Einzahlungen</td>
                </tr>

                {/* Miete */}
                <tr className="text-green-700">
                  <td className="py-1 pl-2">Miete:</td>
                  <td className="py-1 text-right w-28">{formatCurrency(basisMiete)}</td>
                </tr>

                {/* NK-Einnahmen */}
                {(nkEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                  <tr className="text-green-700">
                    <td className="py-1 pl-2">Nebenkosten:</td>
                    <td className="py-1 text-right w-28">
                      {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(nkEinnahmen)}
                    </td>
                  </tr>
                )}

                {/* NK bar bezahlt */}
                {isUtilitiesCash && calculatedCosts > 0 && (
                  <tr className="text-green-700">
                    <td className="py-1 pl-2">NK + Kurtaxe (bar):</td>
                    <td className="py-1 text-right w-28">{formatCurrency(calculatedCosts)}</td>
                  </tr>
                )}

                {/* Reinigungsgebühr */}
                {(reinigungEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                  <tr className="text-green-700">
                    <td className="py-1 pl-2">Reinigung:</td>
                    <td className="py-1 text-right w-28">
                      {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(reinigungEinnahmen)}
                    </td>
                  </tr>
                )}

                {/* Reinigung bar bezahlt */}
                {isCleaningCash && (
                  <tr className="text-green-700">
                    <td className="py-1 pl-2">Reinigung (bar):</td>
                    <td className="py-1 text-right w-28">{formatCurrency(cleaningCost)}</td>
                  </tr>
                )}

                {/* Gesamteinzahlung */}
                <tr className="bg-green-50">
                  <td className="py-1.5 pl-2 font-medium border-t border-green-200">= Gesamteinzahlung:</td>
                  <td className="py-1.5 text-right w-28 font-semibold text-green-700 border-t border-green-200">
                    {formatCurrency(gesamteinzahlung + (isUtilitiesCash ? calculatedCosts : 0) + (isCleaningCash ? cleaningCost : 0))}
                  </td>
                </tr>

                {/* === KOSTEN === */}
                <tr>
                  <td colSpan={2} className="py-1 pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kosten</td>
                </tr>

                {/* Kalkulatorische Kosten (expandable) */}
                {!skipNk && (
                  <>
                    <tr className="text-red-600">
                      <td className="py-1 pl-2">
                        <button
                          onClick={() => setShowNkDetails(!showNkDetails)}
                          className="flex items-center gap-1 hover:text-red-800"
                        >
                          NK (kalk. inkl. Kurtaxe)
                          {showNkDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-1 text-right w-28">{formatCurrency(calculatedCosts)}</td>
                    </tr>

                    {showNkDetails && costCalc?.breakdown && (
                      <>
                        <tr className="text-xs text-gray-500">
                          <td className="py-0.5 pl-6">Kurtaxe ({costCalc.breakdown.kurtaxeDetails}):</td>
                          <td className="py-0.5 text-right">{formatCurrency(costCalc.breakdown.kurtaxe)}</td>
                        </tr>
                        <tr className="text-xs text-gray-500">
                          <td className="py-0.5 pl-6">Holz ({costCalc.breakdown.holzBuendel} Bündel):</td>
                          <td className="py-0.5 text-right">{formatCurrency(costCalc.breakdown.holz)}</td>
                        </tr>
                        <tr className="text-xs text-gray-500">
                          <td className="py-0.5 pl-6">Wasser:</td>
                          <td className="py-0.5 text-right">{formatCurrency(costCalc.breakdown.water)}</td>
                        </tr>
                        <tr className="text-xs text-gray-500">
                          <td className="py-0.5 pl-6">Müll ({costCalc.breakdown.trashBags} Säcke):</td>
                          <td className="py-0.5 text-right">{formatCurrency(costCalc.breakdown.trash)}</td>
                        </tr>
                        <tr className="text-xs text-gray-500">
                          <td className="py-0.5 pl-6">Strom ({costCalc.breakdown.electricityKwh} kWh inkl.):</td>
                          <td className="py-0.5 text-right">{formatCurrency(costCalc.breakdown.electricity)}</td>
                        </tr>
                        {!isCleaningCash && (
                          <tr className="text-xs text-gray-500">
                            <td className="py-0.5 pl-6">Reinigung ({hasDog ? 'mit Hund' : 'Standard'}):</td>
                            <td className="py-0.5 text-right">{formatCurrency(costCalc.breakdown.reinigung)}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={2} className="text-xs text-gray-400 pl-6 pb-1">{costCalc.details}</td>
                        </tr>
                      </>
                    )}
                  </>
                )}

                {/* Reinigung immer als Kosten anzeigen */}
                {!skipNk && (
                  <tr className="text-red-600">
                    <td className="py-1 pl-2">Reinigung{isCleaningCash && ' (bar)'}:</td>
                    <td className="py-1 text-right w-28">{formatCurrency(cleaningCost)}</td>
                  </tr>
                )}

                {/* Provision */}
                <tr className="text-red-600">
                  <td className="py-1 pl-2">Provision (10% v. Mieterlös):</td>
                  <td className="py-1 text-right w-28">{formatCurrency(commission)}</td>
                </tr>

                {/* Gesamtkosten */}
                <tr className="bg-red-50">
                  <td className="py-1.5 pl-2 font-medium border-t border-red-200">= Gesamtkosten:</td>
                  <td className="py-1.5 text-right w-28 font-semibold text-red-600 border-t border-red-200">
                    {formatCurrency(gesamtkosten + cleaningCost)}
                  </td>
                </tr>

                {/* === ERGEBNIS === */}
                {(() => {
                  const totalIncome = gesamteinzahlung + (isUtilitiesCash ? calculatedCosts : 0) + (isCleaningCash ? cleaningCost : 0);
                  const totalCosts = gesamtkosten + cleaningCost;
                  const ertrag = totalIncome - totalCosts;
                  return (
                    <tr className="bg-emerald-100">
                      <td className="py-2 font-bold border-t-2 border-purple-300">= Kalk. Gesamtertrag:</td>
                      <td className={`py-2 text-right w-28 font-bold border-t-2 border-purple-300 ${ertrag >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(ertrag)}
                      </td>
                    </tr>
                  );
                })()}
                {/* === AUSZAHLUNG === */}
                {payoutDate && (
                  <tr className="bg-emerald-50">
                    <td className="py-2 font-medium text-emerald-800">Auszahlung auf Konto am:</td>
                    <td className="py-2 text-right w-28 font-bold text-emerald-700">{payoutDate}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Transactions / Zahlungen */}
          {transactions.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Zahlungen
              </h4>
              <div className="space-y-1.5">
                {transactions.map((t, idx) => {
                  const isRefund = t.type === 'refund';
                  return (
                    <div key={idx} className="flex items-center justify-between py-1 text-sm border-b border-blue-100 last:border-0">
                      <div className="flex items-center gap-2">
                        {isRefund ? (
                          <Circle className="w-3.5 h-3.5 text-orange-400" />
                        ) : t.status === 'paid' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className={isRefund ? 'text-orange-600' : 'text-gray-700'}>
                          {t.description || (isRefund ? 'Erstattung' : `Zahlung`)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{formatDate(t.date)}</span>
                        <span className={`font-medium ${isRefund ? 'text-orange-600' : 'text-green-700'}`}>
                          {isRefund ? '-' : ''}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Platform Fees */}
              {((platformFees.platform_service_fee || 0) > 0 || (platformFees.payment_processing_fee || 0) > 0) && (
                <div className="border-t border-blue-200 pt-2 mt-2 space-y-1">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase">Gebühren</h5>
                  {(platformFees.platform_service_fee || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Service-Gebühr:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(platformFees.platform_service_fee || 0)}</span>
                    </div>
                  )}
                  {(platformFees.payment_processing_fee || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Zahlungsabwicklung:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(platformFees.payment_processing_fee || 0)}</span>
                    </div>
                  )}
                  {(platformFees.payout_amount || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-100 mt-2">
                      <span className="text-gray-700 font-medium">Nettoauszahlung:</span>
                      <span className="font-bold text-green-600">{formatCurrency(platformFees.payout_amount || 0)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="bg-amber-50 rounded-lg p-3">
              <h4 className="font-semibold text-amber-900 mb-1">Notizen</h4>
              <p className="text-sm text-amber-800 whitespace-pre-line">{notes}</p>
            </div>
          )}

          {/* Communications from FeWo */}
          {communications.length > 0 && (
            <div className="bg-teal-50 rounded-lg p-3">
              <h4 className="font-semibold text-teal-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Kommunikation ({communications.filter(c => c.type !== 'system').length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {communications
                  .filter(c => c.type !== 'system') // Skip system events
                  .map((comm, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded text-sm ${
                        comm.type === 'guest'
                          ? 'bg-white border-l-4 border-teal-400'
                          : 'bg-teal-100 border-l-4 border-teal-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        {comm.type === 'guest' ? (
                          <Inbox className="w-3 h-3" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        <span>{comm.type === 'guest' ? 'Gast' : 'Host'}</span>
                        <span>•</span>
                        <span>{formatDate(comm.date)}{comm.time ? ` ${comm.time}` : ''}</span>
                      </div>
                      {comm.message && (
                        <p className="text-gray-700 whitespace-pre-line">{comm.message}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {(documents && documents.length > 0) || onUploadDocument ? (
            <div className="bg-indigo-50 rounded-lg p-3">
              <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Dokumente ({documents?.length || 0})
              </h4>

              {/* Document List */}
              {documents && documents.length > 0 && (
                <div className="space-y-2 mb-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-indigo-100"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${
                          doc.file_type.includes('pdf') ? 'text-red-500' : 'text-blue-500'
                        }`} />
                        <span className="text-sm text-gray-700 truncate">{doc.original_filename}</span>
                      </div>
                      <a
                        href={`/api/admin/guest-documents/download?key=${encodeURIComponent(doc.r2_key)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-indigo-600 hover:bg-indigo-100 rounded flex-shrink-0"
                        title="Herunterladen"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {onUploadDocument && (
                <label className="flex items-center justify-center gap-2 p-2 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploading(true);
                        try {
                          await onUploadDocument(file);
                        } finally {
                          setUploading(false);
                          e.target.value = '';
                        }
                      }
                    }}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Upload className="w-4 h-4 text-indigo-600" />
                  )}
                  <span className="text-sm text-indigo-600">
                    {uploading ? 'Lädt hoch...' : 'Dokument hochladen'}
                  </span>
                </label>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">
            Schließen
          </button>
          {onNavigateToGuest && (
            <button
              onClick={onNavigateToGuest}
              className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Zum Gast
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
