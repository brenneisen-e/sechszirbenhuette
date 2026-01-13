'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'home', href: '#hero' },
  { key: 'ferienhaus', href: '#ferienhaus' },
  { key: 'umgebung', href: '#umgebung' },
  { key: 'buchung', href: '#buchung' },
  { key: 'bewertungen', href: '#bewertungen' },
];

export function Header() {
  const t = useTranslations('navigation');
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
          ? 'bg-white/95 backdrop-blur-sm shadow-md py-2'
          : 'bg-transparent py-4'
      )}
    >
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => scrollToSection('#hero')}
          className={cn(
            'text-xl md:text-2xl font-bold transition-colors',
            isScrolled ? 'text-wood-800' : 'text-white'
          )}
        >
          Sechszirbenhütte
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => scrollToSection(item.href)}
              className={cn(
                'font-medium transition-colors hover:text-wood-600',
                isScrolled ? 'text-gray-700' : 'text-white'
              )}
            >
              {t(item.key)}
            </button>
          ))}
        </nav>

        {/* Right Side: Language Switcher + CTA */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageSwitcher isScrolled={isScrolled} />
          <button
            onClick={() => scrollToSection('#buchung')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              isScrolled
                ? 'bg-wood-700 text-white hover:bg-wood-800'
                : 'bg-white text-wood-700 hover:bg-gray-100'
            )}
          >
            {t('buchung')}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            'md:hidden p-2 rounded-lg transition-colors',
            isScrolled ? 'text-gray-700' : 'text-white'
          )}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg">
          <nav className="container py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.href)}
                className="py-2 text-gray-700 hover:text-wood-600 text-left"
              >
                {t(item.key)}
              </button>
            ))}
            <div className="pt-4 border-t mt-2">
              <LanguageSwitcher isScrolled={true} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
