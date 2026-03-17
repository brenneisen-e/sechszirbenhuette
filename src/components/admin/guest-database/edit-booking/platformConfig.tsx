'use client';

import { Building2, Mail, Users } from 'lucide-react';

export type PlatformType = 'booking' | 'fewo' | 'airbnb' | 'direct' | 'private';

// Plattform-Kategorie ermitteln
export function getPlatformType(platform: string | null): PlatformType {
  const p = platform?.toLowerCase() || '';
  if (p === 'booking.com') return 'booking';
  if (p === 'fewo' || p === 'fewo-direkt' || p === 'vrbo') return 'fewo';
  if (p === 'airbnb') return 'airbnb';
  if (p === 'privat') return 'private';
  return 'direct'; // E-Mail, Telefon, etc.
}

// Plattform-spezifische Konfiguration
export const PLATFORM_CONFIG: Record<PlatformType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  showNkInput: boolean;
  showCleaningInput: boolean;
  showPayoutInput: boolean;
  showFees: boolean;
  pdfSupport: boolean;
}> = {
  booking: {
    label: 'Booking.com',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-blue-500',
    description: 'Auszahlung oder Gastzahlung mit Gebühren eingeben',
    showNkInput: false,
    showCleaningInput: false,
    showPayoutInput: true,
    showFees: true,
    pdfSupport: true,
  },
  fewo: {
    label: 'FeWo-direkt / Vrbo',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-orange-500',
    description: 'PDF hochladen oder manuell eingeben',
    showNkInput: true,
    showCleaningInput: true,
    showPayoutInput: false,
    showFees: true,
    pdfSupport: true,
  },
  airbnb: {
    label: 'Airbnb',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-rose-500',
    description: 'Auszahlung enthält alles inkl. NK & Reinigung',
    showNkInput: false,
    showCleaningInput: false,
    showPayoutInput: true,
    showFees: false,
    pdfSupport: true,
  },
  direct: {
    label: 'Direkt',
    icon: <Mail className="w-5 h-5" />,
    color: 'bg-green-500',
    description: 'E-Mail, Telefon oder persönlich',
    showNkInput: true,
    showCleaningInput: true,
    showPayoutInput: false,
    showFees: false,
    pdfSupport: false,
  },
  private: {
    label: 'Privat',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-gray-500',
    description: 'Familie & Freunde - keine NK',
    showNkInput: false,
    showCleaningInput: false,
    showPayoutInput: false,
    showFees: false,
    pdfSupport: false,
  },
};
