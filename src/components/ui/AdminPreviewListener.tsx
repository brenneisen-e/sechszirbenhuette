'use client';

import { useEffect, useState } from 'react';
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
  padding?: string;
}

export function AdminPreviewListener() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  const isInteractive = searchParams.get('interactive') === '1';
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Handle live text updates from admin
  useEffect(() => {
    if (!isPreview) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify message is from admin
      if (event.data?.type !== 'ADMIN_TEXT_UPDATE') return;

      const { textKey, content, fontFamily, fontSize, color, padding } = event.data as AdminTextUpdate;
      const selector = TEXT_KEY_SELECTORS[textKey];

      if (selector) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          element.textContent = content;
          if (fontFamily) element.style.fontFamily = fontFamily + ', cursive, sans-serif';
          if (fontSize) element.style.fontSize = fontSize + 'px';
          if (color) element.style.color = color;
          if (padding) element.style.padding = padding + 'px';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPreview]);

  // Interactive mode: make text elements clickable
  useEffect(() => {
    if (!isInteractive) return;

    // Add styles for interactive mode
    const style = document.createElement('style');
    style.id = 'admin-interactive-styles';
    style.textContent = `
      [data-text-key] {
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        position: relative !important;
      }
      [data-text-key]:hover {
        outline: 3px dashed #1e5631 !important;
        outline-offset: 4px !important;
        background-color: rgba(30, 86, 49, 0.1) !important;
      }
      [data-text-key].admin-selected {
        outline: 3px solid #1e5631 !important;
        outline-offset: 4px !important;
        background-color: rgba(30, 86, 49, 0.2) !important;
      }
      [data-text-key]::after {
        content: 'Klicken zum Bearbeiten';
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e5631;
        color: white;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        font-family: system-ui, sans-serif !important;
        z-index: 9999;
      }
      [data-text-key]:hover::after {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);

    // Add click handlers to all text elements
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textElement = target.closest('[data-text-key]') as HTMLElement;

      if (textElement) {
        e.preventDefault();
        e.stopPropagation();

        const textKey = textElement.getAttribute('data-text-key');
        if (textKey) {
          // Remove previous selection
          document.querySelectorAll('.admin-selected').forEach(el => {
            el.classList.remove('admin-selected');
          });

          // Mark as selected
          textElement.classList.add('admin-selected');
          setSelectedKey(textKey);

          // Send message to parent (admin)
          window.parent.postMessage({
            type: 'ADMIN_TEXT_SELECTED',
            textKey,
          }, '*');
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      const styleEl = document.getElementById('admin-interactive-styles');
      if (styleEl) styleEl.remove();
    };
  }, [isInteractive]);

  // Don't render anything if not in preview mode
  if (!isPreview) return null;

  return (
    <div className={`fixed bottom-4 right-4 text-white text-xs px-3 py-1.5 rounded-full z-[9999] shadow-lg ${
      isInteractive ? 'bg-logo-green' : 'bg-amber-500'
    }`}>
      {isInteractive ? (
        <span>
          {selectedKey ? `Ausgewählt: ${selectedKey.replace(/_/g, ' ')}` : 'Klicke auf einen Text'}
        </span>
      ) : (
        'Admin-Vorschau'
      )}
    </div>
  );
}
