import { Suspense } from 'react';
import { Hero } from '@/components/sections/Hero';
import { Bewertungen } from '@/components/sections/Bewertungen';
import { IntroText } from '@/components/sections/IntroText';
import { Ferienhaus } from '@/components/sections/Ferienhaus';
import { Location } from '@/components/sections/Location';
import { Umgebung } from '@/components/sections/Umgebung';
import { Galerie } from '@/components/sections/Galerie';
import { Instagram } from '@/components/sections/Instagram';
import { Buchung } from '@/components/sections/Buchung';
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
