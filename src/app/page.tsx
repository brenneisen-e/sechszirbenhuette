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
  Bewertungen,
} from '@/components/sections';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Reviews />
      <IntroText />
      <Ferienhaus />
      <Location />
      <HeidiAlm />
      <Umgebung />
      <Galerie />
      <Buchung />
      <Bewertungen />
    </>
  );
}
