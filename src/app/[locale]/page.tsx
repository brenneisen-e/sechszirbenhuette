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
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
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
