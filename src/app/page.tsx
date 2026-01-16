import { Suspense } from 'react';
import {
  Hero,
  Reviews,
  IntroText,
  Ferienhaus,
  Location,
  HeidiAlm,
  Umgebung,
  Galerie,
  Buchung,
} from '@/components/sections';
import { AdminPreviewListener } from '@/components/ui/AdminPreviewListener';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Reviews />
      <IntroText />
      <Ferienhaus />
      <Galerie />
      <Location />
      <HeidiAlm />
      <Umgebung />
      <Buchung />
      <Suspense fallback={null}>
        <AdminPreviewListener />
      </Suspense>
    </>
  );
}
