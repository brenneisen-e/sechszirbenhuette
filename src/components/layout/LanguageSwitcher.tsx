'use client';

import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

interface LanguageSwitcherProps {
  isScrolled?: boolean;
}

export function LanguageSwitcher({ isScrolled = true }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={cn(
            'px-2 py-1 text-lg rounded transition-all',
            language === lang.code
              ? 'opacity-100 scale-110'
              : 'opacity-60 hover:opacity-100',
            !isScrolled && 'filter drop-shadow-md'
          )}
          title={lang.label}
          aria-label={`Switch to ${lang.label}`}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
