import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Header, Footer } from '@/components/layout';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sechszirbenhuette.pages.dev'),
  title: {
    default: 'Sechszirbenhütte am Falkert | Premium-Hüttenurlaub in den Nockbergen',
    template: '%s | Sechszirbenhütte',
  },
  description: 'Historische Berghütte mit Sauna in Alleinlage auf 1.700m. Wandern, Skifahren & Erholung in Kärnten. Familien & Hunde willkommen.',
  keywords: [
    'Ferienhütte Kärnten',
    'Berghütte Nockberge',
    'Hüttenurlaub Österreich',
    'Skiurlaub Falkert',
    'Wandern Alpen',
    'Sauna Berghütte',
    'Sechszirbenhütte',
    'Falkertsee',
    'Heidi Alm',
    'Ferienhaus Kärnten',
    'Familienurlaub Berge',
  ],
  authors: [{ name: 'Sechszirbenhütte' }],
  creator: 'Sechszirbenhütte',
  publisher: 'Sechszirbenhütte',
  openGraph: {
    title: 'Sechszirbenhütte – Ihr Traumurlaub am Falkert',
    description: 'Über 250 Jahre alte Berghütte mit modernem Komfort und Sauna. Direkt am Nationalpark Nockberge.',
    images: ['/images/fallback/og-image.jpg'],
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sechszirbenhütte – Ihr Traumurlaub am Falkert',
    description: 'Über 250 Jahre alte Berghütte mit modernem Komfort und Sauna.',
    images: ['/images/fallback/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        {/* Preconnect to font CDNs */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Inter font via CSS */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
