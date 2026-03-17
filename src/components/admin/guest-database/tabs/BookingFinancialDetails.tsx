'use client';

import { useState } from 'react';
import { TrendingUp, CreditCard, ChevronDown, ChevronUp, CheckCircle2, Circle, X, Plus } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils/formatting';
import type { RonaldPayment } from '../types';
import type { PlatformFees } from '@/lib/utils/financeCalculations';
import type { BookingCostResult } from '@/components/admin/utility-costs/types';

interface Transaction {
  date: string;
  amount: number;
  type: 'payment' | 'refund';
  status: string;
  description?: string;
  fee?: number;
}

type UtilityCosts = BookingCostResult;

interface BookingFinancialDetailsProps {
  // Finance result values
  utilityCosts: UtilityCosts | null;
  baseCosts: number;
  kurtaxe: number;
  cleaningCost: number;
  basisMiete: number;
  mieterlos: number;
  provision: number;
  nkEinnahmen: number;
  reinigungEinnahmen: number;
  paymentProcessingFee: number;
  mietAnteil: number;
  anteiligeMietgebuehr: number;
  gesamtauszahlung: number;
  barNk: number;
  barReinigung: number;
  gesamteinzahlung: number;
  totalNkCosts: number;
  gesamtkosten: number;
  gesamtertrag: number;
  isBookingCom: boolean;
  isAirbnb: boolean;
  isPlatformWithIncludedCosts: boolean;
  // Booking flags
  isPrivate: boolean;
  isCleaningCash: boolean;
  isUtilitiesCash: boolean;
  // Platform fees
  platformFees: PlatformFees;
  rentalIncome: number;
  // Transactions
  transactions: Transaction[];
  payoutDate: string;
  ronaldPayments: RonaldPayment[];
  // Payment status (manual)
  depositAmount: number;
  depositVerified: boolean;
  fullyPaid: boolean;
  finalPaymentAmount: number;
  ronaldPaymentsSum: number;
  depositPaid: number;
  finalPaymentPaid: number;
  // Handlers
  onTogglePaymentStatus?: (field: 'deposit_paid' | 'final_payment_paid', value: number) => void;
  onUpdateTransactions?: (transactions: Transaction[], payoutDate: string) => void;
}

export function BookingFinancialDetails({
  utilityCosts,
  baseCosts,
  kurtaxe,
  cleaningCost,
  basisMiete,
  mieterlos,
  provision,
  nkEinnahmen,
  reinigungEinnahmen,
  paymentProcessingFee,
  mietAnteil,
  anteiligeMietgebuehr,
  gesamtauszahlung,
  gesamteinzahlung,
  totalNkCosts,
  gesamtkosten,
  gesamtertrag,
  isPlatformWithIncludedCosts,
  isPrivate,
  isCleaningCash,
  isUtilitiesCash,
  platformFees,
  rentalIncome,
  transactions,
  payoutDate,
  ronaldPayments,
  depositAmount,
  depositVerified,
  fullyPaid,
  finalPaymentAmount,
  ronaldPaymentsSum,
  depositPaid,
  finalPaymentPaid,
  onTogglePaymentStatus,
  onUpdateTransactions,
}: BookingFinancialDetailsProps) {
  const [showCostDetails, setShowCostDetails] = useState(false);
  const [isEditingTransactions, setIsEditingTransactions] = useState(false);
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>([]);
  const [editedPayoutDate, setEditedPayoutDate] = useState('');

  const calculatedCosts = baseCosts;
  const totalEinzahlung = gesamteinzahlung;
  const actualNKCosts = totalNkCosts;

  return (
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
            <div className="flex justify-between">
              <span className="text-gray-600">Miete:</span>
              <span className="font-medium text-green-700">{formatCurrency(basisMiete)}</span>
            </div>
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
                  NK (kalk. inkl. Kurtaxe){isUtilitiesCash && ' (bar)'}:
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
            {/* Zahlungsbearbeitungsgebühren */}
            {paymentProcessingFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Zahlungsbearbeitungsgeb.:</span>
                <span className="font-medium text-red-600">{formatCurrency(paymentProcessingFee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Provision (10% v. Mieterlös):</span>
              <span className="font-medium text-red-600">{formatCurrency(provision)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="font-medium text-gray-900">= Gesamtkosten:</span>
              <span className="font-bold text-red-600">{formatCurrency(gesamtkosten)}</span>
            </div>

            {/* === GESAMTERTRAG === */}
            <div className="flex justify-between pt-3 border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Kalk. Gesamtertrag:</span>
              <span className={`font-bold text-lg ${gesamtertrag >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(gesamtertrag)}
              </span>
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
          {onUpdateTransactions && transactions.length > 0 && !isEditingTransactions && (
            <button
              onClick={() => {
                setEditedTransactions([...transactions]);
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
              {payoutDate && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 bg-emerald-50 -mx-3 px-3 py-2 rounded-b">
                  <span className="font-medium text-emerald-800">Auszahlung auf Konto am:</span>
                  <span className="font-bold text-emerald-700">{formatDate(payoutDate)}</span>
                </div>
              )}
            </>
          ) : ronaldPayments.length > 0 ? (
            <>
              {/* Ronald-Zahlungen (Kontobewegungen) anzeigen */}
              {ronaldPayments.map((payment, idx) => (
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
                  {formatCurrency(ronaldPaymentsSum)}
                </span>
              </div>
              {/* Status */}
              {rentalIncome > ronaldPaymentsSum && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Offen</span>
                  <span className="text-gray-600">
                    {formatCurrency(rentalIncome - ronaldPaymentsSum)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Fallback: Manuelle Anzahlung/Restzahlung */}
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => onTogglePaymentStatus?.('deposit_paid', depositPaid === 1 ? 0 : 1)}
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                  title={depositVerified ? 'Als nicht bezahlt markieren' : 'Als bezahlt markieren'}
                >
                  {depositVerified ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
                  <span className="text-gray-700">Anzahlung</span>
                </button>
                <span className={depositVerified ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {formatCurrency(depositAmount)}
                  {depositVerified && <span className="ml-1 text-xs">✓</span>}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => onTogglePaymentStatus?.('final_payment_paid', finalPaymentPaid === 1 ? 0 : 1)}
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                  title={fullyPaid ? 'Als nicht bezahlt markieren' : 'Als bezahlt markieren'}
                >
                  {fullyPaid ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
                  <span className="text-gray-700">Restzahlung</span>
                </button>
                <span className={fullyPaid ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {formatCurrency(finalPaymentAmount)}
                  {fullyPaid && <span className="ml-1 text-xs">✓</span>}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="font-medium">{fullyPaid ? 'Bezahlt' : 'Status'}</span>
                <span className={`font-bold ${fullyPaid ? 'text-green-600' : 'text-gray-900'}`}>
                  {fullyPaid ? '✓ Vollständig' : formatCurrency(rentalIncome - ronaldPaymentsSum) + ' offen'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
