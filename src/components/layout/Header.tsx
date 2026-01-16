'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

// Logo green color (matches the logo)
const LOGO_GREEN = '#1e5631';

// Navigation links - split for left and right of logo
const leftNavItems = [
  { key: 'ferienhaus', href: '#ferienhaus', sectionId: 'ferienhaus' },
  { key: 'umgebung', href: '#umgebung', sectionId: 'umgebung' },
] as const;

const rightNavItems = [
  { key: 'galerie', href: '#galerie', sectionId: 'galerie' },
  { key: 'anfrage', href: '#buchung', sectionId: 'buchung' },
] as const;

const allNavItems = [...leftNavItems, ...rightNavItems];

// All sections to track for scroll-spy (in order they appear on page)
const SCROLL_SPY_SECTIONS = ['hero', 'bewertungen', 'introtext', 'ferienhaus', 'galerie', 'lage', 'umgebung', 'buchung'];

export function Header() {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Scroll-spy: determine which section is currently in view
  const updateActiveSection = useCallback(() => {
    const scrollPosition = window.scrollY + 150; // Offset for header height

    let currentSection: string | null = null;

    for (const sectionId of SCROLL_SPY_SECTIONS) {
      const element = document.getElementById(sectionId);
      if (element) {
        const { offsetTop, offsetHeight } = element;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          currentSection = sectionId;
          break;
        }
      }
    }

    setActiveSection(currentSection);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      // Check if scrolled past hero section
      const heroSection = document.querySelector('#hero');
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        setIsPastHero(heroBottom < 0);
      }
      // Update active section for scroll-spy
      updateActiveSection();
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateActiveSection]);

  // Check if a nav item is active
  const isNavItemActive = (sectionId: string) => {
    // Map nav item sections to actual section IDs
    if (sectionId === 'buchung' && activeSection === 'buchung') return true;
    if (sectionId === 'ferienhaus' && (activeSection === 'ferienhaus' || activeSection === 'introtext')) return true;
    if (sectionId === 'galerie' && activeSection === 'galerie') return true;
    if (sectionId === 'umgebung' && (activeSection === 'umgebung' || activeSection === 'lage')) return true;
    return false;
  };

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 overflow-visible',
        isScrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-md py-2'
          : 'bg-transparent py-3'
      )}
    >
      <div className="container">
        {/* Desktop Layout - Logo centered with symmetric nav */}
        <div className="hidden md:flex items-center justify-center">
          {/* Left Navigation - justify-end to push items towards center */}
          <nav className="flex items-center gap-8 justify-end" style={{ minWidth: '280px' }}>
            {leftNavItems.map((item) => {
              const isActive = isNavItemActive(item.sectionId);
              return (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.href)}
                  className={cn(
                    'font-medium transition-all uppercase tracking-wide text-sm relative py-1',
                    isScrolled
                      ? 'text-gray-700 hover:text-logo-green'
                      : 'text-white hover:text-white/80',
                    isActive && 'font-bold'
                  )}
                  style={isActive ? {
                    color: isScrolled ? LOGO_GREEN : 'white',
                  } : undefined}
                >
                  {t.navigation[item.key]}
                  {/* Active indicator line */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-300"
                      style={{ backgroundColor: isScrolled ? LOGO_GREEN : 'white' }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Centered Logo */}
          <button
            onClick={() => scrollToSection('#hero')}
            className="transition-transform hover:scale-105 mx-8 flex-shrink-0 relative z-10"
          >
            <Image
              src="/images/logo.svg"
              alt="Sechszirbenhütte"
              width={240}
              height={100}
              className={cn(
                "w-auto transition-all duration-300",
                isScrolled ? "h-16" : "h-20"
              )}
              priority
            />
          </button>

          {/* Right Navigation - justify-start to push items towards center */}
          <nav className="flex items-center gap-8 justify-start" style={{ minWidth: '280px' }}>
            {rightNavItems.map((item) => {
              const isActive = isNavItemActive(item.sectionId);
              const isAnfrageHighlighted = item.key === 'anfrage' && isPastHero && !isActive;
              return (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.href)}
                  className={cn(
                    'font-medium transition-all uppercase tracking-wide text-sm relative py-1',
                    isScrolled
                      ? 'text-gray-700 hover:text-logo-green'
                      : 'text-white hover:text-white/80',
                    (isActive || isAnfrageHighlighted) && 'font-bold'
                  )}
                  style={(isActive || isAnfrageHighlighted) ? {
                    color: isScrolled ? LOGO_GREEN : 'white'
                  } : undefined}
                >
                  {t.navigation[item.key]}
                  {/* Active indicator line */}
                  {(isActive || isAnfrageHighlighted) && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-300"
                      style={{ backgroundColor: isScrolled ? LOGO_GREEN : 'white' }}
                    />
                  )}
                </button>
              );
            })}
            <LanguageSwitcher isScrolled={isScrolled} />
          </nav>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isScrolled ? 'text-gray-700' : 'text-white'
            )}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Centered Logo (Mobile) */}
          <button
            onClick={() => scrollToSection('#hero')}
            className="transition-transform hover:scale-105"
          >
            <Image
              src="/images/logo.svg"
              alt="Sechszirbenhütte"
              width={160}
              height={60}
              className={cn(
                "w-auto transition-all duration-300",
                isScrolled ? "h-12" : "h-14"
              )}
              priority
            />
          </button>

          {/* Language Switcher (Mobile) */}
          <LanguageSwitcher isScrolled={isScrolled} />
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg">
          <nav className="container py-4 flex flex-col gap-1">
            {allNavItems.map((item) => {
              const isActive = isNavItemActive(item.sectionId);
              const isAnfrageHighlighted = item.key === 'anfrage' && isPastHero && !isActive;
              return (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.href)}
                  className={cn(
                    'py-3 px-4 text-gray-700 hover:text-logo-green text-left uppercase tracking-wide rounded-lg transition-all',
                    (isActive || isAnfrageHighlighted) && 'font-bold bg-logo-green/10'
                  )}
                  style={(isActive || isAnfrageHighlighted) ? {
                    color: LOGO_GREEN
                  } : undefined}
                >
                  {t.navigation[item.key]}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

// Separate Mobile Booking Button Component - rendered outside Header
export function MobileBookingButton() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    // Set hash to trigger widget expansion
    window.location.hash = href;
  };

  return (
    <div className="md:hidden fixed bottom-6 left-0 right-0 flex justify-center z-[60] pointer-events-none">
      <button
        onClick={() => scrollToSection('#buchung')}
        className="px-6 py-3 rounded-xl font-semibold text-base text-white shadow-lg transition-all pointer-events-auto"
        style={{ backgroundColor: LOGO_GREEN }}
      >
        Verfügbarkeit prüfen
      </button>
    </div>
  );
}
