'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Flaggen als SVG Komponenten
const FlagDE = () => (
  <svg viewBox="0 0 5 3" className="w-6 h-4 rounded-sm shadow-sm">
    <rect width="5" height="1" y="0" fill="#000" />
    <rect width="5" height="1" y="1" fill="#D00" />
    <rect width="5" height="1" y="2" fill="#FFCE00" />
  </svg>
);

const FlagEN = () => (
  <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-sm shadow-sm">
    <clipPath id="t">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
    </clipPath>
    <path d="M0,0 v30 h60 v-30 z" fill="#00247d"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#cf142b" strokeWidth="4"/>
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
    <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" strokeWidth="6"/>
  </svg>
);

const languages: { code: Language; flag: React.ReactNode; label: string }[] = [
  { code: 'de', flag: <FlagDE />, label: 'Deutsch' },
  { code: 'en', flag: <FlagEN />, label: 'English' },
];

interface LanguageSwitcherProps {
  isScrolled?: boolean;
}

export function LanguageSwitcher({ isScrolled = true }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 p-2 rounded-lg transition-colors',
          isScrolled
            ? 'hover:bg-gray-100'
            : 'hover:bg-white/10'
        )}
        aria-label="Sprache wählen"
      >
        {currentLang.flag}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={cn(
                'w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors',
                language === lang.code
                  ? 'bg-wood-50'
                  : ''
              )}
            >
              {lang.flag}
              <span className={cn(
                'text-sm',
                language === lang.code ? 'text-wood-700 font-medium' : 'text-gray-700'
              )}>
                {lang.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
