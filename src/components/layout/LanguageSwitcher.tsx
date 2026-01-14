'use client';

import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const languages: { code: Language; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={cn(
            'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
            language === lang.code
              ? 'border-wood-600 scale-110 shadow-md'
              : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-300'
          )}
          title={lang.label}
          aria-label={`Switch to ${lang.label}`}
        >
          {lang.code === 'de' ? (
            // German Flag
            <svg viewBox="0 0 5 3" className="w-full h-full">
              <rect width="5" height="1" y="0" fill="#000"/>
              <rect width="5" height="1" y="1" fill="#DD0000"/>
              <rect width="5" height="1" y="2" fill="#FFCE00"/>
            </svg>
          ) : (
            // UK Flag
            <svg viewBox="0 0 60 30" className="w-full h-full">
              <clipPath id="s">
                <path d="M0,0 v30 h60 v-30 z"/>
              </clipPath>
              <clipPath id="t">
                <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
              </clipPath>
              <g clipPath="url(#s)">
                <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
                <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
              </g>
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
