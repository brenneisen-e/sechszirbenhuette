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

// Default texts for the website
const defaultTexts: Record<string, ContentText> = {
  // Hero Section
  hero_title: {
    id: 0, text_key: 'hero_title', content: 'Herzlich Willkommen in der Sechszirbenhütte',
    font_family: null, font_size: null, color: null, padding: null, section: 'hero', text_type: 'heading', updated_at: ''
  },
  hero_subtitle: {
    id: 0, text_key: 'hero_subtitle', content: 'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen',
    font_family: null, font_size: null, color: null, padding: null, section: 'hero', text_type: 'heading', updated_at: ''
  },
  hero_description: {
    id: 0, text_key: 'hero_description', content: 'Erleben Sie unvergessliche Urlaubstage in unserer über 250 Jahre alten Berghütte – liebevoll restauriert, mit Sauna-Anbau und in absoluter Alleinlage inmitten von Zirben- und Lärchenwäldern am Falkert.',
    font_family: null, font_size: null, color: null, padding: null, section: 'hero', text_type: 'body', updated_at: ''
  },

  // IntroText Section
  introtext_main_heading: {
    id: 0, text_key: 'introtext_main_heading', content: 'Uriges Ferienhaus am Falkert - mit Sauna und Ruheraum',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'heading', updated_at: ''
  },
  introtext_heading_1: {
    id: 0, text_key: 'introtext_heading_1', content: 'Wandern, Skifahren & Erholung in den Nockbergen, Kärnten',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'heading', updated_at: ''
  },
  introtext_text_1: {
    id: 0, text_key: 'introtext_text_1', content: 'Entdecken Sie die Sechszirbenhütte, Ihre traumhafte Unterkunft auf 1.700 m Höhe im Herzen der Nockberge in Kärnten, Österreich. Gelegen an der malerischen Alpensüdseite in Falkertsee, bietet unsere Hütte ein ganzjähriges Urlaubsparadies für Familien und Naturliebhaber',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'body', updated_at: ''
  },
  introtext_heading_2: {
    id: 0, text_key: 'introtext_heading_2', content: 'Heidi Alm Bergresort: Dem Himmel nahe, dem Alltag fern',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'heading', updated_at: ''
  },
  introtext_text_2: {
    id: 0, text_key: 'introtext_text_2', content: 'Erleben Sie einen unvergesslichen Urlaub im Heidi Alm Bergresort, umgeben von gesunder Luft, kristallklarem Gebirgswasser und einer farbenfrohen Natur. Genießen Sie die alpine Flora wie Enzian, Almrausch und Edelweiß und beobachten Sie mit etwas Glück Murmeltiere in ihrer natürlichen Umgebung.',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'body', updated_at: ''
  },
  introtext_heading_3: {
    id: 0, text_key: 'introtext_heading_3', content: 'Winterurlaub in der Heidi-Alm: Familiäres Skigebiet & vielfältige Aktivitäten',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'heading', updated_at: ''
  },
  introtext_text_3: {
    id: 0, text_key: 'introtext_text_3', content: 'Das familiäre Skigebiet der Heidi-Alm bietet drei Lifte, einen Zauberteppich und abwechslungsreiche Pisten für Anfänger bis Fortgeschrittene. Freuen Sie sich auf entspanntes Skifahren ohne Warteschlangen an den Liften, Langlaufen, Eislaufen auf dem See oder geführte Schneeschuhwanderungen. In Peters Skischule werden Kinder und Erwachsene geduldig und spielerisch im Skifahren und Snowboarden unterrichtet. Zudem runden Ski-Touren und Fackelwanderungen das Winterprogramm ab. Erleben Sie die Sechszirbenhütte: Wandern, Skifahren & Erholung in Kärntens Nockbergen. Buchen Sie jetzt Ihren unvergesslichen Urlaub inmitten der atemberaubenden Naturkulisse.',
    font_family: null, font_size: null, color: null, padding: null, section: 'introtext', text_type: 'body', updated_at: ''
  },

  // Ferienhaus Section
  ferienhaus_title: {
    id: 0, text_key: 'ferienhaus_title', content: 'Ausstattung & Komfort',
    font_family: null, font_size: null, color: null, padding: null, section: 'ferienhaus', text_type: 'heading', updated_at: ''
  },
  ferienhaus_subtitle: {
    id: 0, text_key: 'ferienhaus_subtitle', content: 'Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.',
    font_family: null, font_size: null, color: null, padding: null, section: 'ferienhaus', text_type: 'body', updated_at: ''
  },

  // Umgebung Section
  umgebung_title: {
    id: 0, text_key: 'umgebung_title', content: 'Umgebung & Aktivitäten',
    font_family: null, font_size: null, color: null, padding: null, section: 'umgebung', text_type: 'heading', updated_at: ''
  },
  umgebung_subtitle: {
    id: 0, text_key: 'umgebung_subtitle', content: 'Erleben Sie die Vielfalt der Nockberge',
    font_family: null, font_size: null, color: null, padding: null, section: 'umgebung', text_type: 'body', updated_at: ''
  },

  // Buchung Section
  buchung_title: {
    id: 0, text_key: 'buchung_title', content: 'Buchung & Preise',
    font_family: null, font_size: null, color: null, padding: null, section: 'buchung', text_type: 'heading', updated_at: ''
  },
  buchung_subtitle: {
    id: 0, text_key: 'buchung_subtitle', content: 'Buchen Sie Ihren Traumurlaub in der Sechszirbenhütte',
    font_family: null, font_size: null, color: null, padding: null, section: 'buchung', text_type: 'body', updated_at: ''
  },

  // Bewertungen Section
  bewertungen_title: {
    id: 0, text_key: 'bewertungen_title', content: 'Das sagen unsere Gäste',
    font_family: null, font_size: null, color: null, padding: null, section: 'bewertungen', text_type: 'heading', updated_at: ''
  },
  bewertungen_subtitle: {
    id: 0, text_key: 'bewertungen_subtitle', content: 'Erfahrungen und Bewertungen von Urlaubern',
    font_family: null, font_size: null, color: null, padding: null, section: 'bewertungen', text_type: 'body', updated_at: ''
  },
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
      const data = await response.json();
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
