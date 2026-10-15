'use client';

import { useLanguage } from '@/contexts/LanguageContext';

// Primärer CTA „Buchen“: roter Hintergrund, dunkle Schrift, keine Symbole.
// Ziel ist das bestehende Buchungs-Widget (Feratel/Deskline) im Abschnitt
// #buchung der Startseite — ein echter Link, funktioniert auch ohne JavaScript.
// Buchung.tsx öffnet das Widget beim Sprung auf #buchung.

interface Props {
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BOOKING_HREF = '/#buchung';

export function BookingCTA({ compact = false, className = '', onClick }: Props) {
  const { t } = useLanguage();
  return (
    <a
      href={BOOKING_HREF}
      onClick={onClick}
      className={`brand-cta ${compact ? 'brand-cta--compact' : ''} ${className}`}
    >
      {t.brand.book}
    </a>
  );
}
