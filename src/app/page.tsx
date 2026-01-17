import { Suspense } from 'react';
import {
  Hero,
  Bewertungen,
  IntroText,
  Ferienhaus,
  Location,
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
      <Bewertungen />
      <Location />
      <Umgebung />
      <Buchung />
      <Suspense fallback={null}>
        <AdminPreviewListener />
      </Suspense>
    </>
  );
}
