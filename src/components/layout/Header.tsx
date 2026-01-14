'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
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
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white shadow-md py-2'
          : 'bg-transparent py-3'
      )}
    >
      <div className="container">
        {/* Desktop Layout - Logo centered */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left Navigation */}
          <nav className="flex items-center gap-6 flex-1">
            {leftNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.href)}
                className={cn(
                  'font-medium transition-colors uppercase tracking-wide',
                  isScrolled
                    ? 'text-gray-700 hover:text-wood-600'
                    : 'text-white hover:text-white/80'
                )}
              >
                {t.navigation[item.key]}
              </button>
            ))}
          </nav>

          {/* Centered Logo */}
          <button
            onClick={() => scrollToSection('#hero')}
            className="transition-transform hover:scale-105 mx-8"
          >
            <Image
              src="/images/logo.svg"
              alt="Sechszirbenhütte"
              width={220}
              height={85}
              className={cn(
                'h-16 md:h-20 w-auto transition-all',
                !isScrolled && 'brightness-0 invert'
              )}
              priority
            />
          </button>

          {/* Right Navigation */}
          <nav className="flex items-center gap-6 flex-1 justify-end">
            {rightNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.href)}
                className={cn(
                  'font-medium transition-colors uppercase tracking-wide',
                  isScrolled
                    ? 'text-gray-700 hover:text-wood-600'
                    : 'text-white hover:text-white/80'
                )}
              >
                {t.navigation[item.key]}
              </button>
            ))}
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
              width={180}
              height={70}
              className={cn(
                'h-14 w-auto transition-all',
                !isScrolled && 'brightness-0 invert'
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
          <nav className="container py-4 flex flex-col gap-2">
            {allNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.href)}
                className="py-2 text-gray-700 hover:text-wood-600 text-left uppercase tracking-wide"
              >
                {t.navigation[item.key]}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
