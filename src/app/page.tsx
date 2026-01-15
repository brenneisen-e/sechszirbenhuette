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
    </>
  );
}
