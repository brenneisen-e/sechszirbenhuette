'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TextCustomization {
  id?: number;
  section_key: string;
  text_de: string | null;
  text_en: string | null;
  font_size: string | null;
  font_color: string | null;
  font_family: string | null;
  font_weight: string | null;
}

interface TextCustomizationContextType {
  customizations: TextCustomization[];
  loading: boolean;
  getCustomization: (sectionKey: string) => TextCustomization | null;
  getText: (sectionKey: string, language: 'de' | 'en', fallback?: string) => string;
  getStyle: (sectionKey: string) => React.CSSProperties;
  reload: () => Promise<void>;
}

const TextCustomizationContext = createContext<TextCustomizationContextType | undefined>(undefined);

export function TextCustomizationProvider({ children }: { children: ReactNode }) {
  const [customizations, setCustomizations] = useState<TextCustomization[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomizations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/text-customizations');
      const data = await response.json();
      if (data.success) {
        setCustomizations(data.customizations || []);
      }
    } catch (error) {
      console.error('Error loading text customizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomizations();
  }, []);

  const getCustomization = (sectionKey: string): TextCustomization | null => {
    return customizations.find(c => c.section_key === sectionKey) || null;
  };

  const getText = (sectionKey: string, language: 'de' | 'en', fallback?: string): string => {
    const customization = getCustomization(sectionKey);
    if (!customization) {
      return fallback || '';
    }
    return (language === 'de' ? customization.text_de : customization.text_en) || fallback || '';
  };

  const getStyle = (sectionKey: string): React.CSSProperties => {
    const customization = getCustomization(sectionKey);
    if (!customization) {
      return {};
    }

    const style: React.CSSProperties = {};

    if (customization.font_size) {
      style.fontSize = customization.font_size;
    }
    if (customization.font_color) {
      style.color = customization.font_color;
    }
    if (customization.font_family) {
      style.fontFamily = customization.font_family;
    }
    if (customization.font_weight) {
      style.fontWeight = customization.font_weight;
    }

    return style;
  };

  return (
    <TextCustomizationContext.Provider
      value={{
        customizations,
        loading,
        getCustomization,
        getText,
        getStyle,
        reload: loadCustomizations,
      }}
    >
      {children}
    </TextCustomizationContext.Provider>
  );
}

export function useTextCustomization() {
  const context = useContext(TextCustomizationContext);
  if (context === undefined) {
    throw new Error('useTextCustomization must be used within a TextCustomizationProvider');
  }
  return context;
}
