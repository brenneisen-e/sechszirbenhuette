'use client';

import { MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';

// Umgebung: Einleitung und Entfernungen. Den Weg in den Blog zeigt der
// Abschnitt direkt darunter (BlogTeaser) mit den neuesten Beiträgen.

export function Umgebung() {
  const { t } = useLanguage();
  const { getText } = useContentTexts();

  return (
    <section id="umgebung" aria-labelledby="umgebung-title" className="brand-section bg-leinen">
      <div className="brand-container">
        <SectionHeader
          id="umgebung-title"
          label={t.navigation.umgebung}
          title={getText('umgebung_title')}
          titleKey="umgebung_title"
          intro={getText('umgebung_subtitle')}
          introKey="umgebung_subtitle"
        />
        <p className="mt-4 max-w-3xl text-rinde">{t.umgebung.intro}</p>
        <ul className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {t.amenities.location.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-rinde">
              <MapPin size={18} aria-hidden className="mt-1 shrink-0 text-zirbe" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
