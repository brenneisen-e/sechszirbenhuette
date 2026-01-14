import {
  Hero,
  Features,
  HeidiAlm,
  Ferienhaus,
  Umgebung,
  Buchung,
  Bewertungen,
} from '@/components/sections';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Buchung />
      <HeidiAlm />
      <Ferienhaus />
      <Umgebung />
      <Bewertungen />
    </>
  );
}
