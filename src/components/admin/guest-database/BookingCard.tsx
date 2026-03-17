'use client';

import { Calendar, Users, Euro, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Guest, Booking } from './types';
import { anonymizeGuestName, roundDemoAmount } from '@/lib/utils/demoMode';
import { formatCurrency } from '@/lib/utils/formatting';
import { FlagIcon } from './FlagIcon';
import { STATUS_STYLES, getStatusClasses, resolvePlatformConfig } from './constants';

interface BookingCardProps {
  guest: Guest;
  bookings: Booking[];
  latestBooking: { arrival: string | null; departure: string | null };
  effectiveStatus: string;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  demoMode?: boolean;
}

function getPlatformInfo(platform: string | null): { label: string; classes: string } {
  const cfg = resolvePlatformConfig(platform);
  if (!cfg) return { label: platform || '-', classes: 'bg-gray-50 text-gray-400' };
  return { label: cfg.label, classes: `${cfg.badgeBg} ${cfg.badgeText}` };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function getNights(arrival: string | null, departure: string | null): number {
  if (!arrival || !departure) return 0;
  const a = new Date(arrival);
  const d = new Date(departure);
  return Math.ceil((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function BookingCard({
  guest,
  bookings,
  latestBooking,
  effectiveStatus,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  demoMode = false,
}: BookingCardProps) {
  const statusStyle = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.active;
  const platform = getPlatformInfo(guest.platform || bookings[0]?.platform);
  const nights = getNights(latestBooking.arrival, latestBooking.departure);
  const displayName = demoMode ? anonymizeGuestName(guest.guest_name) : guest.guest_name;
  const totalPrice = bookings.reduce((sum, b) => sum + (b.rental_price || 0), 0) || guest.rental_price;
  const displayPrice = demoMode ? `~${roundDemoAmount(totalPrice).toLocaleString('de-DE')} EUR` : formatCurrency(totalPrice);
  const hasDog = guest.pets?.toLowerCase().includes('hund') ?? false;
  const latestBookingObj = bookings.length > 0
    ? bookings.sort((a, b) => new Date(b.arrival_date || '').getTime() - new Date(a.arrival_date || '').getTime())[0]
    : null;

  return (
    <div
      onClick={onClick}
      className={`
        group relative border rounded-lg p-4 cursor-pointer transition-all
        ${isSelected
          ? 'border-green-300 bg-green-50/50 ring-1 ring-green-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
        }
      `}
    >
      {/* Top Row: Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {guest.nationality && (
            <FlagIcon code={guest.nationality} size="tiny" />
          )}
          <h3 className="text-sm font-medium text-gray-900 truncate">{displayName}</h3>
          {guest.is_returning_guest === 1 && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">Stamm</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {statusStyle.label}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Date + Platform */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {formatDateLong(latestBooking.arrival)} — {formatDateLong(latestBooking.departure)}
          </span>
          {nights > 0 && (
            <span className="text-gray-400">({nights}N)</span>
          )}
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${platform.classes}`}>
          {platform.label}
        </span>
      </div>

      {/* Bottom Row: Guests + Price */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span>{guest.adults || latestBookingObj?.adults || 2} Erw.</span>
          {(guest.children > 0 || (latestBookingObj?.children ?? 0) > 0) && (
            <span>+ {guest.children || latestBookingObj?.children} Ki.</span>
          )}
          {hasDog && <span className="text-amber-600 font-medium">Hund</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 font-mono tabular-nums">{displayPrice}</span>
          {bookings.length > 1 && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">{bookings.length}x</span>
          )}
        </div>
      </div>

      {/* Booking number line */}
      {(latestBookingObj?.booking_number || guest.booking_number) && (
        <div className="mt-1.5 text-[10px] text-gray-400 truncate">
          #{latestBookingObj?.booking_number || guest.booking_number}
        </div>
      )}
    </div>
  );
}
