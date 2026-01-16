'use client';

import { createContext, useContext, useState, useEffect, ReactNode, CSSProperties } from 'react';

export interface ContentText {
  id: number;
  text_key: string;
  content: string;
  font_family: string | null;
  font_size: string | null;
  color: string | null;
  padding: string | null;
  section: string;
  text_type: string;
  updated_at: string;
}

// Helper function to create a default text entry
const createText = (
  text_key: string,
  content: string,
  section: string,
  text_type: 'heading' | 'body' = 'body'
): ContentText => ({
  id: 0,
  text_key,
  content,
  font_family: null,
  font_size: null,
  color: null,
  padding: null,
  section,
  text_type,
  updated_at: '',
});

// Default texts for the website
const defaultTexts: Record<string, ContentText> = {
  // ============================================================================
  // HERO SECTION
  // ============================================================================
  hero_title: createText('hero_title', 'Herzlich Willkommen in der Sechszirbenhütte', 'hero', 'heading'),
  hero_subtitle: createText('hero_subtitle', 'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen', 'hero', 'heading'),
  hero_description: createText('hero_description', 'Erleben Sie unvergessliche Urlaubstage in unserer über 250 Jahre alten Berghütte – liebevoll restauriert, mit Sauna-Anbau und in absoluter Alleinlage inmitten von Zirben- und Lärchenwäldern am Falkert.', 'hero', 'body'),

  // ============================================================================
  // INTROTEXT SECTION
  // ============================================================================
  introtext_main_heading: createText('introtext_main_heading', 'Uriges Ferienhaus am Falkert - mit Sauna und Ruheraum', 'introtext', 'heading'),
  introtext_heading_1: createText('introtext_heading_1', 'Wandern, Skifahren & Erholung in den Nockbergen, Kärnten', 'introtext', 'heading'),
  introtext_text_1: createText('introtext_text_1', 'Entdecken Sie die Sechszirbenhütte, Ihre traumhafte Unterkunft auf 1.700 m Höhe im Herzen der Nockberge in Kärnten, Österreich. Gelegen an der malerischen Alpensüdseite in Falkertsee, bietet unsere Hütte ein ganzjähriges Urlaubsparadies für Familien und Naturliebhaber', 'introtext', 'body'),
  introtext_heading_2: createText('introtext_heading_2', 'Heidi Alm Bergresort: Dem Himmel nahe, dem Alltag fern', 'introtext', 'heading'),
  introtext_text_2: createText('introtext_text_2', 'Erleben Sie einen unvergesslichen Urlaub im Heidi Alm Bergresort, umgeben von gesunder Luft, kristallklarem Gebirgswasser und einer farbenfrohen Natur. Genießen Sie die alpine Flora wie Enzian, Almrausch und Edelweiß und beobachten Sie mit etwas Glück Murmeltiere in ihrer natürlichen Umgebung.', 'introtext', 'body'),
  introtext_heading_3: createText('introtext_heading_3', 'Winterurlaub in der Heidi-Alm: Familiäres Skigebiet & vielfältige Aktivitäten', 'introtext', 'heading'),
  introtext_text_3: createText('introtext_text_3', 'Das familiäre Skigebiet der Heidi-Alm bietet drei Lifte, einen Zauberteppich und abwechslungsreiche Pisten für Anfänger bis Fortgeschrittene. Freuen Sie sich auf entspanntes Skifahren ohne Warteschlangen an den Liften, Langlaufen, Eislaufen auf dem See oder geführte Schneeschuhwanderungen. In Peters Skischule werden Kinder und Erwachsene geduldig und spielerisch im Skifahren und Snowboarden unterrichtet. Zudem runden Ski-Touren und Fackelwanderungen das Winterprogramm ab. Erleben Sie die Sechszirbenhütte: Wandern, Skifahren & Erholung in Kärntens Nockbergen. Buchen Sie jetzt Ihren unvergesslichen Urlaub inmitten der atemberaubenden Naturkulisse.', 'introtext', 'body'),

  // ============================================================================
  // FERIENHAUS SECTION
  // ============================================================================
  ferienhaus_title: createText('ferienhaus_title', 'Ausstattung & Komfort', 'ferienhaus', 'heading'),
  ferienhaus_subtitle: createText('ferienhaus_subtitle', 'Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.', 'ferienhaus', 'body'),
  ferienhaus_grundriss_title: createText('ferienhaus_grundriss_title', 'Grundriss', 'ferienhaus', 'heading'),
  ferienhaus_grundriss_description: createText('ferienhaus_grundriss_description', 'Unsere Hütte bietet auf ca. 100 m² Wohnfläche Platz für bis zu 8 Personen. Im Erdgeschoss befinden sich die Küche, der gemütliche Wohnbereich mit Schwedenofen, sowie der Wellnessbereich mit Sauna und Ruheraum. Im Obergeschoss liegen die drei Schlafzimmer mit insgesamt 4 Betten und 2 Stockbetten.', 'ferienhaus', 'body'),
  ferienhaus_wohnflaeche: createText('ferienhaus_wohnflaeche', 'ca. 100 m² Wohnfläche', 'ferienhaus', 'body'),
  ferienhaus_etagen: createText('ferienhaus_etagen', '2 Etagen', 'ferienhaus', 'body'),

  // ============================================================================
  // GALERIE SECTION
  // ============================================================================
  galerie_title: createText('galerie_title', 'Galerie', 'galerie', 'heading'),
  galerie_subtitle: createText('galerie_subtitle', 'Entdecken Sie die Sechszirbenhütte in Bildern', 'galerie', 'body'),

  // ============================================================================
  // LOCATION SECTION
  // ============================================================================
  location_title: createText('location_title', 'So finden Sie uns', 'location', 'heading'),
  location_subtitle: createText('location_subtitle', 'Die Sechszirbenhütte liegt auf 1.700 m direkt am Nationalpark Nockberge', 'location', 'body'),
  location_maps_button: createText('location_maps_button', 'In Google Maps öffnen', 'location', 'body'),
  location_address_title: createText('location_address_title', 'Adresse', 'location', 'heading'),
  location_directions_title: createText('location_directions_title', 'Anfahrt', 'location', 'heading'),
  location_directions_1: createText('location_directions_1', 'A10 Tauernautobahn, Abfahrt Spittal/Millstätter See', 'location', 'body'),
  location_directions_2: createText('location_directions_2', 'Über Bad Kleinkirchheim Richtung Falkertsee', 'location', 'body'),
  location_directions_3: createText('location_directions_3', 'Der Heidi-Figur folgen (ca. 8 km Bergstraße)', 'location', 'body'),
  location_chains_warning: createText('location_chains_warning', 'Nov–April: Schneeketten empfohlen', 'location', 'body'),
  location_contact_title: createText('location_contact_title', 'Kontakt', 'location', 'heading'),

  // ============================================================================
  // UMGEBUNG SECTION
  // ============================================================================
  umgebung_title: createText('umgebung_title', 'Umgebung & Aktivitäten', 'umgebung', 'heading'),
  umgebung_subtitle: createText('umgebung_subtitle', 'Erleben Sie die Vielfalt der Nockberge', 'umgebung', 'body'),

  // ============================================================================
  // BUCHUNG SECTION
  // ============================================================================
  buchung_title: createText('buchung_title', 'Buchung & Preise', 'buchung', 'heading'),
  buchung_subtitle: createText('buchung_subtitle', 'Buchen Sie Ihren Traumurlaub in der Sechszirbenhütte', 'buchung', 'body'),
  buchung_preise_title: createText('buchung_preise_title', 'Preisübersicht', 'buchung', 'heading'),
  buchung_preise_base: createText('buchung_preise_base', 'Mietpreis pro Nacht (bis 4 Personen)', 'buchung', 'body'),
  buchung_nebensaison: createText('buchung_nebensaison', 'Nebensaison', 'buchung', 'body'),
  buchung_hauptsaison: createText('buchung_hauptsaison', 'Hauptsaison', 'buchung', 'body'),
  buchung_mindestaufenthalt: createText('buchung_mindestaufenthalt', 'Mindestaufenthalt: 3 Nächte (Hauptsaison: 7 Nächte)', 'buchung', 'body'),
  buchung_extras_title: createText('buchung_extras_title', 'Zusatzleistungen', 'buchung', 'heading'),
  buchung_extra_person: createText('buchung_extra_person', '5. Person', 'buchung', 'body'),
  buchung_extra_hund: createText('buchung_extra_hund', 'Hund', 'buchung', 'body'),
  buchung_extra_waesche: createText('buchung_extra_waesche', 'Wäschepaket', 'buchung', 'body'),
  buchung_inklusive_title: createText('buchung_inklusive_title', 'Inklusive', 'buchung', 'heading'),
  buchung_kontakt_title: createText('buchung_kontakt_title', 'Direkter Kontakt', 'buchung', 'heading'),
  buchung_form_title: createText('buchung_form_title', 'Buchungsanfrage', 'buchung', 'heading'),
  buchung_form_intro: createText('buchung_form_intro', 'Prüfen Sie die Verfügbarkeit und senden Sie uns direkt eine Anfrage.', 'buchung', 'body'),
  buchung_check_button: createText('buchung_check_button', 'Verfügbarkeit prüfen', 'buchung', 'body'),

  // ============================================================================
  // BEWERTUNGEN SECTION
  // ============================================================================
  bewertungen_title: createText('bewertungen_title', 'Das sagen unsere Gäste', 'bewertungen', 'heading'),
  bewertungen_subtitle: createText('bewertungen_subtitle', 'Erfahrungen und Bewertungen von Urlaubern', 'bewertungen', 'body'),

  // ============================================================================
  // FOOTER SECTION
  // ============================================================================
  footer_company: createText('footer_company', 'Sechszirbenhütte', 'footer', 'heading'),
  footer_description: createText('footer_description', 'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen. Über 250 Jahre alte Berghütte mit Sauna in Alleinlage.', 'footer', 'body'),
  footer_contact_title: createText('footer_contact_title', 'Kontakt', 'footer', 'heading'),
  footer_legal_title: createText('footer_legal_title', 'Rechtliches', 'footer', 'heading'),
  footer_social_title: createText('footer_social_title', 'Folgen Sie uns', 'footer', 'heading'),
  footer_copyright: createText('footer_copyright', '© {year} Sechszirbenhütte. Alle Rechte vorbehalten.', 'footer', 'body'),
};

type ContentTextsContextType = {
  texts: Record<string, ContentText>;
  getText: (key: string) => string;
  getTextStyle: (key: string) => CSSProperties;
  getTextWithStyle: (key: string) => { content: string; style: CSSProperties };
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const ContentTextsContext = createContext<ContentTextsContextType | undefined>(undefined);

export function ContentTextsProvider({ children }: { children: ReactNode }) {
  const [texts, setTexts] = useState<Record<string, ContentText>>(defaultTexts);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTexts = async () => {
    try {
      const response = await fetch('/api/content-texts');
      const data = await response.json() as { texts?: Record<string, ContentText> };
      if (data.texts) {
        setTexts({ ...defaultTexts, ...data.texts });
      }
    } catch (error) {
      console.error('Failed to fetch content texts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTexts();
  }, []);

  const getText = (key: string): string => {
    return texts[key]?.content || defaultTexts[key]?.content || '';
  };

  const getTextStyle = (key: string): CSSProperties => {
    const text = texts[key];
    if (!text) return {};

    const style: CSSProperties = {};

    if (text.font_family) {
      style.fontFamily = text.font_family + (text.text_type === 'heading' ? ', cursive' : ', sans-serif');
    }

    if (text.font_size) {
      style.fontSize = text.font_size + 'px';
    }

    if (text.color) {
      style.color = text.color;
    }

    if (text.padding) {
      style.padding = text.padding + 'px';
    }

    return style;
  };

  const getTextWithStyle = (key: string) => {
    return {
      content: getText(key),
      style: getTextStyle(key),
    };
  };

  return (
    <ContentTextsContext.Provider value={{ texts, getText, getTextStyle, getTextWithStyle, isLoading, refetch: fetchTexts }}>
      {children}
    </ContentTextsContext.Provider>
  );
}

export function useContentTexts() {
  const context = useContext(ContentTextsContext);
  if (context === undefined) {
    throw new Error('useContentTexts must be used within a ContentTextsProvider');
  }
  return context;
}
