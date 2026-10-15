'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { SITE_CONFIG } from '@/lib/constants';
import { ZirbenMark } from './ZirbenMark';

// Persönlicher Gruß: heller Abschnitt, originaler Zirbenzweig (M3) und eine
// kurze Gastgeberzeile in Northwell. Der Text ist sofort lesbar und wird nicht
// mitanimiert.

export function HostGreeting() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="gruss-title" className="bg-leinen py-16 md:py-24">
      <div className="brand-container grid items-center gap-8 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-3 md:flex md:justify-end">
          <ZirbenMark width={104} />
        </div>
        <div className="md:col-span-8 lg:col-span-7">
          <p className="brand-label text-zirbe">{t.brand.greetingLabel}</p>
          <h2 id="gruss-title" className="brand-hand mt-2 text-zirbe">
            {t.brand.greetingHand}
          </h2>
          <p className="mt-4 max-w-[38rem] text-rinde">{t.brand.greetingText}</p>
          <p className="mt-6 text-zirbe">{SITE_CONFIG.owners}</p>
        </div>
      </div>
    </section>
  );
}
