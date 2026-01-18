import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext';
import { ContentTextsProvider } from '@/contexts/ContentTextsContext';
import { Header, Footer, MobileBookingButton } from '@/components/layout';
import { PineBackground } from '@/components/ui/PineBackground';
import { MobileScrollProgress } from '@/components/ui/MobileScrollProgress';
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
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Preload critical custom fonts to prevent FOUT on slow connections */}
        <link
          rel="preload"
          href="/fonts/Feeling Passionate Personal Use Only.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Autography.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        {/* Preconnect to font CDNs */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Inter font via CSS */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased overflow-x-hidden" suppressHydrationWarning>
        {/* Immediate CSS-only loading indicator - shows before JS loads */}
        <div id="initial-loader" className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white" suppressHydrationWarning>
          <style dangerouslySetInnerHTML={{ __html: `
            #initial-loader { transition: opacity 0.3s ease-out; }
            #initial-loader.loaded { opacity: 0; pointer-events: none; }
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-8px); opacity: 1; } }
            .init-spinner { width: 48px; height: 48px; border: 4px solid #1e563120; border-top-color: #1e5631; border-radius: 50%; animation: spin 1s linear infinite; }
            .init-dots { display: flex; gap: 4px; margin-top: 16px; }
            .init-dot { width: 8px; height: 8px; background: #1e5631; border-radius: 50%; animation: bounce 0.8s ease-in-out infinite; }
            .init-dot:nth-child(2) { animation-delay: 0.2s; }
            .init-dot:nth-child(3) { animation-delay: 0.4s; }
          `}} />
          <div className="init-spinner" />
          <div className="init-dots">
            <div className="init-dot" />
            <div className="init-dot" />
            <div className="init-dot" />
          </div>
        </div>
        <SiteSettingsProvider>
          <LanguageProvider>
            <ContentTextsProvider>
              <PineBackground />
              <MobileScrollProgress />
              <Header />
              <MobileBookingButton />
              <main className="relative z-10">{children}</main>
              <Footer />
            </ContentTextsProvider>
          </LanguageProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
