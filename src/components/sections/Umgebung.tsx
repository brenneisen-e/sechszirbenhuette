'use client';

import Link from 'next/link';
import { ArrowRight, Baby, Dog, MapPin, Mountain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';

// Umgebung: Einleitung und Entfernungen links, rechts der Weg in den Blog
// (Desktop 12 Spalten 7/5, darunter untereinander).

export function Umgebung() {
  const { t } = useLanguage();
  const { getText } = useContentTexts();

  return (
    <section id="umgebung" aria-labelledby="umgebung-title" className="brand-section bg-leinen">
      <div className="brand-container grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-7">
          <SectionHeader
            id="umgebung-title"
            label={t.navigation.umgebung}
            title={getText('umgebung_title')}
            titleKey="umgebung_title"
            intro={getText('umgebung_subtitle')}
            introKey="umgebung_subtitle"
          />
          <p className="mt-4 max-w-3xl text-rinde">{t.umgebung.intro}</p>
          <ul className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {t.amenities.location.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-rinde">
                <MapPin size={18} aria-hidden className="mt-1 shrink-0 text-zirbe" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/blog"
          className="on-zirbe group block rounded-[4px] bg-zirbe p-6 text-leinen md:p-8 lg:col-span-5"
        >
          <p className="text-[1.5rem] leading-tight">{t.blog.bannerTitle}</p>
          <p className="mt-3 text-leinen/85">{t.blog.bannerDescription}</p>
          <p className="mt-5 flex flex-wrap gap-2 text-[0.9375rem]">
            <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-leinen/30 px-3 py-1">
              <Mountain size={16} aria-hidden />
              Nockberge
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-leinen/30 px-3 py-1">
              <Dog size={16} aria-hidden />
              {t.ui.withDogs}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-leinen/30 px-3 py-1">
              <Baby size={16} aria-hidden />
              {t.ui.withKids}
            </span>
          </p>
          <span className="brand-secondary mt-6">
            {t.blog.ctaButton}
            <ArrowRight
              size={18}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
        </Link>
      </div>
    </section>
  );
}
