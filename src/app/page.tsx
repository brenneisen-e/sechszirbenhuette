import {
  Hero,
  Features,
  HeidiAlm,
  Ferienhaus,
  Galerie,
  Umgebung,
  Buchung,
  Bewertungen,
} from '@/components/sections';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Ferienhaus />
      <Galerie />
      <Umgebung />
      <HeidiAlm />
      <Buchung />
      <Bewertungen />
    </>
  );
}
