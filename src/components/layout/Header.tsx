'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'home', href: '#hero' },
  { key: 'ferienhaus', href: '#ferienhaus' },
  { key: 'umgebung', href: '#umgebung' },
  { key: 'buchung', href: '#buchung' },
  { key: 'bewertungen', href: '#bewertungen' },
] as const;

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
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white',
        isScrolled ? 'shadow-md py-2' : 'py-3'
      )}
    >
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => scrollToSection('#hero')}
          className="transition-transform hover:scale-105"
        >
          <Image
            src="/images/logo.svg"
            alt="Sechszirbenhütte"
            width={220}
            height={85}
            className="h-16 md:h-20 w-auto"
            priority
          />
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => scrollToSection(item.href)}
              className={cn(
                'font-medium transition-colors hover:text-wood-600',
                isScrolled ? 'text-gray-700' : 'text-gray-800'
              )}
            >
              {t.navigation[item.key]}
            </button>
          ))}
        </nav>

        {/* Right Side: Language Switcher + CTA */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={() => scrollToSection('#buchung')}
            className="px-4 py-2 rounded-lg font-medium bg-wood-700 text-white hover:bg-wood-800 transition-colors"
          >
            {t.navigation.buchung}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-gray-700 transition-colors"
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
                {t.navigation[item.key]}
              </button>
            ))}
            <div className="pt-4 border-t mt-2">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
