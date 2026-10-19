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
import { Orientation } from '@/components/brand/Orientation';
import { FacadeBand } from '@/components/brand/FacadeBand';
import { HutChapters } from '@/components/brand/HutChapters';
import { HostGreeting } from '@/components/brand/HostGreeting';

export default function HomePage() {
  return (
    <div className="brand-page">
      <Hero />
      <Orientation />
      <FacadeBand animated />
      <HutChapters />
      <IntroText />
      <Ferienhaus />
      <Galerie />
      <Bewertungen />
      <Instagram />
      <Location />
      <Umgebung />
      <HostGreeting />
      <FacadeBand animated />
      <Buchung />
      <Suspense fallback={null}>
        <AdminPreviewListener />
      </Suspense>
    </div>
  );
}
