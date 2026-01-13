import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { Header, Footer } from '@/components/layout';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return {
    title: locale === 'de'
      ? 'Sechszirbenhütte am Falkert | Premium-Hüttenurlaub in den Nockbergen'
      : 'Sechszirbenhütte at Falkert | Premium Mountain Retreat in the Nockberge',
    description: locale === 'de'
      ? 'Historische Berghütte mit Sauna in Alleinlage auf 1.700m. Wandern, Skifahren & Erholung in Kärnten. Familien & Hunde willkommen.'
      : 'Historic mountain cabin with sauna in secluded location at 1,700m. Hiking, skiing & relaxation in Carinthia. Families & dogs welcome.',
    keywords: [
      'Ferienhütte Kärnten',
      'Berghütte Nockberge',
      'Hüttenurlaub Österreich',
      'Skiurlaub Falkert',
      'Wandern Alpen',
      'Sauna Berghütte',
    ],
    openGraph: {
      title: locale === 'de'
        ? 'Sechszirbenhütte – Ihr Traumurlaub am Falkert'
        : 'Sechszirbenhütte – Your Dream Vacation at Falkert',
      description: locale === 'de'
        ? 'Über 250 Jahre alte Berghütte mit modernem Komfort und Sauna. Direkt am Nationalpark Nockberge.'
        : 'Over 250-year-old mountain cabin with modern comfort and sauna. Right at Nockberge National Park.',
      images: ['/images/fallback/og-image.jpg'],
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
