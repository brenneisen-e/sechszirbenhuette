'use client';

import { useState, useEffect } from 'react';
import { Euro, Loader2, ChevronLeft, ChevronRight, Printer, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { anonymizeGuestName, roundDemoAmount } from '@/lib/utils/demoMode';

// Helper to parse various date formats
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  // Try German format (DD.MM.YYYY)
  const germanMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try German format with spaces
  const germanSpaceMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (germanSpaceMatch) {
    const [, day, month, year] = germanSpaceMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try ISO format (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return new Date(dateStr);
}

function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrencyBase(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

interface Deposit {
  id: string;
  amount: number;
  date: string;
  guest_name?: string;
  booking_number?: string;
  arrival_date?: string;
  departure_date?: string;
  platform?: string;
  description?: string;
  type: 'payout' | 'refund';
}

interface BookingWithTransactions {
  id: number;
  guest_id: number;
  guest_name?: string;
  booking_number: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  platform: string | null;
  rental_price: number;
  additional_costs: string | null;
}

interface BankTransactionsProps {
  demoMode?: boolean;
}

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function BankTransactions({ demoMode = false }: BankTransactionsProps) {
  // Demo mode helpers
  const formatCurrency = (amount: number): string => {
    if (demoMode) return `~${roundDemoAmount(amount).toLocaleString('de-DE')} €`;
    return formatCurrencyBase(amount);
  };
  const demoName = (name: string | undefined): string | undefined => {
    if (!demoMode || !name) return name;
    return anonymizeGuestName(name);
  };

  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set([new Date().getMonth()]));
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [guestsRes, bookingsRes] = await Promise.all([
        fetch('/api/admin/guests'),
        fetch('/api/admin/bookings'),
      ]);

      const guestsData = (await guestsRes.json()) as { guests?: { id: number; guest_name: string }[] };
      const bookingsData = (await bookingsRes.json()) as { bookings?: BookingWithTransactions[] };

      const allGuests = guestsData.guests || [];
      const allBookings = bookingsData.bookings || [];

      const guestNameMap = new Map(allGuests.map(g => [g.id, g.guest_name]));

      const extractedDeposits: Deposit[] = [];

      allBookings.forEach(booking => {
        if (!booking.additional_costs) return;

        try {
          const additionalCosts = JSON.parse(booking.additional_costs);
          const transactions = additionalCosts.transactions;

          // Check if we have explicit transactions
          if (Array.isArray(transactions) && transactions.length > 0) {
            transactions.forEach((t: { date?: string; amount?: number; type?: string; description?: string }, idx: number) => {
              if (!t.date || t.amount === undefined) return;

              const txDate = parseDate(t.date);
              const txYear = txDate.getFullYear();
              if (isNaN(txYear) || txYear !== selectedYear) return;

              extractedDeposits.push({
                id: `${booking.id}-${idx}`,
                amount: t.amount,
                date: t.date,
                guest_name: booking.guest_name || guestNameMap.get(booking.guest_id),
                booking_number: booking.booking_number || undefined,
                arrival_date: booking.arrival_date || undefined,
                departure_date: booking.departure_date || undefined,
                platform: booking.platform || undefined,
                description: t.description,
                type: t.type === 'refund' ? 'refund' : 'payout',
              });
            });
          } else if (additionalCosts.payout_date && additionalCosts.payout_amount) {
            // Fallback: Use payout_date + payout_amount when no explicit transactions exist
            const payoutDate = parseDate(additionalCosts.payout_date);
            const payoutYear = payoutDate.getFullYear();
            if (!isNaN(payoutYear) && payoutYear === selectedYear) {
              extractedDeposits.push({
                id: `${booking.id}-payout`,
                amount: additionalCosts.payout_amount,
                date: additionalCosts.payout_date,
                guest_name: booking.guest_name || guestNameMap.get(booking.guest_id),
                booking_number: booking.booking_number || undefined,
                arrival_date: booking.arrival_date || undefined,
                departure_date: booking.departure_date || undefined,
                platform: booking.platform || undefined,
                description: 'Auszahlung',
                type: 'payout',
              });
            }
          }
        } catch (e) {
          // Invalid JSON
        }
      });

      // Sort by date descending
      extractedDeposits.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

      setDeposits(extractedDeposits);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (month: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  // Group deposits by month
  const depositsByMonth = deposits.reduce((acc, deposit) => {
    const date = parseDate(deposit.date);
    const month = date.getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(deposit);
    return acc;
  }, {} as Record<number, Deposit[]>);

  // Calculate totals
  const totalPayouts = deposits.filter(d => d.type === 'payout').reduce((sum, d) => sum + d.amount, 0);
  const totalRefunds = deposits.filter(d => d.type === 'refund').reduce((sum, d) => sum + Math.abs(d.amount), 0);
  const netTotal = totalPayouts - totalRefunds;

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3">Lade Kontoauszug...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Kontoauszug {selectedYear}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Übersicht aller eingegangenen Einzahlungen nach Buchungen</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Print button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors print:hidden"
              title="Drucken"
            >
              <Printer className="w-5 h-5" />
              Drucken
            </button>

            {/* Year selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-lg"
              >
                {getAvailableYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Einzahlungen</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-green-700 mt-1">{formatCurrency(totalPayouts)}</p>
            <p className="text-xs text-gray-400 mt-1">{deposits.filter(d => d.type === 'payout').length} Transaktionen</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rückerstattungen</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-red-600 mt-1">-{formatCurrency(totalRefunds)}</p>
            <p className="text-xs text-gray-400 mt-1">{deposits.filter(d => d.type === 'refund').length} Transaktionen</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Netto Gesamt</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{formatCurrency(netTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">{deposits.length} Transaktionen insgesamt</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Monthly breakdown */}
      <div className="space-y-4">
        {MONTHS.map((monthName, monthIndex) => {
          const monthDeposits = depositsByMonth[monthIndex] || [];
          const monthTotal = monthDeposits.reduce((sum, d) => sum + (d.type === 'payout' ? d.amount : -Math.abs(d.amount)), 0);
          const isExpanded = expandedMonths.has(monthIndex);

          if (monthDeposits.length === 0) return null;

          return (
            <div key={monthIndex} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(monthIndex)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-gray-900">{monthName} {selectedYear}</span>
                  <span className="text-sm text-gray-500">({monthDeposits.length} Einzahlungen)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold ${monthTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(monthTotal)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Month Details */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Gast / Buchung</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Plattform</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Betrag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthDeposits.map((deposit) => (
                        <tr key={deposit.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(deposit.date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{demoName(deposit.guest_name) || 'Unbekannt'}</div>
                            {deposit.booking_number && (
                              <div className="text-xs text-gray-500">#{deposit.booking_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {deposit.arrival_date && deposit.departure_date ? (
                              <>{formatDate(deposit.arrival_date)} - {formatDate(deposit.departure_date)}</>
                            ) : deposit.arrival_date ? (
                              formatDate(deposit.arrival_date)
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {deposit.platform && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {deposit.platform}
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm font-semibold text-right ${
                            deposit.type === 'payout' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {deposit.type === 'refund' ? '-' : '+'}{formatCurrency(Math.abs(deposit.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {deposits.length === 0 && (
          <div className="border border-gray-200 rounded-lg p-12 text-center">
            <Euro className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Einzahlungen für {selectedYear} gefunden</p>
            <p className="text-sm text-gray-400 mt-1">
              Einzahlungen werden automatisch aus den Buchungstransaktionen übernommen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
