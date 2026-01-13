import { setRequestLocale } from 'next-intl/server';
import { SITE_CONFIG } from '@/lib/constants';

export const runtime = 'edge';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return {
    title: locale === 'de' ? 'Impressum | Sechszirbenhütte' : 'Imprint | Sechszirbenhütte',
    description: locale === 'de'
      ? 'Impressum und rechtliche Angaben zur Sechszirbenhütte am Falkert.'
      : 'Imprint and legal information for Sechszirbenhütte at Falkert.',
    robots: 'noindex, follow',
  };
}

export default async function ImpressumPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="pt-24 pb-16">
      <div className="container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {locale === 'de' ? 'Impressum' : 'Imprint'}
        </h1>

        <div className="prose prose-gray max-w-none">
          <h2>{locale === 'de' ? 'Angaben gemäß § 5 TMG' : 'Information according to § 5 TMG'}</h2>
          <p>
            {SITE_CONFIG.owners}<br />
            {SITE_CONFIG.address.street}<br />
            {SITE_CONFIG.address.zip} {SITE_CONFIG.address.city}<br />
            {SITE_CONFIG.address.country}
          </p>

          <h2>{locale === 'de' ? 'Kontakt' : 'Contact'}</h2>
          <p>
            {locale === 'de' ? 'Telefon' : 'Phone'}: {SITE_CONFIG.phone}<br />
            E-Mail: {SITE_CONFIG.email}
          </p>

          <h2>{locale === 'de' ? 'Konzeption, Gestaltung und Programmierung' : 'Concept, Design and Development'}</h2>
          <p>
            agentur etcetera GmbH & Co.KG<br />
            Marketing & Kommunikation<br />
            <a href="https://www.agentur-etcetera.de" target="_blank" rel="noopener noreferrer">
              www.agentur-etcetera.de
            </a>
          </p>

          <h2>{locale === 'de' ? 'Haftung für Inhalte' : 'Liability for Content'}</h2>
          <p>
            {locale === 'de'
              ? 'Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.'
              : 'As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 (1) TMG. According to §§ 8 to 10 TMG, however, we as a service provider are not obliged to monitor transmitted or stored external information or to investigate circumstances that indicate illegal activity.'}
          </p>
          <p>
            {locale === 'de'
              ? 'Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.'
              : 'Obligations to remove or block the use of information in accordance with general laws remain unaffected. However, liability in this regard is only possible from the point in time at which a concrete infringement of the law becomes known. If we become aware of any such infringements, we will remove this content immediately.'}
          </p>

          <h2>{locale === 'de' ? 'Haftung für Links' : 'Liability for Links'}</h2>
          <p>
            {locale === 'de'
              ? 'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.'
              : 'Our offer contains links to external websites of third parties, on whose contents we have no influence. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is always responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal contents were not recognizable at the time of linking.'}
          </p>

          <h2>{locale === 'de' ? 'Urheberrecht' : 'Copyright'}</h2>
          <p>
            {locale === 'de'
              ? 'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.'
              : 'The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution and any form of commercialization of such material beyond the scope of the copyright law shall require the prior written consent of its respective author or creator. Downloads and copies of this site are only permitted for private, non-commercial use.'}
          </p>
        </div>
      </div>
    </div>
  );
}
