'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

// Logo green color (matches the logo)
const LOGO_GREEN = '#1e5631';

// Navigation links - split for left and right of logo
const leftNavItems = [
  { key: 'ferienhaus', href: '#ferienhaus' },
  { key: 'umgebung', href: '#umgebung' },
] as const;

const rightNavItems = [
  { key: 'galerie', href: '#galerie' },
  { key: 'anfrage', href: '#buchung' },
  { key: 'bewertungen', href: '#bewertungen' },
] as const;

const allNavItems = [...leftNavItems, ...rightNavItems];

export function Header() {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      // Check if scrolled past hero section
      const heroSection = document.querySelector('#hero');
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        setIsPastHero(heroBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            {leftNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.href)}
                className={cn(
                  'font-medium transition-colors uppercase tracking-wide text-sm',
                  isScrolled
                    ? 'text-gray-700 hover:text-wood-600'
                    : 'text-white hover:text-white/80'
                )}
              >
                {t.navigation[item.key]}
              </button>
            ))}
          </nav>

          {/* Centered Logo - extends beyond header */}
          <button
            onClick={() => scrollToSection('#hero')}
            className="transition-transform hover:scale-105 mx-8 flex-shrink-0 relative z-10"
            style={{ marginTop: isScrolled ? '20px' : '30px' }}
          >
            <div
              className={cn(
                "rounded-full transition-all duration-300",
                isScrolled ? "bg-white/95 shadow-lg p-2" : "bg-white/90 p-3"
              )}
            >
              <Image
                src="/images/logo.svg"
                alt="Sechszirbenhütte"
                width={280}
                height={120}
                className={cn(
                  "w-auto transition-all duration-300",
                  isScrolled ? "h-20" : "h-28"
                )}
                priority
              />
            </div>
          </button>

          {/* Right Navigation - justify-start to push items towards center */}
          <nav className="flex items-center gap-8 justify-start" style={{ minWidth: '280px' }}>
            {rightNavItems.map((item) => {
              const isAnfrageHighlighted = item.key === 'anfrage' && isPastHero;
              return (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.href)}
                  className={cn(
                    'font-medium transition-all uppercase tracking-wide text-sm',
                    isScrolled
                      ? 'text-gray-700 hover:text-wood-600'
                      : 'text-white hover:text-white/80',
                    isAnfrageHighlighted && 'font-bold'
                  )}
                  style={isAnfrageHighlighted ? {
                    borderBottom: `3px solid ${LOGO_GREEN}`,
                    paddingBottom: '2px',
                    color: isScrolled ? LOGO_GREEN : 'white'
                  } : undefined}
                >
                  {t.navigation[item.key]}
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

          {/* Centered Logo (Mobile) - extends beyond header */}
          <button
            onClick={() => scrollToSection('#hero')}
            className="transition-transform hover:scale-105 relative z-10"
            style={{ marginTop: isScrolled ? '10px' : '15px' }}
          >
            <div
              className={cn(
                "rounded-full transition-all duration-300",
                isScrolled ? "bg-white/95 shadow-lg p-1.5" : "bg-white/90 p-2"
              )}
            >
              <Image
                src="/images/logo.svg"
                alt="Sechszirbenhütte"
                width={180}
                height={70}
                className={cn(
                  "w-auto transition-all duration-300",
                  isScrolled ? "h-14" : "h-18"
                )}
                priority
              />
            </div>
          </button>

          {/* Language Switcher (Mobile) */}
          <LanguageSwitcher isScrolled={isScrolled} />
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg">
          <nav className="container py-4 flex flex-col gap-2">
            {allNavItems.map((item) => {
              const isAnfrageHighlighted = item.key === 'anfrage' && isPastHero;
              return (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.href)}
                  className={cn(
                    'py-2 text-gray-700 hover:text-wood-600 text-left uppercase tracking-wide',
                    isAnfrageHighlighted && 'font-bold'
                  )}
                  style={isAnfrageHighlighted ? {
                    borderBottom: `3px solid ${LOGO_GREEN}`,
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
