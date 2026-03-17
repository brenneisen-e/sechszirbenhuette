'use client';

import { useState, useEffect, useCallback } from 'react';
import { Printer, Loader2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import {
  calculateBookingFinances,
  parsePlatformFeesFromJson,
  parseKomfortpaketFromJson,
  parseChildrenAges,
  parsePrivateConfig,
  KOMFORTPAKET_DEFAULT_PRICE,
} from '@/lib/utils/financeCalculations';
import { COUNTRIES } from '@/components/admin/guest-database/constants';

// ── Country code → Flag emoji ──
const FLAG_OFFSET = 0x1F1E6 - 65; // 'A' = 65
function countryFlag(code: string): string {
  if (code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(upper.charCodeAt(0) + FLAG_OFFSET, upper.charCodeAt(1) + FLAG_OFFSET);
}

function countryName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name || code;
}

// ── Nationality → Language (heuristic) ──
const LANG_MAP: Record<string, string> = {
  DE: 'Deutsch', AT: 'Deutsch', CH: 'Deutsch', LI: 'Deutsch',
  GB: 'Englisch', US: 'Englisch', IE: 'Englisch', AU: 'Englisch', CA: 'Englisch',
  FR: 'Französisch', BE: 'Französisch',
  IT: 'Italienisch',
  ES: 'Spanisch',
  NL: 'Niederländisch',
  PL: 'Polnisch',
  CZ: 'Tschechisch', SK: 'Slowakisch',
  HU: 'Ungarisch',
  HR: 'Kroatisch', SI: 'Slowenisch',
  RO: 'Rumänisch',
  SE: 'Schwedisch', NO: 'Norwegisch', DK: 'Dänisch',
};

function guessLanguage(nationality: string | null): string {
  if (!nationality) return 'Unbekannt';
  const first = nationality.split(',')[0].trim().toUpperCase();
  return LANG_MAP[first] || 'Englisch';
}

// ── Interfaces ──
interface GuestInfo {
  id: number;
  guest_name: string;
  nationality: string | null;
  email: string | null;
  phone: string | null;
}

interface BriefingBooking {
  id: number;
  guest_id: number;
  guest_name: string;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  booking_number: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages: string | null;
  pets: string | null;
  platform: string | null;
  rental_price: number;
  additional_costs: string | null;
  cleaning_cash: number;
  utilities_cash: number;
  kurtaxe_cash: number;
  is_private: number;
  private_config: string | null;
  notes: string | null;
  briefing_notes: string | null;
  preferred_language: string | null;
  early_checkin: string | null;
  late_checkout: string | null;
  status: string;
}

interface BarItem {
  label: string;
  detail: string;
  amount: number;
}

interface BriefingGeneratorProps {
  adminPassword: string;
}

// ── Formatting helpers ──
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getNights(arrival: string | null, departure: string | null): number {
  if (!arrival || !departure) return 0;
  return Math.ceil((new Date(departure).getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60 * 24));
}

function fmtEur(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_LABELS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// ── Calendar helpers for print overview ──
interface CalendarBooking {
  guest_name: string;
  arrival: Date;
  departure: Date;
  platform: string | null;
}

function getMonthsRange(bookings: CalendarBooking[]): { year: number; month: number }[] {
  if (bookings.length === 0) return [];
  const min = new Date(Math.min(...bookings.map(b => b.arrival.getTime())));
  const max = new Date(Math.max(...bookings.map(b => b.departure.getTime())));
  const months: { year: number; month: number }[] = [];
  const cur = new Date(min.getFullYear(), min.getMonth(), 1);
  while (cur <= max) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function MiniMonth({ year, month, calBookings }: { year: number; month: number; calBookings: CalendarBooking[] }) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday = 0, Sunday = 6
  const startDow = (firstDay.getDay() + 6) % 7;
  const cells: { day: number; booked: CalendarBooking | null }[] = [];

  // Empty cells before 1st
  for (let i = 0; i < startDow; i++) cells.push({ day: 0, booked: null });

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const booking = calBookings.find(b => date >= b.arrival && date < b.departure);
    cells.push({ day: d, booked: booking || null });
  }

  return (
    <div className="inline-block align-top mr-3 mb-2" style={{ width: '170px' }}>
      <div className="text-center font-bold text-[9pt] mb-1">{MONTH_LABELS[month]} {year}</div>
      <div className="grid grid-cols-7 gap-0 text-[7pt] text-center">
        {WEEKDAYS_SHORT.map(w => <div key={w} className="font-semibold text-gray-500 py-0.5">{w}</div>)}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`py-0.5 ${cell.day === 0 ? '' : cell.booked ? 'bg-green-200 text-green-900 font-semibold' : 'text-gray-700'}`}
            title={cell.booked ? `${cell.booked.guest_name}` : undefined}
          >
            {cell.day > 0 ? cell.day : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BriefingGenerator({ adminPassword }: BriefingGeneratorProps) {
  const [bookings, setBookings] = useState<BriefingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
  const [showPast, setShowPast] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const [guestsRes, bookingsRes] = await Promise.all([
        fetch('/api/admin/guests', { headers: { 'x-admin-password': adminPassword } }),
        fetch('/api/admin/bookings', { headers: { 'x-admin-password': adminPassword } }),
      ]);
      const guestsData = await guestsRes.json() as { guests?: GuestInfo[] };
      const bookingsData = await bookingsRes.json() as { bookings?: BriefingBooking[] };

      const guestMap = new Map<number, GuestInfo>();
      for (const g of guestsData.guests || []) {
        guestMap.set(g.id, g);
      }

      const enriched = (bookingsData.bookings || [])
        .map(b => {
          const guest = guestMap.get(b.guest_id);
          return {
            ...b,
            guest_name: guest?.guest_name || 'Unbekannt',
            nationality: guest?.nationality || null,
            email: guest?.email || null,
            phone: guest?.phone || null,
          };
        })
        .filter(b => b.status !== 'cancelled')
        .sort((a, b) => {
          const dateA = a.arrival_date ? new Date(a.arrival_date).getTime() : 0;
          const dateB = b.arrival_date ? new Date(b.arrival_date).getTime() : 0;
          return dateA - dateB;
        });

      setBookings(enriched);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [adminPassword]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter(b => !b.arrival_date || b.arrival_date >= today);
  const pastBookings = bookings.filter(b => b.arrival_date && b.arrival_date < today);
  const displayBookings = showPast ? bookings : upcomingBookings;

  const toggleBooking = (id: number) => {
    setSelectedBookings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedBookings.size === displayBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(displayBookings.map(b => b.id)));
    }
  };

  // ── Bar payment calculation ──
  const getBarItems = (booking: BriefingBooking): BarItem[] => {
    const items: BarItem[] = [];
    const hasDog = booking.pets?.toLowerCase().includes('hund') ?? false;
    const platformFees = parsePlatformFeesFromJson(booking.additional_costs);
    const komfortpaket = parseKomfortpaketFromJson(booking.additional_costs);
    const childrenAges = parseChildrenAges(booking.children_ages);
    const nights = getNights(booking.arrival_date, booking.departure_date);

    const finance = calculateBookingFinances({
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      adults: booking.adults || 2,
      rentalPrice: booking.rental_price,
      platform: booking.platform,
      hasDog,
      isPrivate: booking.is_private === 1 || booking.platform?.toLowerCase() === 'privat',
      privateConfig: parsePrivateConfig(booking.private_config),
      skipNk: false,
      isCleaningCash: booking.cleaning_cash === 1,
      isUtilitiesCash: booking.utilities_cash === 1,
      isKurtaxeCash: booking.kurtaxe_cash === 1,
      platformFees,
      komfortpaket,
      childrenAges,
    });

    // Reinigung bar
    if (booking.cleaning_cash === 1) {
      items.push({
        label: 'Reinigung',
        detail: hasDog ? '100 + 25 (Hund)' : '100,00',
        amount: finance.cleaningCost,
      });
    }

    // Kurtaxe bar (Booking.com/Airbnb immer bar, oder kurtaxe_cash flag)
    const isBookingAirbnb = finance.isBookingCom || finance.isAirbnb;
    if (finance.barKurtaxe > 0) {
      items.push({
        label: 'Kurtaxe',
        detail: `${finance.kurtaxePersons} Pers. x ${nights} N. x Satz`,
        amount: finance.barKurtaxe,
      });
    } else if (isBookingAirbnb && finance.kurtaxe > 0 && !booking.utilities_cash) {
      // Booking.com/Airbnb: Kurtaxe immer bar
      items.push({
        label: 'Kurtaxe',
        detail: `${finance.kurtaxePersons} Pers. x ${nights} N. x Satz`,
        amount: finance.kurtaxe,
      });
    }

    // NK bar (wenn utilities_cash, enthält auch Kurtaxe)
    if (booking.utilities_cash === 1) {
      items.push({
        label: 'Nebenkosten (inkl. Kurtaxe)',
        detail: 'Strom + Wasser + Müll + Holz + Kurtaxe',
        amount: finance.barNk,
      });
    }

    // Komfortpaket bar (wenn aktiv UND Gast bezahlt = bar kassieren)
    if (komfortpaket && komfortpaket.enabled && komfortpaket.guestPaid && komfortpaket.persons > 0) {
      const kpAmount = komfortpaket.persons * (komfortpaket.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE);
      items.push({
        label: 'Wäschepaket',
        detail: `${komfortpaket.persons} x ${komfortpaket.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE} EUR`,
        amount: kpAmount,
      });
    }

    return items;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Lade Buchungen...</span>
      </div>
    );
  }

  const briefingBookings = bookings.filter(b => selectedBookings.has(b.id));

  return (
    <div className="space-y-6">
      {/* ════════ Screen UI - hidden when printing ════════ */}
      <div className="print:hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Briefing Generator</h2>
            <p className="text-sm text-gray-500 mt-1">
              Arbeitsblatt für Hausverwalterin — Buchungen auswählen und drucken
            </p>
          </div>
          <button
            onClick={() => window.print()}
            disabled={selectedBookings.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            Briefing drucken ({selectedBookings.size})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <button onClick={selectAll} className="text-sm text-green-600 hover:text-green-700 font-medium">
            {selectedBookings.size === displayBookings.length ? 'Alle abwählen' : 'Alle auswählen'}
          </button>
          <button onClick={() => setShowPast(!showPast)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            {showPast ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Vergangene ({pastBookings.length})
          </button>
        </div>

        {/* Booking Selection List */}
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {displayBookings.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>Keine Buchungen vorhanden</p>
            </div>
          )}
          {displayBookings.map(booking => {
            const nights = getNights(booking.arrival_date, booking.departure_date);
            const isPast = booking.arrival_date && booking.arrival_date < today;
            const komfortpaket = parseKomfortpaketFromJson(booking.additional_costs);
            return (
              <label
                key={booking.id}
                className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isPast ? 'opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedBookings.has(booking.id)}
                  onChange={() => toggleBooking(booking.id)}
                  className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{booking.guest_name}</span>
                    {booking.nationality && (
                      <span className="text-sm">{countryFlag(booking.nationality.split(',')[0])}</span>
                    )}
                    {booking.platform && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{booking.platform}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {formatDate(booking.arrival_date)} — {formatDate(booking.departure_date)}
                    {nights > 0 && <span className="ml-2">({nights} Nächte)</span>}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.adults} Erw.{booking.children > 0 && `, ${booking.children} Kinder`}
                    {booking.pets && ` | ${booking.pets}`}
                    {komfortpaket?.enabled && ` | Wäschepaket: ${komfortpaket.persons}x`}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ════════ Print View - A4 Briefing (one per page) ════════ */}
      <div className="hidden print:block">
        <style>{`
          @media print {
            @page { size: A4; margin: 12mm 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; }
            .briefing-page { page-break-after: always; }
            .briefing-page:last-child { page-break-after: auto; }
          }
        `}</style>

        {/* ── Page 1: Calendar Overview ── */}
        {briefingBookings.length > 0 && (() => {
          const calBookings: CalendarBooking[] = bookings
            .filter(b => b.arrival_date && b.departure_date)
            .map(b => ({
              guest_name: b.guest_name,
              arrival: new Date(b.arrival_date!),
              departure: new Date(b.departure_date!),
              platform: b.platform,
            }));
          const months = getMonthsRange(
            briefingBookings
              .filter(b => b.arrival_date && b.departure_date)
              .map(b => ({ guest_name: b.guest_name, arrival: new Date(b.arrival_date!), departure: new Date(b.departure_date!), platform: b.platform }))
          );
          return (
            <div className="briefing-page">
              <div className="text-center mb-4 pb-2 border-b-2 border-gray-800">
                <h1 className="text-lg font-bold tracking-wide uppercase">Sechszirbenhütte — Belegungsübersicht</h1>
                <p className="text-[9pt] text-gray-500">Erstellt {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* Mini-Kalender */}
              <div className="mb-4">
                <div className="flex flex-wrap">
                  {months.map(m => <MiniMonth key={`${m.year}-${m.month}`} year={m.year} month={m.month} calBookings={calBookings} />)}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[8pt] text-gray-500">
                  <span className="inline-block w-3 h-3 bg-green-200 border border-green-400 mr-1" /> Belegt
                  <span className="inline-block w-3 h-3 bg-white border border-gray-300 mr-1" /> Frei
                </div>
              </div>

              {/* Buchungsliste */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-300 pb-1">Buchungen ({briefingBookings.length})</h2>
                <table className="w-full text-[9pt]">
                  <thead>
                    <tr className="border-b border-gray-300 text-left">
                      <th className="py-1 font-semibold">Gast</th>
                      <th className="py-1 font-semibold">Anreise</th>
                      <th className="py-1 font-semibold">Abreise</th>
                      <th className="py-1 font-semibold text-center">Nächte</th>
                      <th className="py-1 font-semibold text-center">Pers.</th>
                      <th className="py-1 font-semibold">Plattform</th>
                      <th className="py-1 font-semibold text-right">Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {briefingBookings.map(b => {
                      const n = getNights(b.arrival_date, b.departure_date);
                      const items = getBarItems(b);
                      const total = items.reduce((s, i) => s + i.amount, 0);
                      return (
                        <tr key={b.id} className="border-b border-gray-100">
                          <td className="py-1 font-medium">{b.guest_name}</td>
                          <td className="py-1">{formatDate(b.arrival_date)}</td>
                          <td className="py-1">{formatDate(b.departure_date)}</td>
                          <td className="py-1 text-center">{n}</td>
                          <td className="py-1 text-center">{b.adults + b.children}</td>
                          <td className="py-1">{b.platform || 'Direkt'}</td>
                          <td className="py-1 text-right font-mono">{total > 0 ? `${fmtEur(total)} €` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-2 border-t border-gray-400 flex justify-between text-[9pt] text-gray-400">
                <span>Sechszirbenhütte — Belegungsübersicht</span>
                <span>Seite 1</span>
              </div>
            </div>
          );
        })()}

        {/* ── Individual Booking Pages ── */}
        {briefingBookings.map(booking => {
          const nights = getNights(booking.arrival_date, booking.departure_date);
          const barItems = getBarItems(booking);
          const barTotal = barItems.reduce((sum, i) => sum + i.amount, 0);
          const hasDog = booking.pets?.toLowerCase().includes('hund') ?? false;
          const komfortpaket = parseKomfortpaketFromJson(booking.additional_costs);
          const childrenAges = parseChildrenAges(booking.children_ages);
          const natCode = booking.nationality?.split(',')[0]?.trim() || '';
          const language = booking.preferred_language || guessLanguage(booking.nationality);

          return (
            <div key={booking.id} className="briefing-page">
              {/* ── Header ── */}
              <div className="text-center mb-4 pb-2 border-b-2 border-gray-800">
                <h1 className="text-lg font-bold tracking-wide uppercase">Briefing — Sechszirbenhütte</h1>
              </div>

              {/* ── Block 1: Gast & Buchung ── */}
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-300 pb-1">Gast & Buchung</h2>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-0.5 text-gray-500 w-[140px]">Name</td>
                      <td className="py-0.5 font-semibold">{booking.guest_name}</td>
                      <td className="py-0.5 text-gray-500 w-[120px]">Plattform</td>
                      <td className="py-0.5">{booking.platform || 'Direkt'}{booking.booking_number ? ` (#${booking.booking_number})` : ''}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-gray-500">Nationalität</td>
                      <td className="py-0.5">{natCode ? `${countryFlag(natCode)} ${countryName(natCode)}` : '—'}</td>
                      <td className="py-0.5 text-gray-500">Anreise</td>
                      <td className="py-0.5 font-medium">{formatDate(booking.arrival_date)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-gray-500">Sprache</td>
                      <td className="py-0.5">{language}</td>
                      <td className="py-0.5 text-gray-500">Abreise</td>
                      <td className="py-0.5 font-medium">{formatDate(booking.departure_date)} ({nights} Nächte)</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-gray-500">E-Mail</td>
                      <td className="py-0.5 text-xs font-mono">{booking.email || '—'}</td>
                      <td className="py-0.5 text-gray-500">Telefon</td>
                      <td className="py-0.5">{booking.phone || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Block 2: Personen & Besonderheiten ── */}
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-300 pb-1">Personen</h2>
                <div className="flex gap-8 text-sm">
                  <div>
                    <span className="text-gray-500">Erwachsene:</span>{' '}
                    <span className="font-medium">{booking.adults}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Kinder:</span>{' '}
                    <span className="font-medium">
                      {booking.children > 0
                        ? `${booking.children} (${childrenAges.length > 0 ? childrenAges.join(', ') + ' Jahre' : 'Alter unbek.'})`
                        : 'Keine'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Haustiere:</span>{' '}
                    <span className={`font-medium ${hasDog ? 'text-amber-700' : ''}`}>
                      {booking.pets || 'Nein'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Block 3: Vorbereitung & Absprachen ── */}
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-300 pb-1">Vorbereitung</h2>
                {(() => {
                  const isMoreThan2Weeks = booking.arrival_date
                    ? (new Date(booking.arrival_date).getTime() - Date.now()) > 14 * 24 * 60 * 60 * 1000
                    : false;
                  const isPrivate = booking.is_private === 1 || booking.platform?.toLowerCase() === 'privat';
                  const isBookingCom = booking.platform?.toLowerCase() === 'booking' || booking.platform?.toLowerCase() === 'booking.com';
                  return (
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-0.5 text-gray-500 w-[140px]">Wäschepaket</td>
                          <td className="py-0.5">
                            {isMoreThan2Weeks
                              ? <span className="text-amber-600 font-medium">Noch in Klärung (Anreise &gt; 2 Wochen)</span>
                              : komfortpaket?.enabled
                                ? <span className="font-medium">Ja, {komfortpaket.persons} Pakete {komfortpaket.guestPaid ? <span className="text-red-600 font-semibold">(bar kassieren!)</span> : <span className="text-green-700">(nicht bezahlt)</span>}</span>
                                : 'Nein — Gast bringt eigene Bettwäsche mit'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="py-0.5 text-gray-500">Reinigung</td>
                          <td className="py-0.5">
                            {isPrivate
                              ? <span className="text-red-600 font-semibold">Bar kassieren (Privatbuchung)</span>
                              : <span className="text-green-700">Im Preis enthalten</span>
                            }
                          </td>
                        </tr>
                        {isBookingCom && (
                          <tr>
                            <td className="py-0.5 text-gray-500">Kurtaxe</td>
                            <td className="py-0.5">
                              <span className="text-red-600 font-semibold">Bar kassieren! (Booking.com — nicht im Preis enthalten)</span>
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-0.5 text-gray-500">Check-in</td>
                          <td className="py-0.5">{booking.early_checkin || 'Standard (16:00–18:00)'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 text-gray-500">Check-out</td>
                          <td className="py-0.5">{booking.late_checkout || 'Standard (bis 10:00)'}</td>
                        </tr>
                        {booking.briefing_notes && (
                          <tr>
                            <td className="py-0.5 text-gray-500">Absprachen</td>
                            <td className="py-0.5 font-medium">{booking.briefing_notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* ── Block 4: Bar-Abrechnung bei Abreise ── */}
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-300 pb-1">Bar-Abrechnung bei Abreise</h2>
                {barItems.length > 0 ? (
                  <div className="border border-gray-400 rounded p-3">
                    <table className="w-full text-sm">
                      <tbody>
                        {barItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-medium w-[180px]">{item.label}</td>
                            <td className="py-1 text-gray-500 text-xs">{item.detail}</td>
                            <td className="py-1 text-right font-mono font-semibold w-[100px]">{fmtEur(item.amount)} EUR</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-800">
                          <td className="pt-2 font-bold text-base" colSpan={2}>Summe bar</td>
                          <td className="pt-2 text-right font-mono font-bold text-base">{fmtEur(barTotal)} EUR</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Keine Barzahlung erforderlich — alles über Plattform abgerechnet.</p>
                )}
              </div>

              {/* ── Block 5: Notizen ── */}
              <div className="mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-300 pb-1">Notizen</h2>
                <div className="border border-gray-300 rounded p-3 min-h-[60px] text-sm">
                  {booking.notes ? (
                    <p className="text-gray-700">{booking.notes}</p>
                  ) : (
                    <p className="text-gray-300 italic">—</p>
                  )}
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="mt-4 pt-2 border-t border-gray-400 flex justify-between text-[9pt] text-gray-400">
                <span>Sechszirbenhütte — Briefing</span>
                <span>Erstellt {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
