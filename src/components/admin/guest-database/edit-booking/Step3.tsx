'use client';

import { formatCurrency } from '@/lib/utils/formatting';
import type { PlatformType } from './platformConfig';
import { PLATFORM_CONFIG } from './platformConfig';

interface FinanceResult {
  gesamteinzahlung: number;
  gesamtkosten: number;
  gesamtertrag: number;
  totalNkCosts: number;
  cleaningCost: number;
  provision: number;
}

interface Step3Props {
  platform: string;
  platformType: PlatformType;
  bookingNumber: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  adults: number;
  children: number;
  hasDog: boolean;
  rentalPrice: number;
  nebenkostenIncome: number;
  cleaningFeeIncome: number;
  utilitiesCash: boolean;
  cleaningCash: boolean;
  // Step 3 form
  depositPaid: boolean;
  setDepositPaid: (v: boolean) => void;
  finalPaymentPaid: boolean;
  setFinalPaymentPaid: (v: boolean) => void;
  depositAmount: number;
  setDepositAmount: (v: number) => void;
  status: string;
  setStatus: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  // Finance result
  financeResult: FinanceResult;
}

export function Step3({
  platform,
  platformType,
  bookingNumber,
  arrivalDate,
  departureDate,
  nights,
  adults,
  children,
  hasDog,
  rentalPrice,
  nebenkostenIncome,
  cleaningFeeIncome,
  utilitiesCash,
  cleaningCash,
  depositPaid,
  setDepositPaid,
  finalPaymentPaid,
  setFinalPaymentPaid,
  depositAmount,
  setDepositAmount,
  status,
  setStatus,
  notes,
  setNotes,
  financeResult,
}: Step3Props) {
  const { gesamteinzahlung, gesamtkosten, gesamtertrag, totalNkCosts, cleaningCost, provision } = financeResult;
  const config = PLATFORM_CONFIG[platformType];

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Übersicht & Bestätigung</h3>
        <p className="text-sm text-gray-500">Prüfen Sie alle Angaben</p>
      </div>

      {/* Zusammenfassung */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {/* Header */}
        <div className={`${config.color} text-white p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.icon}
              <div>
                <p className="font-semibold">{platform}</p>
                {bookingNumber && <p className="text-sm opacity-90">#{bookingNumber}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(gesamtertrag)}</p>
              <p className="text-sm opacity-90">Ertrag</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Zeitraum & Gäste */}
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-gray-500">Zeitraum</p>
              <p className="font-medium">
                {new Date(arrivalDate).toLocaleDateString('de-DE')} – {new Date(departureDate).toLocaleDateString('de-DE')}
              </p>
              <p className="text-gray-500">{nights} Nächte</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Gäste</p>
              <p className="font-medium">{adults} Erw.{children > 0 && `, ${children} Kind.`}</p>
              {hasDog && <p className="text-amber-600">Mit Hund</p>}
            </div>
          </div>

          {/* Finanzen */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Einnahmen */}
              <div>
                <p className="text-xs font-semibold text-green-600 mb-2">EINNAHMEN</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Miete</span>
                    <span className="text-green-600">{formatCurrency(rentalPrice)}</span>
                  </div>
                  {nebenkostenIncome > 0 && (
                    <div className="flex justify-between">
                      <span>NK {utilitiesCash && '(bar)'}</span>
                      <span className="text-green-600">{formatCurrency(nebenkostenIncome)}</span>
                    </div>
                  )}
                  {cleaningFeeIncome > 0 && (
                    <div className="flex justify-between">
                      <span>Reinigung {cleaningCash && '(bar)'}</span>
                      <span className="text-green-600">{formatCurrency(cleaningFeeIncome)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Gesamt</span>
                    <span className="text-green-600">{formatCurrency(gesamteinzahlung)}</span>
                  </div>
                </div>
              </div>

              {/* Kosten */}
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2">KOSTEN</p>
                <div className="space-y-1 text-sm">
                  {totalNkCosts > 0 && !utilitiesCash && (
                    <div className="flex justify-between">
                      <span>NK (kalk.)</span>
                      <span className="text-red-500">−{formatCurrency(totalNkCosts)}</span>
                    </div>
                  )}
                  {!cleaningCash && (
                    <div className="flex justify-between">
                      <span>Reinigung</span>
                      <span className="text-red-500">−{formatCurrency(cleaningCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Provision</span>
                    <span className="text-red-500">−{formatCurrency(provision)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Gesamt</span>
                    <span className="text-red-500">−{formatCurrency(gesamtkosten)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zahlungsstatus */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm font-semibold text-gray-700 mb-3">Zahlungsstatus</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-green-300">
            <input
              type="checkbox"
              checked={depositPaid}
              onChange={(e) => setDepositPaid(e.target.checked)}
              className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-700">Anzahlung</span>
              {depositAmount > 0 && <span className="text-gray-500 text-sm ml-1">({formatCurrency(depositAmount)})</span>}
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-green-300">
            <input
              type="checkbox"
              checked={finalPaymentPaid}
              onChange={(e) => setFinalPaymentPaid(e.target.checked)}
              className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="font-medium text-gray-700">Restzahlung</span>
          </label>
        </div>
      </div>

      {/* Status & Notizen */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="pending">Ausstehend</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anzahlung (€)</label>
          <input
            type="number"
            value={depositAmount || ''}
            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optionale Anmerkungen..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
    </div>
  );
}
