import { setRequestLocale } from 'next-intl/server';
import {
  Hero,
  Features,
  HeidiAlm,
  Ferienhaus,
  Umgebung,
  Buchung,
  Bewertungen,
} from '@/components/sections';

interface PageProps {
  params: { locale: string };
}

export default function HomePage({ params: { locale } }: PageProps) {
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Features />
      <HeidiAlm />
      <Ferienhaus />
      <Umgebung />
      <Buchung />
      <Bewertungen />
    </>
  );
}
