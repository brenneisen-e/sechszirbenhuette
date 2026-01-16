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
import { Header, Footer } from '@/components/layout';
import { PineBackground } from '@/components/ui/PineBackground';
import { AdminPreviewListener } from '@/components/ui/AdminPreviewListener';

export default function HomePage() {
  return (
    <>
      <PineBackground />
      <Header />
      <main className="relative z-10">
        <Hero />
        <Reviews />
        <IntroText />
        <Ferienhaus />
        <Location />
        <HeidiAlm />
        <Umgebung />
        <Galerie />
        <Buchung />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <AdminPreviewListener />
      </Suspense>
    </>
  );
}
