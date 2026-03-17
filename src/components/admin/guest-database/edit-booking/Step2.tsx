'use client';

import { ChevronRight, Euro, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { KOMFORTPAKET_COST_PER_PERSON, KOMFORTPAKET_DEFAULT_PRICE } from '@/lib/utils/financeCalculations';
import type { PlatformType } from './platformConfig';

interface FinanceResult {
  gesamteinzahlung: number;
  gesamtkosten: number;
  gesamtertrag: number;
  mieterlos: number;
  provision: number;
  cleaningCost: number;
  totalNkCosts: number;
  kurtaxe: number;
  komfortpaketCosts: number;
  komfortpaketIncome: number;
}

interface Step2Props {
  platformType: PlatformType;
  hasDog: boolean;
  // Booking.com / Airbnb
  payoutAmount: number;
  setPayoutAmount: (v: number) => void;
  setRentalPrice: (v: number) => void;
  cleaningCash: boolean;
  setCleaningCash: (v: boolean) => void;
  utilitiesCash: boolean;
  setUtilitiesCash: (v: boolean) => void;
  showBookingFees: boolean;
  setShowBookingFees: (v: boolean) => void;
  guestTotalStr: string;
  setGuestTotalStr: (v: string) => void;
  serviceFeeStr: string;
  setServiceFeeStr: (v: string) => void;
  processingFeeStr: string;
  setProcessingFeeStr: (v: string) => void;
  guestTotalPayment: number;
  platformServiceFee: number;
  paymentProcessingFee: number;
  extractedPayoutDate: string;
  setExtractedPayoutDate: (v: string) => void;
  syncFeeValues: () => void;
  // FeWo / Direkt
  rentalPrice: number;
  setRentalPrice2: (v: number) => void;
  nebenkostenIncome: number;
  setNebenkostenIncome: (v: number) => void;
  cleaningFeeIncome: number;
  setCleaningFeeIncome: (v: number) => void;
  setPaymentProcessingFee: (v: number) => void;
  // Komfortpaket
  isPrivate: boolean;
  adults: number;
  komfortpaketEnabled: boolean;
  setKomfortpaketEnabled: (v: boolean) => void;
  komfortpaketPersons: number;
  setKomfortpaketPersons: (v: number) => void;
  komfortpaketGuestPaid: boolean;
  setKomfortpaketGuestPaid: (v: boolean) => void;
  komfortpaketPricePerPerson: number;
  setKomfortpaketPricePerPerson: (v: number) => void;
  komfortpaketPriceStr: string;
  setKomfortpaketPriceStr: (v: string) => void;
  // Finance result
  financeResult: FinanceResult;
}

export function Step2({
  platformType,
  hasDog,
  payoutAmount,
  setPayoutAmount,
  setRentalPrice,
  cleaningCash,
  setCleaningCash,
  utilitiesCash,
  setUtilitiesCash,
  showBookingFees,
  setShowBookingFees,
  guestTotalStr,
  setGuestTotalStr,
  serviceFeeStr,
  setServiceFeeStr,
  processingFeeStr,
  setProcessingFeeStr,
  guestTotalPayment,
  platformServiceFee,
  paymentProcessingFee,
  extractedPayoutDate,
  setExtractedPayoutDate,
  syncFeeValues,
  rentalPrice,
  setRentalPrice2,
  nebenkostenIncome,
  setNebenkostenIncome,
  cleaningFeeIncome,
  setCleaningFeeIncome,
  setPaymentProcessingFee,
  isPrivate,
  adults,
  komfortpaketEnabled,
  setKomfortpaketEnabled,
  komfortpaketPersons,
  setKomfortpaketPersons,
  komfortpaketGuestPaid,
  setKomfortpaketGuestPaid,
  komfortpaketPricePerPerson,
  setKomfortpaketPricePerPerson,
  komfortpaketPriceStr,
  setKomfortpaketPriceStr,
  financeResult,
}: Step2Props) {
  const {
    gesamteinzahlung,
    gesamtkosten,
    gesamtertrag,
    mieterlos,
    provision,
    cleaningCost,
    totalNkCosts,
    kurtaxe,
    komfortpaketCosts,
    komfortpaketIncome,
  } = financeResult;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Finanzdaten</h3>
        <p className="text-sm text-gray-500">
          {platformType === 'booking' || platformType === 'airbnb'
            ? 'Nur Auszahlungsbetrag eingeben - Rest wird berechnet'
            : 'Miete und Nebenkosten eingeben'}
        </p>
      </div>

      {/* Booking.com / Airbnb: Payout mit optionalen Gebühren */}
      {(platformType === 'booking' || platformType === 'airbnb') && (
        <div className="space-y-4">
          {/* Haupt-Eingabe: Netto-Auszahlung */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Netto-Auszahlung (was auf dem Konto ankommt)
            </label>
            <div className="relative">
              <input
                type="number"
                value={payoutAmount || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPayoutAmount(val);
                  // Bei Booking/Airbnb: Miete = Auszahlung (NK sind inkludiert)
                  setRentalPrice(val);
                }}
                step="0.01"
                placeholder="z.B. 1246.56"
                className="w-full px-4 py-3 text-xl font-semibold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Der Betrag enthält Miete, NK und Reinigung. Provision wird berechnet.
            </p>
          </div>

          {/* Barzahlung Optionen */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cleaningCash}
                onChange={(e) => setCleaningCash(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Reinigung bar bezahlt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={utilitiesCash}
                onChange={(e) => setUtilitiesCash(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">NK bar bezahlt</span>
            </label>
          </div>

          {/* Optionale Gebühren-Eingabe */}
          {platformType === 'booking' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBookingFees(!showBookingFees)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Gebühren erfassen (optional)
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${showBookingFees ? 'rotate-90' : ''}`} />
              </button>

              {showBookingFees && (
                <div className="p-4 space-y-4 bg-white">
                  <p className="text-xs text-gray-500 mb-3">
                    Optional: Gastzahlung und Gebühren für detailliertes Tracking
                  </p>

                  {/* Gastzahlung */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zahlung des Gastes (Brutto)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={guestTotalStr}
                        onChange={(e) => setGuestTotalStr(e.target.value)}
                        onBlur={syncFeeValues}
                        placeholder="z.B. 1500.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Service-Gebühr */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Booking.com Service-Gebühr
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={serviceFeeStr}
                        onChange={(e) => setServiceFeeStr(e.target.value)}
                        onBlur={syncFeeValues}
                        placeholder="z.B. 180.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Zahlungsgebühr */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zahlungsabwicklung
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={processingFeeStr}
                        onChange={(e) => setProcessingFeeStr(e.target.value)}
                        onBlur={syncFeeValues}
                        placeholder="z.B. 45.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Auszahlungsdatum */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auszahlungsdatum
                    </label>
                    <input
                      type="date"
                      value={extractedPayoutDate}
                      onChange={(e) => setExtractedPayoutDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Berechnungs-Hinweis */}
                  {guestTotalPayment > 0 && platformServiceFee > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-gray-600">
                      <div className="flex justify-between mb-1">
                        <span>Gastzahlung:</span>
                        <span>{formatCurrency(guestTotalPayment)}</span>
                      </div>
                      <div className="flex justify-between mb-1 text-red-600">
                        <span>./. Service-Gebühr:</span>
                        <span>-{formatCurrency(platformServiceFee)}</span>
                      </div>
                      {paymentProcessingFee > 0 && (
                        <div className="flex justify-between mb-1 text-red-600">
                          <span>./. Zahlungsabwicklung:</span>
                          <span>-{formatCurrency(paymentProcessingFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-blue-200 font-medium">
                        <span>= Netto-Auszahlung:</span>
                        <span className="text-green-600">{formatCurrency(guestTotalPayment - platformServiceFee - paymentProcessingFee)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FeWo / Direkt: Vollständige Eingabe */}
      {(platformType === 'fewo' || platformType === 'direct') && (
        <>
          {/* Miete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Euro className="w-4 h-4 inline mr-1" />
              Mietpreis *
            </label>
            <div className="relative">
              <input
                type="number"
                value={rentalPrice || ''}
                onChange={(e) => setRentalPrice2(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder="z.B. 2400.00"
                className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
          </div>

          {/* NK */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Nebenkosten-Einnahmen
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={utilitiesCash}
                  onChange={(e) => setUtilitiesCash(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                  <Banknote className="w-4 h-4" />
                  bar
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                value={nebenkostenIncome || ''}
                onChange={(e) => setNebenkostenIncome(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder={`Kalk.: ${totalNkCosts.toFixed(2)}`}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Kalkulatorisch: {formatCurrency(totalNkCosts)} (inkl. Kurtaxe {formatCurrency(kurtaxe)})
            </p>
          </div>

          {/* Reinigung */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Reinigung-Einnahmen
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleaningCash}
                  onChange={(e) => setCleaningCash(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                  <Banknote className="w-4 h-4" />
                  bar
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                value={cleaningFeeIncome || ''}
                onChange={(e) => setCleaningFeeIncome(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder={`Standard: ${cleaningCost}`}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Standard: {formatCurrency(cleaningCost)} {hasDog && '(inkl. 25€ Hundeaufschlag)'}
            </p>
          </div>

          {/* Gebühren (nur FeWo) */}
          {platformType === 'fewo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Zahlungsbearbeitungsgebühr
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={paymentProcessingFee || ''}
                  onChange={(e) => setPaymentProcessingFee(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  placeholder="z.B. 66.20"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Wird anteilig vom Mieterlös abgezogen</p>
            </div>
          )}
        </>
      )}

      {/* Privat: Nur Miete (optional) */}
      {platformType === 'private' && (
        <div className="p-4 bg-gray-100 rounded-xl text-center">
          <p className="text-gray-600 mb-4">Private Buchung - keine Nebenkosten</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miete (optional)</label>
            <div className="relative max-w-xs mx-auto">
              <input
                type="number"
                value={rentalPrice || ''}
                onChange={(e) => setRentalPrice2(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
          </div>
        </div>
      )}

      {/* Komfortpaket - für alle außer Privatbuchungen */}
      {!isPrivate && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-amber-800">
              🛏️ Komfortpaket (Handtücher, Bettwäsche)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={komfortpaketEnabled}
                onChange={(e) => {
                  setKomfortpaketEnabled(e.target.checked);
                  if (e.target.checked && komfortpaketPersons === 0) {
                    setKomfortpaketPersons(adults);
                  }
                }}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <span className="text-sm text-amber-700 font-medium">aktiviert</span>
            </label>
          </div>

          {komfortpaketEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Anzahl Personen</label>
                  <input
                    type="number"
                    value={komfortpaketPersons || ''}
                    onChange={(e) => setKomfortpaketPersons(parseInt(e.target.value) || 0)}
                    min={1}
                    max={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Preis/Person (Standard: 25€)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={komfortpaketPriceStr}
                      onChange={(e) => setKomfortpaketPriceStr(e.target.value)}
                      onBlur={() => setKomfortpaketPricePerPerson(parseFloat(komfortpaketPriceStr) || KOMFORTPAKET_DEFAULT_PRICE)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={komfortpaketGuestPaid}
                  onChange={(e) => setKomfortpaketGuestPaid(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Gast hat bezahlt</span>
              </label>

              <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">
                <div className="flex justify-between">
                  <span>Kosten ({komfortpaketPersons} × {KOMFORTPAKET_COST_PER_PERSON}€):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(komfortpaketCosts)}</span>
                </div>
                {komfortpaketGuestPaid && (
                  <div className="flex justify-between mt-1">
                    <span>Einnahmen ({komfortpaketPersons} × {komfortpaketPricePerPerson}€):</span>
                    <span className="font-medium text-green-600">+{formatCurrency(komfortpaketIncome)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live-Vorschau Finanzübersicht */}
      {(rentalPrice > 0 || payoutAmount > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Vorschau</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Einnahmen</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(gesamteinzahlung)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kosten</p>
              <p className="text-lg font-bold text-red-500">{formatCurrency(gesamtkosten)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Ertrag</p>
              <p className={`text-lg font-bold ${gesamtertrag >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(gesamtertrag)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Mieterlös (Basis für Provision):</span>
              <span className="font-medium">{formatCurrency(mieterlos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Provision (10%):</span>
              <span className="font-medium text-red-500">−{formatCurrency(provision)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
