'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BookingCTA } from '@/components/brand/BookingCTA';

// Navigation der öffentlichen Seiten: dunkelgrüne Fläche, weißes Original-Logo
// in Mindestgröße (240 px) mit Schutzraum, Buchen als roter Link. Logo und
// Navigation werden beim Scrollen weder skaliert noch verformt.
//
// Mobil scrollt die Navigation mit (das Vollzeichen braucht 240 px plus
// Schutzraum); Buchen bleibt dort über die Leiste am unteren Rand erreichbar.
// Ab 1024 px steht sie oben fest.
//
// Ziele sind echte Links (/#abschnitt) — funktionieren auch ohne JavaScript
// und von Unterseiten aus.

const NAV_ITEMS = [
  { key: 'ferienhaus', href: '/#huette' },
  { key: 'galerie', href: '/#galerie' },
  { key: 'umgebung', href: '/#umgebung' },
  { key: 'blog', href: '/blog' },
] as const;

export function Header() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // Menü bei Seitenwechsel und Escape schließen
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (pathname?.startsWith('/admin')) return null;

  const isBlog = pathname?.startsWith('/blog');

  return (
    <header className="brand-header on-zirbe relative z-50 bg-zirbe text-leinen lg:sticky lg:top-0">
      <div
        className="brand-container flex items-center justify-between gap-2 sm:gap-6"
        style={{ height: 'var(--header-height)' }}
      >
        <a href="/" className="shrink-0 rounded-[4px]" aria-label="Sechszirbenhütte – Startseite">
          <BrandLogo />
        </a>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[1.0625rem]">
            {NAV_ITEMS.map((item) => {
              const current = item.key === 'blog' && isBlog;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={`py-2 text-leinen underline-offset-[0.35em] hover:underline ${
                      current ? 'underline decoration-2' : ''
                    }`}
                  >
                    {t.navigation[item.key]}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:block">
            <LanguageSwitcher isScrolled={false} />
          </div>
          <div className="hidden sm:block">
            <BookingCTA compact />
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="lg:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] text-leinen hover:bg-leinen/10"
          >
            {menuOpen ? <X size={26} aria-hidden /> : <Menu size={26} aria-hidden />}
            <span className="sr-only">{menuOpen ? t.common.close : 'Menü'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-leinen/20 bg-zirbe">
          <nav aria-label="Hauptnavigation mobil" className="brand-container py-4">
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-lg text-leinen underline-offset-[0.35em] hover:underline"
                  >
                    {t.navigation[item.key]}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-4 pb-2">
              <BookingCTA compact onClick={() => setMenuOpen(false)} />
              <LanguageSwitcher isScrolled={false} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// Buchen-Zugang am unteren Rand (nur schmale Ansichten, nachdem der Aufmacher
// verlassen wurde). Bleibt an seinem Platz — kein Hüpfen, kein Ausweichen.
export function MobileBookingButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/gaeste')) return null;

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-[60] bg-zirbe px-4 pt-3 safe-area-bottom ${
        visible ? '' : 'invisible'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <BookingCTA className="w-full" />
    </div>
  );
}
