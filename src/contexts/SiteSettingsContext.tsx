'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SiteSettings {
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  headingSize: 'small' | 'normal' | 'large';
  bodySize: 'small' | 'normal' | 'large';
  sectionSpacing: 'compact' | 'normal' | 'spacious';
}

const defaultSettings: SiteSettings = {
  primaryColor: '#1e5631',
  accentColor: '#8B7355',
  headingFont: 'FeelingPassionate',
  bodyFont: 'system-ui',
  headingSize: 'normal',
  bodySize: 'normal',
  sectionSpacing: 'normal',
};

type SiteSettingsContextType = {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  isLoading: boolean;
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

// CSS variable mappings
const headingSizeMap = {
  small: '0.85',
  normal: '1',
  large: '1.15',
};

const bodySizeMap = {
  small: '14px',
  normal: '16px',
  large: '18px',
};

const sectionSpacingMap = {
  compact: '3rem',
  normal: '5rem',
  spacious: '7rem',
};

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch settings from API
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/site-settings');
        const data = await response.json();
        if (data.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
          });
        }
      } catch (error) {
        console.error('Failed to fetch site settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Apply CSS variables when settings change
  useEffect(() => {
    const root = document.documentElement;

    // Colors
    root.style.setProperty('--color-primary', settings.primaryColor);
    root.style.setProperty('--color-accent', settings.accentColor);

    // Fonts
    root.style.setProperty('--font-heading', settings.headingFont + ', cursive');
    root.style.setProperty('--font-body', settings.bodyFont + ', sans-serif');

    // Sizes
    root.style.setProperty('--heading-scale', headingSizeMap[settings.headingSize]);
    root.style.setProperty('--body-size', bodySizeMap[settings.bodySize]);
    root.style.setProperty('--section-spacing', sectionSpacingMap[settings.sectionSpacing]);
  }, [settings]);

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
    } catch (error) {
      console.error('Failed to save site settings:', error);
      // Revert on error
      setSettings(settings);
      throw error;
    }
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}
