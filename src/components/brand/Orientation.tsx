'use client';

import { useLanguage } from '@/contexts/LanguageContext';

// Kurze Orientierung unter dem Aufmacher: wenige belegte Kerninformationen auf
// Leinen (Quelle: bestehende Angaben zu Höhe, Personen, Wohnfläche, Sauna,
// Hunden). Statisch.

export function Orientation() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="orientierung-title" className="bg-leinen pt-12 md:pt-16">
      <div className="brand-container">
        <h2 id="orientierung-title" className="brand-label text-zirbe">
          {t.brand.factsTitle}
        </h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-zirbe/25 pt-8 sm:grid-cols-3 lg:grid-cols-5">
          {t.brand.facts.map((fact) => (
            <div key={fact.value}>
              <dt className="text-[1.75rem] leading-[2rem] text-zirbe md:text-[2rem] md:leading-[2.25rem]">
                {fact.value}
              </dt>
              <dd className="mt-1 text-[0.9375rem] leading-[1.375rem] text-rinde">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
