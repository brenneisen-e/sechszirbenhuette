'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Guest, FeratelBooking, Booking } from './types';
import { BookingDetailPopup } from './admin-calendar/BookingDetailPopup';
import { UnregisteredBookingsAlert } from './admin-calendar/UnregisteredBookingsAlert';
import { GapsSidebar } from './admin-calendar/GapsSidebar';
import { YearlyBookingsList } from './admin-calendar/YearlyBookingsList';

interface AdminCalendarProps {
  guests: Guest[];
  onSwitchToGuests: () => void;
  onSelectGuest?: (guestId: number) => void;
}

// Combined booking type for calendar display
interface CalendarBooking {
  id: number;
  guest_id: number;
  guest_name: string;
  nationality?: string | null;
  arrival_date: string;
  departure_date: string;
  isAdditionalBooking?: boolean; // true if from bookings table
}

export function AdminCalendar({ guests, onSwitchToGuests, onSelectGuest }: AdminCalendarProps) {
  const [calendarYear, setCalendarYear] = useState(2026);
  const [externalBookings, setExternalBookings] = useState<FeratelBooking[]>([]);
  const [additionalBookings, setAdditionalBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [loadingSources, setLoadingSources] = useState<string[]>([]);
  const [successfulSources, setSuccessfulSources] = useState<string[]>([]);
  const [calendarError, setCalendarError] = useState('');

  // Parse date string to local Date (avoiding UTC timezone issues)
  const parseLocalDate = (dateStr: string): Date => {
    // Handle ISO date strings like "2026-01-04" by parsing components directly
    const parts = (dateStr.split('T')[0] ?? '').split('-').map(Number);
    return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  };

  // Fetch additional bookings from the bookings table
  const fetchAdditionalBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      const data = (await res.json()) as { bookings?: Booking[]; error?: string };
      if (data.bookings) {
        setAdditionalBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error fetching additional bookings:', err);
    }
  };

  useEffect(() => {
    const fetchExternalCalendars = async () => {
      setLoadingSources(['Feratel', 'FeWo-Direkt', 'Booking.com']);
      setCalendarError('');

      try {
        const res = await fetch('/api/admin/feratel-calendar');
        const data = (await res.json()) as {
          success: boolean;
          bookedPeriods: FeratelBooking[];
          sources?: string[];
          errors?: string[];
        };

        if (data.success && data.bookedPeriods?.length > 0) {
          setExternalBookings(data.bookedPeriods);
          setSuccessfulSources(data.sources || []);
        } else if (data.errors?.length) {
          setCalendarError(data.errors.join(', '));
        }
      } catch (err) {
        console.error('Error fetching calendars:', err);
        setCalendarError('Fehler beim Laden der Kalenderdaten');
      } finally {
        setLoadingSources([]);
      }
    };

    fetchExternalCalendars();
    fetchAdditionalBookings();
  }, []);

  // Re-fetch additional bookings when guests change (new bookings may have been added)
  useEffect(() => {
    fetchAdditionalBookings();
  }, [guests]);

  // Set of guest IDs that have entries in the bookings table
  const guestsWithBookings = new Set(additionalBookings.map((b) => b.guest_id));

  // Combine guests with additional bookings for calendar display
  const allCalendarBookings: CalendarBooking[] = [
    // Legacy bookings from guests table - only for guests WITHOUT entries in bookings table
    // When a guest has bookings in the bookings table, those are authoritative
    ...guests
      .filter((g) => g.arrival_date && g.departure_date && g.status !== 'cancelled')
      .filter((g) => !guestsWithBookings.has(g.id))
      .map((g) => ({
        id: g.id,
        guest_id: g.id,
        guest_name: g.guest_name,
        nationality: g.nationality,
        arrival_date: g.arrival_date!,
        departure_date: g.departure_date!,
        isAdditionalBooking: false,
      })),
    // Bookings from bookings table (authoritative source for dates)
    ...additionalBookings
      .filter((b) => b.arrival_date && b.departure_date && b.status !== 'cancelled')
      .map((b) => {
        const guest = guests.find((g) => g.id === b.guest_id);
        return {
          id: b.id,
          guest_id: b.guest_id,
          guest_name: guest?.guest_name || 'Unbekannt',
          nationality: guest?.nationality,
          arrival_date: b.arrival_date!,
          departure_date: b.departure_date!,
          isAdditionalBooking: true,
        };
      }),
  ];

  // Check portal bookings against ALL local bookings (including additional bookings)
  const unregisteredBookings = externalBookings.filter((fb) => {
    const icalStart = parseLocalDate(fb.start);
    const icalEnd = parseLocalDate(fb.end);
    if (icalEnd < new Date()) return false;
    // Check against all calendar bookings (guests + additional bookings)
    const hasLocalMatch = allCalendarBookings.some((b) => {
      const localStart = parseLocalDate(b.arrival_date);
      const localEnd = parseLocalDate(b.departure_date);
      return localStart < icalEnd && localEnd > icalStart;
    });
    return !hasLocalMatch;
  });

  const calculateGaps = () => {
    const yearStart = new Date(calendarYear, 0, 1);
    const yearEnd = new Date(calendarYear, 11, 31);

    // Use allCalendarBookings for gap calculation
    const yearBookings = allCalendarBookings
      .filter((b) => {
        const arrival = parseLocalDate(b.arrival_date);
        const departure = parseLocalDate(b.departure_date);
        return arrival <= yearEnd && departure >= yearStart;
      })
      .sort((a, b) => parseLocalDate(a.arrival_date).getTime() - parseLocalDate(b.arrival_date).getTime());

    const gaps: Array<{ start: Date; end: Date; days: number }> = [];
    let lastEnd = yearStart;

    yearBookings.forEach((booking) => {
      const arrival = parseLocalDate(booking.arrival_date);
      const departure = parseLocalDate(booking.departure_date);
      const effectiveArrival = arrival < yearStart ? yearStart : arrival;

      if (effectiveArrival > lastEnd) {
        const gapDays = Math.ceil((effectiveArrival.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24));
        if (gapDays >= 1) {
          gaps.push({ start: new Date(lastEnd), end: new Date(effectiveArrival), days: gapDays });
        }
      }

      if (departure > lastEnd) {
        lastEnd = new Date(departure);
      }
    });

    if (lastEnd < yearEnd) {
      const gapDays = Math.ceil((yearEnd.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24));
      if (gapDays >= 1) {
        gaps.push({ start: new Date(lastEnd), end: yearEnd, days: gapDays });
      }
    }

    return gaps.filter((g) => g.days >= 3);
  };

  const significantGaps = calculateGaps();

  const sameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setCalendarYear(calendarYear - 1)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{calendarYear}</h3>
          <button
            onClick={() => setCalendarYear(calendarYear + 1)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-xs sm:text-sm">
          <div className="flex items-center gap-0.5">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-l bg-green-200 border-l-2 sm:border-l-4 border-green-600"></div>
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-200"></div>
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-r bg-green-200 border-r-2 sm:border-r-4 border-green-600"></div>
            <span className="ml-1">Lokal</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-l bg-cyan-200 border-l-2 sm:border-l-4 border-cyan-600"></div>
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-cyan-200"></div>
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-r bg-cyan-200 border-r-2 sm:border-r-4 border-cyan-600"></div>
            <span className="ml-1">Portal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gray-100 border border-gray-300"></div>
            <span>Frei</span>
          </div>
          {loadingSources.length > 0 && (
            <span className="text-xs text-gray-500">Lade {loadingSources.join(', ')}...</span>
          )}
        </div>
      </div>

      <UnregisteredBookingsAlert bookings={unregisteredBookings} onSwitchToGuests={onSwitchToGuests} />

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const monthStart = new Date(calendarYear, monthIndex, 1);
            const monthEnd = new Date(calendarYear, monthIndex + 1, 0);
            const daysInMonth = monthEnd.getDate();
            const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
            const monthName = monthStart.toLocaleDateString('de-DE', { month: 'long' });

            // Filter all calendar bookings for this month
            const monthCalendarBookings = allCalendarBookings.filter((b) => {
              const arrival = parseLocalDate(b.arrival_date);
              const departure = parseLocalDate(b.departure_date);
              return (
                (arrival.getFullYear() === calendarYear && arrival.getMonth() === monthIndex) ||
                (departure.getFullYear() === calendarYear && departure.getMonth() === monthIndex) ||
                (arrival < monthStart && departure > monthEnd)
              );
            });

            const portalMonthBookings = externalBookings.filter((fb) => {
              const arrival = parseLocalDate(fb.start);
              const departure = parseLocalDate(fb.end);
              return (
                (arrival.getFullYear() === calendarYear && arrival.getMonth() === monthIndex) ||
                (departure.getFullYear() === calendarYear && departure.getMonth() === monthIndex) ||
                (arrival < monthStart && departure > monthEnd)
              );
            });

            const dayStatuses: Array<{
              booking?: CalendarBooking;
              isBooked: boolean;
              isPortal?: boolean;
              isAdditionalBooking?: boolean;
              portalSummary?: string;
              isStart?: boolean;
              isEnd?: boolean;
              arrivingBooking?: CalendarBooking;
              departingBooking?: CalendarBooking;
            }> = [];

            for (let day = 1; day <= daysInMonth; day++) {
              const currentDate = new Date(calendarYear, monthIndex, day);
              const nextDate = new Date(calendarYear, monthIndex, day + 1);

              const localBooking = monthCalendarBookings.find((b) => {
                const arrival = parseLocalDate(b.arrival_date);
                const departure = parseLocalDate(b.departure_date);
                return currentDate >= arrival && currentDate < departure;
              });

              const portalBooking = portalMonthBookings.find((fb) => {
                const arrival = parseLocalDate(fb.start);
                const departure = parseLocalDate(fb.end);
                return currentDate >= arrival && currentDate < departure;
              });

              const arrivingBooking = monthCalendarBookings.find((b) => sameDay(currentDate, parseLocalDate(b.arrival_date)));
              const departingBooking = monthCalendarBookings.find(
                (b) => sameDay(currentDate, parseLocalDate(b.departure_date)) && b.id !== arrivingBooking?.id
              );

              let isStart = false;
              let isEnd = false;

              if (localBooking) {
                isStart = sameDay(currentDate, parseLocalDate(localBooking.arrival_date));
                isEnd = sameDay(nextDate, parseLocalDate(localBooking.departure_date));
              } else if (portalBooking) {
                isStart = sameDay(currentDate, parseLocalDate(portalBooking.start));
                isEnd = sameDay(nextDate, parseLocalDate(portalBooking.end));
              }

              dayStatuses.push({
                booking: localBooking || departingBooking, // Include departing booking for display
                isBooked: !!localBooking || !!portalBooking || !!departingBooking,
                isPortal: !localBooking && !departingBooking && !!portalBooking,
                isAdditionalBooking: localBooking?.isAdditionalBooking || departingBooking?.isAdditionalBooking,
                portalSummary: portalBooking?.summary,
                isStart,
                isEnd,
                arrivingBooking,
                departingBooking,
              });
            }

            return (
              <div key={monthIndex} className="bg-white border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 mb-2 text-center">{monthName}</h4>
                <div className="grid grid-cols-7 gap-0.5 text-xs">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                    <div key={d} className="text-center text-gray-400 font-medium py-1">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="h-6"></div>
                  ))}
                  {dayStatuses.map((status, i) => {
                    const day = i + 1;
                    const isToday =
                      new Date().getFullYear() === calendarYear &&
                      new Date().getMonth() === monthIndex &&
                      new Date().getDate() === day;

                    let bgClass = 'bg-gray-50 text-gray-600';
                    let roundedClass = 'rounded';

                    if (status.booking) {
                      // All local bookings (main + additional) use the same green color
                      if (status.isStart && status.isEnd) {
                        bgClass = 'bg-green-200 text-green-900 border-l-4 border-r-4 border-green-600';
                        roundedClass = 'rounded';
                      } else if (status.isStart) {
                        bgClass = 'bg-green-200 text-green-900 border-l-4 border-green-600';
                        roundedClass = 'rounded-l';
                      } else if (status.isEnd) {
                        bgClass = 'bg-green-200 text-green-900 border-r-4 border-green-600';
                        roundedClass = 'rounded-r';
                      } else {
                        bgClass = 'bg-green-200 text-green-900';
                        roundedClass = '';
                      }
                    } else if (status.isPortal) {
                      if (status.isStart && status.isEnd) {
                        bgClass = 'bg-cyan-200 text-cyan-900 border-l-4 border-r-4 border-cyan-600';
                        roundedClass = 'rounded';
                      } else if (status.isStart) {
                        bgClass = 'bg-cyan-200 text-cyan-900 border-l-4 border-cyan-600';
                        roundedClass = 'rounded-l';
                      } else if (status.isEnd) {
                        bgClass = 'bg-cyan-200 text-cyan-900 border-r-4 border-cyan-600';
                        roundedClass = 'rounded-r';
                      } else {
                        bgClass = 'bg-cyan-200 text-cyan-900';
                        roundedClass = '';
                      }
                    }

                    const tooltipEntries: Array<{
                      name: string;
                      nationality?: string | null;
                      isPortal?: boolean;
                      isAdditionalBooking?: boolean;
                      isArriving?: boolean;
                      isDeparting?: boolean;
                      guestId?: number;
                    }> = [];

                    if (status.departingBooking) {
                      tooltipEntries.push({
                        name: status.departingBooking.guest_name,
                        nationality: status.departingBooking.nationality,
                        isDeparting: true,
                        isAdditionalBooking: status.departingBooking.isAdditionalBooking,
                        guestId: status.departingBooking.guest_id,
                      });
                    }

                    // Nur hinzufügen wenn es nicht dieselbe Buchung wie departingBooking ist
                    if (status.booking && status.booking.id !== status.departingBooking?.id) {
                      tooltipEntries.push({
                        name: status.booking.guest_name,
                        nationality: status.booking.nationality,
                        isArriving: status.isStart,
                        isAdditionalBooking: status.booking.isAdditionalBooking,
                        guestId: status.booking.guest_id,
                      });
                    } else if (status.isPortal) {
                      tooltipEntries.push({
                        name: status.portalSummary || 'Portal Buchung',
                        isPortal: true,
                        isArriving: status.isStart,
                      });
                    }

                    const clickableGuestId =
                      status.booking?.guest_id || status.arrivingBooking?.guest_id || status.departingBooking?.guest_id;
                    const clickableBooking = status.booking || status.arrivingBooking || status.departingBooking;
                    const isClickable = !!clickableGuestId || !!clickableBooking;

                    return (
                      <div
                        key={day}
                        className={`h-6 flex items-center justify-center text-xs relative group ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${bgClass} ${roundedClass} ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        onClick={() => {
                          if (!clickableBooking) return;

                          const guestId = clickableBooking.guest_id;
                          const guest = guests.find(g => g.id === guestId);
                          if (!guest) {
                            // Fallback to navigating to guest if we can't find guest data
                            if (onSelectGuest && guestId) {
                              onSelectGuest(guestId);
                            }
                            return;
                          }

                          // Check if this is an additional booking from the bookings table
                          if (clickableBooking.isAdditionalBooking) {
                            const booking = additionalBookings.find(b => b.id === clickableBooking.id);
                            if (booking) {
                              setSelectedBooking(booking);
                              setSelectedGuest(guest);
                              return;
                            }
                          }

                          // Try to find an actual booking for this guest (prefer bookings table data)
                          const guestBooking = additionalBookings.find(b => b.guest_id === guest.id);
                          if (guestBooking) {
                            setSelectedBooking(guestBooking);
                            setSelectedGuest(guest);
                            return;
                          }

                          // Fallback for legacy guests without booking entries - use guest data
                          // Note: This is deprecated, all new guests should have bookings
                          const pseudoBooking: Booking = {
                            id: guest.id,
                            guest_id: guest.id,
                            booking_number: guest.booking_number,
                            platform: guest.platform,
                            arrival_date: guest.arrival_date,
                            departure_date: guest.departure_date,
                            adults: guest.adults,
                            children: guest.children,
                            children_ages: guest.children_ages,
                            pets: guest.pets,
                            rental_price: guest.rental_price, // Legacy: should come from booking
                            deposit_amount: guest.deposit_amount,
                            deposit_paid: guest.deposit_paid,
                            final_payment: guest.final_payment,
                            final_payment_paid: guest.final_payment_paid,
                            electricity_flat: guest.electricity_flat,
                            additional_payment: guest.additional_payment,
                            security_deposit: guest.security_deposit,
                            additional_costs: guest.additional_costs,
                            final_cleaning: guest.final_cleaning,
                            first_contact_date: guest.first_contact_date,
                            offer_sent: guest.offer_sent,
                            contract_sent: guest.contract_sent,
                            welcome_guide_sent: guest.welcome_guide_sent,
                            admin_briefed: guest.admin_briefed,
                            status: guest.status,
                            notes: guest.other_notes,
                            cleaning_cash: guest.cleaning_cash,
                            utilities_cash: 0,
                            kurtaxe_cash: 0,
                            is_private: guest.is_private,
                            private_config: null,
                            created_at: guest.created_at,
                            updated_at: guest.updated_at,
                          };
                          setSelectedBooking(pseudoBooking);
                          setSelectedGuest(guest);
                        }}
                      >
                        {day}
                        {tooltipEntries.length > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg min-w-max">
                              {tooltipEntries.map((entry, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-1 ${idx > 0 ? 'mt-1 pt-1 border-t border-gray-700' : ''}`}
                                >
                                  {entry.nationality && (
                                    <img
                                      src={`https://flagcdn.com/w20/${entry.nationality.split(',')[0]?.toLowerCase()}.png`}
                                      alt=""
                                      className="w-4 h-3 rounded-sm flex-shrink-0"
                                      loading="eager"
                                    />
                                  )}
                                  {entry.isPortal && <span className="text-cyan-300 flex-shrink-0">[Portal]</span>}
                                  {entry.isDeparting && <span className="text-red-300 flex-shrink-0">◂ </span>}
                                  {entry.isArriving && <span className="text-green-300 flex-shrink-0">▸ </span>}
                                  <span className="truncate">{entry.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <GapsSidebar gaps={significantGaps} />
      </div>

      <YearlyBookingsList
          guests={guests}
          bookings={additionalBookings}
          year={calendarYear}
          onSelectBooking={(booking, guest) => {
            setSelectedBooking(booking);
            setSelectedGuest(guest);
          }}
        />

      {selectedBooking && selectedGuest && (
        <BookingDetailPopup
          booking={selectedBooking}
          guest={selectedGuest}
          onClose={() => {
            setSelectedBooking(null);
            setSelectedGuest(null);
          }}
          onNavigateToGuest={() => {
            setSelectedBooking(null);
            setSelectedGuest(null);
            if (onSelectGuest) {
              onSelectGuest(selectedBooking.guest_id);
            }
          }}
        />
      )}
    </div>
  );
}
