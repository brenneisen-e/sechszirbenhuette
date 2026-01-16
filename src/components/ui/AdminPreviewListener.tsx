'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Text key to CSS selector mapping for live preview updates
const TEXT_KEY_SELECTORS: Record<string, string> = {
  // Hero
  hero_title: '[data-text-key="hero_title"]',
  hero_subtitle: '[data-text-key="hero_subtitle"]',
  hero_description: '[data-text-key="hero_description"]',
  // IntroText
  introtext_main_heading: '[data-text-key="introtext_main_heading"]',
  introtext_heading_1: '[data-text-key="introtext_heading_1"]',
  introtext_text_1: '[data-text-key="introtext_text_1"]',
  introtext_heading_2: '[data-text-key="introtext_heading_2"]',
  introtext_text_2: '[data-text-key="introtext_text_2"]',
  introtext_heading_3: '[data-text-key="introtext_heading_3"]',
  introtext_text_3: '[data-text-key="introtext_text_3"]',
  // Ferienhaus
  ferienhaus_title: '[data-text-key="ferienhaus_title"]',
  ferienhaus_subtitle: '[data-text-key="ferienhaus_subtitle"]',
  // Umgebung
  umgebung_title: '[data-text-key="umgebung_title"]',
  umgebung_subtitle: '[data-text-key="umgebung_subtitle"]',
  // Buchung
  buchung_title: '[data-text-key="buchung_title"]',
  buchung_subtitle: '[data-text-key="buchung_subtitle"]',
  // Bewertungen
  bewertungen_title: '[data-text-key="bewertungen_title"]',
  bewertungen_subtitle: '[data-text-key="bewertungen_subtitle"]',
};

interface AdminTextUpdate {
  type: 'ADMIN_TEXT_UPDATE';
  textKey: string;
  content: string;
  fontFamily?: string;
  fontSize?: string;
  color?: string;
}

export function AdminPreviewListener() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  useEffect(() => {
    if (!isPreview) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify message is from admin
      if (event.data?.type !== 'ADMIN_TEXT_UPDATE') return;

      const { textKey, content, fontFamily, fontSize, color } = event.data as AdminTextUpdate;
      const selector = TEXT_KEY_SELECTORS[textKey];

      if (selector) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          element.textContent = content;
          if (fontFamily) element.style.fontFamily = fontFamily + ', cursive, sans-serif';
          if (fontSize) element.style.fontSize = fontSize + 'px';
          if (color) element.style.color = color;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPreview]);

  // Add visual indicator that this is a preview
  if (!isPreview) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-full z-[9999] shadow-lg">
      Admin-Vorschau
    </div>
  );
}
