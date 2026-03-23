import { Suspense } from 'react';
import {
  Hero,
  Bewertungen,
  IntroText,
  Ferienhaus,
  Location,
  Umgebung,
  Galerie,
  Instagram,
  Buchung,
} from '@/components/sections';
import { AdminPreviewListener } from '@/components/ui/AdminPreviewListener';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function HomePage() {
  return (
    <>
      <LoadingScreen minDisplayTime={1000} />
      <Hero />
      <IntroText />
      <Ferienhaus />
      <Galerie />
      <Instagram />
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
