'use client';

import { useState } from 'react';
import {
  Calendar,
  Euro,
  Users,
  X,
  User,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FileText,
  Send,
  Inbox,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseCommunicationsFromJson,
  parsePayoutDateFromJson,
  parseKomfortpaketFromJson,
  parsePrivateConfig,
  type PlatformFees,
} from '@/lib/utils/financeCalculations';
import type { PricingSettings } from '../utility-costs/types';

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
  kurtaxe_cash?: number;
  is_private?: number;
  private_config?: string | null;
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

export function BookingDetailPopup({
  data,
  pricing,
  documents,
  onClose,
  onNavigateToGuest,
  onUploadDocument,
}: BookingDetailPopupProps) {
  const [showNkDetails, setShowNkDetails] = useState(false);
  const [showFinanceDetails, setShowFinanceDetails] = useState(false);
  const [uploading, setUploading] = useState(false);

  // === Basis-Flags aus Buchungsdaten ===
  const hasDog = data.pets?.toLowerCase().includes('hund') ?? false;
  const skipNk = data.no_nebenkosten === 1;
  const isCleaningCash =
    data.cleaning_cash === 1 || (data.final_cleaning?.includes('vor Ort') ?? false);
  const isUtilitiesCash = data.utilities_cash === 1;
  const isKurtaxeCash = data.kurtaxe_cash === 1;

  // === Parse additional_costs JSON (zentrale Hilfsfunktionen) ===
  const additionalCostsJson = data.booking_additional_costs || data.additional_costs;
  const platformFees = parsePlatformFeesFromJson(additionalCostsJson);
  const communications = parseCommunicationsFromJson(additionalCostsJson);
  const payoutDate = parsePayoutDateFromJson(additionalCostsJson);
  const komfortpaket = parseKomfortpaketFromJson(additionalCostsJson);

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
    privateConfig: parsePrivateConfig(data.private_config),
    skipNk,
    isCleaningCash,
    isUtilitiesCash,
    isKurtaxeCash,
    platformFees: platformFees as PlatformFees,
    pricingSettings: pricing,
    komfortpaket,
  });

  // === Alle Werte aus der zentralen Berechnung (NUR ANZEIGE!) ===
  const {
    utilityCosts: costCalc,
    baseCosts,
    kurtaxe,
    cleaningCost,
    totalNkCosts, // NK ohne Reinigung - für Anzeige
    basisMiete,
    mieterlos, // Basis für Provision
    nkEinnahmen,
    reinigungEinnahmen,
    kurtaxeEinnahmen,
    provision: commission,
    gesamteinzahlung,
    gesamtbelastung,
    gesamtauszahlung, // Für Mieterlös-Berechnung (Booking.com)
    calculatedCostsForMieterlos, // Abzug für Booking.com
    anteiligeMietgebuehr, // Abzug für andere Plattformen
    paymentProcessingFee,
    mietAnteil,
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,
    barNk,
    barKurtaxe,
    barReinigung,
    komfortpaketCosts,
    komfortpaketIncome,
    komfortpaketEnabled,
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
                loading="eager"
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
              <p className="font-medium text-green-700">
                {formatDateWithWeekday(data.arrival_date)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Abreise</span>
              <p className="font-medium text-red-700">
                {formatDateWithWeekday(data.departure_date)}
              </p>
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
                  : data.platform?.toLowerCase().includes('fewo') ||
                      data.platform?.toLowerCase().includes('vrbo')
                    ? 'bg-orange-100 text-orange-800'
                    : data.platform?.toLowerCase().includes('airbnb')
                      ? 'bg-pink-100 text-pink-800'
                      : 'bg-gray-100 text-gray-800'
              }`}
            >
              {data.platform || 'Direkt'}
            </span>
            {data.booking_number && (
              <span className="text-sm text-gray-500 font-mono">#{data.booking_number}</span>
            )}
            {data.is_private === 1 && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                Privat
              </span>
            )}
            {skipNk && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                Keine NK
              </span>
            )}
          </div>

          {/* Financial Summary Bar */}
          {(() => {
            const ertrag = financeResult.gesamtertrag;
            return (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Einzahlung</p>
                  <p className="text-sm font-bold text-green-700">
                    {formatCurrency(gesamteinzahlung)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mieterlös</p>
                  <p className="text-sm font-bold text-purple-700">{formatCurrency(mieterlos)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Kosten</p>
                  <p className="text-sm font-bold text-red-600">
                    {formatCurrency(gesamtbelastung)}
                  </p>
                </div>
                <div
                  className={`${ertrag >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg p-2 text-center`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ertrag</p>
                  <p
                    className={`text-sm font-bold ${ertrag >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                  >
                    {formatCurrency(ertrag)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Provision + Payout summary line */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Provision: {formatCurrency(commission)} (10% v. {formatCurrency(mieterlos)})
            </span>
            {payoutDate && (
              <span className="text-emerald-700 font-medium">Eingegangen: {payoutDate}</span>
            )}
          </div>

          {/* Expandable financial details */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowFinanceDetails(!showFinanceDetails)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Finanzdetails
              </span>
              {showFinanceDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showFinanceDetails && (
              <div className="px-3 pb-3 border-t">
                <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <tbody>
                    {/* === EINZAHLUNGEN === */}
                    <tr>
                      <td
                        colSpan={2}
                        className="py-1 pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Einzahlungen
                      </td>
                    </tr>
                    <tr className="text-green-700">
                      <td className="py-0.5 pl-2">Miete:</td>
                      <td className="py-0.5 text-right w-28">{formatCurrency(basisMiete)}</td>
                    </tr>
                    {(nkEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                      <tr className="text-green-700">
                        <td className="py-0.5 pl-2">Nebenkosten:</td>
                        <td className="py-0.5 text-right w-28">
                          {isPlatformWithIncludedCosts ? '(inkl.)' : formatCurrency(nkEinnahmen)}
                        </td>
                      </tr>
                    )}
                    {isUtilitiesCash && totalNkCosts > 0 && (
                      <tr className="text-green-700">
                        <td className="py-0.5 pl-2">NK + Kurtaxe (bar):</td>
                        <td className="py-0.5 text-right w-28">{formatCurrency(totalNkCosts)}</td>
                      </tr>
                    )}
                    {kurtaxeEinnahmen > 0 && !isPlatformWithIncludedCosts && (
                      <tr className="text-green-700">
                        <td className="py-0.5 pl-2">Kurtaxe:</td>
                        <td className="py-0.5 text-right w-28">
                          {formatCurrency(kurtaxeEinnahmen)}
                        </td>
                      </tr>
                    )}
                    {!isUtilitiesCash &&
                      (isKurtaxeCash || isPlatformWithIncludedCosts) &&
                      barKurtaxe > 0 && (
                        <tr className="text-green-700">
                          <td className="py-0.5 pl-2">Kurtaxe (bar):</td>
                          <td className="py-0.5 text-right w-28">{formatCurrency(barKurtaxe)}</td>
                        </tr>
                      )}
                    {(reinigungEinnahmen > 0 || isPlatformWithIncludedCosts) && (
                      <tr className="text-green-700">
                        <td className="py-0.5 pl-2">Reinigung:</td>
                        <td className="py-0.5 text-right w-28">
                          {isPlatformWithIncludedCosts
                            ? '(inkl.)'
                            : formatCurrency(reinigungEinnahmen)}
                        </td>
                      </tr>
                    )}
                    {isCleaningCash && (
                      <tr className="text-green-700">
                        <td className="py-0.5 pl-2">Reinigung (bar):</td>
                        <td className="py-0.5 text-right w-28">{formatCurrency(cleaningCost)}</td>
                      </tr>
                    )}
                    {komfortpaketEnabled && komfortpaketIncome > 0 && (
                      <tr className="text-green-700">
                        <td className="py-0.5 pl-2">Komfortpaket:</td>
                        <td className="py-0.5 text-right w-28">
                          {formatCurrency(komfortpaketIncome)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-green-50">
                      <td className="py-1 pl-2 font-medium border-t border-green-200">
                        = Gesamteinzahlung:
                      </td>
                      <td className="py-1 text-right w-28 font-semibold text-green-700 border-t border-green-200">
                        {formatCurrency(gesamteinzahlung)}
                      </td>
                    </tr>

                    {/* === KOSTEN === */}
                    <tr>
                      <td
                        colSpan={2}
                        className="py-1 pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Kosten
                      </td>
                    </tr>
                    {!skipNk && (
                      <>
                        <tr className="text-red-600">
                          <td className="py-0.5 pl-2">
                            <button
                              onClick={() => setShowNkDetails(!showNkDetails)}
                              className="flex items-center gap-1 hover:text-red-800"
                            >
                              NK (kalk. inkl. Kurtaxe)
                              {showNkDetails ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </td>
                          <td className="py-0.5 text-right w-28">{formatCurrency(totalNkCosts)}</td>
                        </tr>
                        {showNkDetails && costCalc?.breakdown && (
                          <>
                            <tr className="text-xs text-gray-500">
                              <td className="py-0.5 pl-6">
                                Kurtaxe ({costCalc.breakdown.kurtaxeDetails}):
                              </td>
                              <td className="py-0.5 text-right">
                                {formatCurrency(costCalc.breakdown.kurtaxe)}
                              </td>
                            </tr>
                            <tr className="text-xs text-gray-500">
                              <td className="py-0.5 pl-6">
                                Holz ({costCalc.breakdown.holzBuendel} Bündel):
                              </td>
                              <td className="py-0.5 text-right">
                                {formatCurrency(costCalc.breakdown.holz)}
                              </td>
                            </tr>
                            <tr className="text-xs text-gray-500">
                              <td className="py-0.5 pl-6">Wasser:</td>
                              <td className="py-0.5 text-right">
                                {formatCurrency(costCalc.breakdown.water)}
                              </td>
                            </tr>
                            <tr className="text-xs text-gray-500">
                              <td className="py-0.5 pl-6">
                                Müll ({costCalc.breakdown.trashBags} Säcke):
                              </td>
                              <td className="py-0.5 text-right">
                                {formatCurrency(costCalc.breakdown.trash)}
                              </td>
                            </tr>
                            <tr className="text-xs text-gray-500">
                              <td className="py-0.5 pl-6">
                                Strom ({costCalc.breakdown.electricityKwh} kWh inkl.):
                              </td>
                              <td className="py-0.5 text-right">
                                {formatCurrency(costCalc.breakdown.electricity)}
                              </td>
                            </tr>
                            {!isCleaningCash && (
                              <tr className="text-xs text-gray-500">
                                <td className="py-0.5 pl-6">
                                  Reinigung ({hasDog ? 'mit Hund' : 'Standard'}):
                                </td>
                                <td className="py-0.5 text-right">
                                  {formatCurrency(costCalc.breakdown.reinigung)}
                                </td>
                              </tr>
                            )}
                          </>
                        )}
                        <tr className="text-red-600">
                          <td className="py-0.5 pl-2">Reinigung{isCleaningCash && ' (bar)'}:</td>
                          <td className="py-0.5 text-right w-28">{formatCurrency(cleaningCost)}</td>
                        </tr>
                      </>
                    )}
                    {komfortpaketEnabled && komfortpaketCosts > 0 && (
                      <tr className="text-red-600">
                        <td className="py-0.5 pl-2">
                          Komfortpaket ({komfortpaket?.persons || 0} Pers.):
                        </td>
                        <td className="py-0.5 text-right w-28">
                          {formatCurrency(komfortpaketCosts)}
                        </td>
                      </tr>
                    )}

                    {/* === MIETERLÖS === */}
                    <tr>
                      <td
                        colSpan={2}
                        className="py-1 pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Mieterlös (Basis für Provision)
                      </td>
                    </tr>
                    <tr className="text-gray-500 text-xs">
                      <td className="py-0.5 pl-4">Gesamteinzahlung (Basis):</td>
                      <td className="py-0.5 text-right">
                        {formatCurrency(mieterlos + calculatedCostsForMieterlos)}
                      </td>
                    </tr>
                    <tr className="text-gray-500 text-xs">
                      <td className="py-0.5 pl-4">
                        ./. kalk. Kosten (NK+Kurtaxe+Reinigung
                        {komfortpaketEnabled && komfortpaketCosts > 0 ? '+Komfortpaket' : ''}):
                      </td>
                      <td className="py-0.5 text-right">
                        -{formatCurrency(calculatedCostsForMieterlos)}
                      </td>
                    </tr>
                    <tr className="text-purple-700 font-medium">
                      <td className="py-0.5 pl-2">= Mieterlös:</td>
                      <td className="py-0.5 text-right w-28">{formatCurrency(mieterlos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
                Kommunikation ({communications.filter((c) => c.type !== 'system').length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {communications
                  .filter((c) => c.type !== 'system') // Skip system events
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
                        <span>
                          {formatDate(comm.date)}
                          {comm.time ? ` ${comm.time}` : ''}
                        </span>
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
                        <FileText
                          className={`w-4 h-4 flex-shrink-0 ${
                            doc.file_type.includes('pdf') ? 'text-red-500' : 'text-blue-500'
                          }`}
                        />
                        <span className="text-sm text-gray-700 truncate">
                          {doc.original_filename}
                        </span>
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
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
          >
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
