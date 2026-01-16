import { Suspense } from 'react';
import {
  Hero,
  IntroText,
  Ferienhaus,
  Location,
  HeidiAlm,
  Umgebung,
  Galerie,
  Buchung,
} from '@/components/sections';
import { AdminPreviewListener } from '@/components/ui/AdminPreviewListener';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function HomePage() {
  return (
    <>
      <LoadingScreen minDisplayTime={1500} />
      <Hero />
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
