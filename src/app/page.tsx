import {
  Hero,
  Reviews,
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
