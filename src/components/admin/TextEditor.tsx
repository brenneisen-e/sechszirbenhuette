'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Type,
  Save,
  RotateCcw,
  Palette,
  Minus,
  Plus,
  Check,
  X,
  Download,
  Upload,
  AlertCircle,
  Mountain,
  Home,
  MapPin,
  Sun,
  Snowflake,
  Heart,
  Image,
  Calendar,
  Mail,
  Bold,
  MousePointer,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface TextOverride {
  id: string;
  section: string;
  key: string;
  label: string;
  originalValue: string;
  currentValue: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
}

interface TextSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: TextOverride[];
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'sechszirben_text_overrides';

// ============================================
// Default sections with landing page text
// ============================================

function getDefaultSections(): TextSection[] {
  return [
    {
      id: 'hero',
      title: 'Hero / Startbereich',
      icon: Mountain,
      items: [
        { id: 'hero.welcomeTo', section: 'hero', key: 'welcomeTo', label: 'Willkommenstext', originalValue: 'Willkommen in der', currentValue: 'Willkommen in der', fontSize: 24, color: '', fontWeight: '' },
        { id: 'hero.title', section: 'hero', key: 'title', label: 'Haupttitel', originalValue: 'Sechszirbenhütte', currentValue: 'Sechszirbenhütte', fontSize: 48, color: '', fontWeight: 'bold' },
        { id: 'hero.subtitle', section: 'hero', key: 'subtitle', label: 'Untertitel', originalValue: 'Gemütliches Almhaus mit Sauna, Kamin und Vollausstattung auf 1800m', currentValue: 'Gemütliches Almhaus mit Sauna, Kamin und Vollausstattung auf 1800m', fontSize: 18, color: '', fontWeight: '' },
        { id: 'hero.cta', section: 'hero', key: 'checkAvailability', label: 'CTA-Button', originalValue: 'Buchung anfragen', currentValue: 'Buchung anfragen', fontSize: 16, color: '', fontWeight: 'bold' },
      ],
    },
    {
      id: 'features',
      title: 'Ausstattung & Komfort',
      icon: Home,
      items: [
        { id: 'features.title', section: 'features', key: 'title', label: 'Überschrift', originalValue: 'Ausstattung & Komfort', currentValue: 'Ausstattung & Komfort', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'features.subtitle', section: 'features', key: 'subtitle', label: 'Beschreibung', originalValue: 'Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.', currentValue: 'Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.', fontSize: 16, color: '', fontWeight: '' },
        { id: 'features.livingRoom.title', section: 'features', key: 'livingRoom.title', label: 'Wohnbereich', originalValue: 'Wohnbereich', currentValue: 'Wohnbereich', fontSize: 18, color: '', fontWeight: 'bold' },
        { id: 'features.kitchen.title', section: 'features', key: 'kitchen.title', label: 'Küche', originalValue: 'Küche', currentValue: 'Küche', fontSize: 18, color: '', fontWeight: 'bold' },
        { id: 'features.bedrooms.title', section: 'features', key: 'bedrooms.title', label: 'Schlafzimmer', originalValue: 'Schlafzimmer', currentValue: 'Schlafzimmer', fontSize: 18, color: '', fontWeight: 'bold' },
        { id: 'features.wellness.title', section: 'features', key: 'wellness.title', label: 'Sauna & Wellness', originalValue: 'Sauna & Wellness', currentValue: 'Sauna & Wellness', fontSize: 18, color: '', fontWeight: 'bold' },
        { id: 'features.bathroom.title', section: 'features', key: 'bathroom.title', label: 'Badezimmer', originalValue: 'Badezimmer', currentValue: 'Badezimmer', fontSize: 18, color: '', fontWeight: 'bold' },
        { id: 'features.outdoor.title', section: 'features', key: 'outdoor.title', label: 'Außenbereich', originalValue: 'Außenbereich', currentValue: 'Außenbereich', fontSize: 18, color: '', fontWeight: 'bold' },
      ],
    },
    {
      id: 'location',
      title: 'Lage & Anfahrt',
      icon: MapPin,
      items: [
        { id: 'location.title', section: 'location', key: 'title', label: 'Überschrift', originalValue: 'Lage & Anfahrt', currentValue: 'Lage & Anfahrt', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'location.subtitle', section: 'location', key: 'subtitle', label: 'Beschreibung', originalValue: 'Die Sechszirbenhütte liegt auf 1800m Höhe am Falkertsee in Kärnten, Österreich.', currentValue: 'Die Sechszirbenhütte liegt auf 1800m Höhe am Falkertsee in Kärnten, Österreich.', fontSize: 16, color: '', fontWeight: '' },
        { id: 'location.address', section: 'location', key: 'address', label: 'Adresse Titel', originalValue: 'Adresse', currentValue: 'Adresse', fontSize: 18, color: '', fontWeight: 'bold' },
        { id: 'location.addressDetails', section: 'location', key: 'addressDetails', label: 'Adresse Details', originalValue: 'Sechszirbenhütte\nFalkertsee\n9564 Patergassen\nKärnten, Österreich', currentValue: 'Sechszirbenhütte\nFalkertsee\n9564 Patergassen\nKärnten, Österreich', fontSize: 14, color: '', fontWeight: '' },
        { id: 'location.contact', section: 'location', key: 'contact', label: 'Kontakt Titel', originalValue: 'Kontakt', currentValue: 'Kontakt', fontSize: 18, color: '', fontWeight: 'bold' },
      ],
    },
    {
      id: 'summer',
      title: 'Sommerangebot',
      icon: Sun,
      items: [
        { id: 'summer.title', section: 'summer', key: 'title', label: 'Überschrift', originalValue: 'Sommerangebot', currentValue: 'Sommerangebot', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'summer.subtitle', section: 'summer', key: 'subtitle', label: 'Beschreibung', originalValue: 'Erleben Sie die herrliche Natur Kärntens! Kristallklare Badeseen, malerische Wanderwege durch die Nockberge und zahlreiche Sportmöglichkeiten erwarten Sie.', currentValue: 'Erleben Sie die herrliche Natur Kärntens! Kristallklare Badeseen, malerische Wanderwege durch die Nockberge und zahlreiche Sportmöglichkeiten erwarten Sie.', fontSize: 16, color: '', fontWeight: '' },
      ],
    },
    {
      id: 'winter',
      title: 'Winterangebot',
      icon: Snowflake,
      items: [
        { id: 'winter.title', section: 'winter', key: 'title', label: 'Überschrift', originalValue: 'Winterangebot', currentValue: 'Winterangebot', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'winter.subtitle', section: 'winter', key: 'subtitle', label: 'Beschreibung', originalValue: 'Erleben Sie den Winter in Kärnten! Skifahren am Falkert, Langlauf durch verschneite Wälder und Winterwandern in den Nockbergen.', currentValue: 'Erleben Sie den Winter in Kärnten! Skifahren am Falkert, Langlauf durch verschneite Wälder und Winterwandern in den Nockbergen.', fontSize: 16, color: '', fontWeight: '' },
      ],
    },
    {
      id: 'about',
      title: 'Über uns',
      icon: Heart,
      items: [
        { id: 'about.title', section: 'about', key: 'title', label: 'Überschrift', originalValue: 'Über uns', currentValue: 'Über uns', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'about.subtitle', section: 'about', key: 'subtitle', label: 'Untertitel', originalValue: 'Lernen Sie Ihre Gastgeber kennen', currentValue: 'Lernen Sie Ihre Gastgeber kennen', fontSize: 16, color: '', fontWeight: '' },
        { id: 'about.familyName', section: 'about', key: 'familyName', label: 'Gastgeber Name', originalValue: 'Familie Brenneisen', currentValue: 'Familie Brenneisen', fontSize: 20, color: '', fontWeight: 'bold' },
        { id: 'about.welcomeTitle', section: 'about', key: 'welcomeTitle', label: 'Willkommen Titel', originalValue: 'Herzlich willkommen!', currentValue: 'Herzlich willkommen!', fontSize: 24, color: '', fontWeight: 'bold' },
        { id: 'about.intro', section: 'about', key: 'intro', label: 'Einleitungstext', originalValue: 'Wir sind Ronald und Petra Brenneisen und freuen uns, dass Sie sich für unsere Sechszirbenhütte interessieren.', currentValue: 'Wir sind Ronald und Petra Brenneisen und freuen uns, dass Sie sich für unsere Sechszirbenhütte interessieren.', fontSize: 16, color: '', fontWeight: '' },
      ],
    },
    {
      id: 'gallery',
      title: 'Galerie',
      icon: Image,
      items: [
        { id: 'gallery.title', section: 'gallery', key: 'title', label: 'Überschrift', originalValue: 'Galerie', currentValue: 'Galerie', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'gallery.subtitle', section: 'gallery', key: 'subtitle', label: 'Beschreibung', originalValue: 'Entdecken Sie unsere Hütte in Bildern', currentValue: 'Entdecken Sie unsere Hütte in Bildern', fontSize: 16, color: '', fontWeight: '' },
        { id: 'gallery.pileTitle', section: 'gallery', key: 'pileTitle', label: 'Fotostapel Titel', originalValue: 'Eindrücke aus der Sechszirbenhütte', currentValue: 'Eindrücke aus der Sechszirbenhütte', fontSize: 28, color: '', fontWeight: 'bold' },
        { id: 'gallery.pileDescription', section: 'gallery', key: 'pileDescription', label: 'Fotostapel Text', originalValue: 'Gemütliche Almhaus-Atmosphäre auf 1800m', currentValue: 'Gemütliche Almhaus-Atmosphäre auf 1800m', fontSize: 16, color: '', fontWeight: '' },
      ],
    },
    {
      id: 'booking',
      title: 'Buchung',
      icon: Calendar,
      items: [
        { id: 'booking.title', section: 'booking', key: 'title', label: 'Überschrift', originalValue: 'Jetzt buchen', currentValue: 'Jetzt buchen', fontSize: 32, color: '', fontWeight: 'bold' },
        { id: 'booking.subtitle', section: 'booking', key: 'subtitle', label: 'Beschreibung', originalValue: 'Sichern Sie sich Ihren Traumurlaub in den Bergen', currentValue: 'Sichern Sie sich Ihren Traumurlaub in den Bergen', fontSize: 16, color: '', fontWeight: '' },
        { id: 'booking.price', section: 'booking', key: 'price', label: 'Preis', originalValue: '130 €', currentValue: '130 €', fontSize: 36, color: '#2d5016', fontWeight: 'bold' },
        { id: 'booking.perNight', section: 'booking', key: 'perNight', label: 'Pro Nacht', originalValue: 'pro Nacht', currentValue: 'pro Nacht', fontSize: 14, color: '', fontWeight: '' },
      ],
    },
    {
      id: 'footer',
      title: 'Footer',
      icon: Mail,
      items: [
        { id: 'footer.contact', section: 'footer', key: 'contact', label: 'Kontakt Titel', originalValue: 'Kontakt', currentValue: 'Kontakt', fontSize: 18, color: '#ffffff', fontWeight: 'bold' },
        { id: 'footer.quickLinks', section: 'footer', key: 'quickLinks', label: 'Schnelllinks', originalValue: 'Schnelllinks', currentValue: 'Schnelllinks', fontSize: 18, color: '#ffffff', fontWeight: 'bold' },
        { id: 'footer.location', section: 'footer', key: 'location', label: 'Standort', originalValue: 'Standort', currentValue: 'Standort', fontSize: 18, color: '#ffffff', fontWeight: 'bold' },
        { id: 'footer.copyright', section: 'footer', key: 'copyright', label: 'Copyright', originalValue: '© 2025 Sechszirbenhütte. Alle Rechte vorbehalten.', currentValue: '© 2025 Sechszirbenhütte. Alle Rechte vorbehalten.', fontSize: 12, color: '#d1d5db', fontWeight: '' },
      ],
    },
  ];
}

// ============================================
// Storage helpers
// ============================================

function loadOverrides(): Record<string, Partial<TextOverride>> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

function saveOverrides(overrides: Record<string, Partial<TextOverride>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

// ============================================
// Section background configs for live preview
// ============================================

const SECTION_STYLES: Record<string, { bg: string; textColor: string; previewBg?: string }> = {
  hero: { bg: 'bg-gradient-to-b from-gray-800 to-gray-900', textColor: 'text-white', previewBg: 'bg-gray-900' },
  features: { bg: 'bg-gray-50', textColor: 'text-gray-900' },
  location: { bg: 'bg-white', textColor: 'text-gray-900' },
  summer: { bg: 'bg-white', textColor: 'text-gray-900' },
  winter: { bg: 'bg-gray-50', textColor: 'text-gray-900' },
  about: { bg: 'bg-gradient-to-b from-white to-gray-50', textColor: 'text-gray-900' },
  gallery: { bg: 'bg-white', textColor: 'text-gray-900' },
  booking: { bg: 'bg-white', textColor: 'text-gray-900' },
  footer: { bg: 'bg-[#1a3a0f]', textColor: 'text-white' },
};

// ============================================
// Live Preview Section Component
// ============================================

function PreviewSection({
  section,
  selectedId,
  onSelect,
}: {
  section: TextSection;
  selectedId: string | null;
  onSelect: (item: TextOverride) => void;
}) {
  const style = SECTION_STYLES[section.id] || { bg: 'bg-white', textColor: 'text-gray-900' };
  const Icon = section.icon;

  return (
    <div className={`${style.bg} relative`}>
      {/* Section label */}
      <div className="absolute top-2 left-2 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/30 text-white text-[9px] font-medium backdrop-blur-sm">
          <Icon className="w-2.5 h-2.5" />
          {section.title}
        </span>
      </div>

      {/* Section content preview */}
      <div className={`px-6 pt-8 pb-6 ${style.textColor}`}>
        {/* Hero gets special centered treatment */}
        {section.id === 'hero' ? (
          <div className="text-center py-6">
            {section.items.map(item => (
              <PreviewTextElement
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
                className={item.key === 'checkAvailability'
                  ? 'inline-block mt-3 bg-white/90 text-gray-900 px-4 py-1.5 rounded-lg'
                  : ''
                }
              />
            ))}
          </div>
        ) : section.id === 'features' ? (
          <div>
            {section.items.slice(0, 2).map(item => (
              <PreviewTextElement
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
                className="text-center"
              />
            ))}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {section.items.slice(2).map(item => (
                <div key={item.id} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100">
                  <PreviewTextElement
                    item={item}
                    isSelected={selectedId === item.id}
                    onClick={() => onSelect(item)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : section.id === 'footer' ? (
          <div>
            <div className="grid grid-cols-3 gap-3">
              {section.items.slice(0, 3).map(item => (
                <PreviewTextElement
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => onSelect(item)}
                />
              ))}
            </div>
            {section.items[3] && (
              <div className="border-t border-white/20 mt-3 pt-3 text-center">
                <PreviewTextElement
                  item={section.items[3]}
                  isSelected={selectedId === section.items[3].id}
                  onClick={() => onSelect(section.items[3])}
                />
              </div>
            )}
          </div>
        ) : section.id === 'booking' ? (
          <div className="text-center">
            {section.items.slice(0, 2).map(item => (
              <PreviewTextElement
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
              />
            ))}
            <div className="inline-flex items-baseline gap-1 mt-2 bg-primary/10 rounded-lg px-4 py-2 border border-primary/20">
              <span className="text-[10px] text-gray-500">ab</span>
              {section.items[2] && (
                <PreviewTextElement
                  item={section.items[2]}
                  isSelected={selectedId === section.items[2].id}
                  onClick={() => onSelect(section.items[2])}
                />
              )}
              {section.items[3] && (
                <PreviewTextElement
                  item={section.items[3]}
                  isSelected={selectedId === section.items[3].id}
                  onClick={() => onSelect(section.items[3])}
                />
              )}
            </div>
          </div>
        ) : section.id === 'about' ? (
          <div>
            {section.items.slice(0, 2).map(item => (
              <PreviewTextElement
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
                className="text-center"
              />
            ))}
            <div className="flex gap-4 mt-3">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                {section.items.slice(2).map(item => (
                  <PreviewTextElement
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onClick={() => onSelect(item)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Default: title + subtitle + extra items */
          <div>
            {section.items.slice(0, 2).map(item => (
              <PreviewTextElement
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
                className="text-center"
              />
            ))}
            {section.items.length > 2 && (
              <div className="mt-3 space-y-1">
                {section.items.slice(2).map(item => (
                  <PreviewTextElement
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onClick={() => onSelect(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Preview text element (clickable)
// ============================================

function PreviewTextElement({
  item,
  isSelected,
  onClick,
  className = '',
}: {
  item: TextOverride;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}) {
  const isChanged = item.currentValue !== item.originalValue;
  // Scale font sizes down for the mini preview (roughly 40% of original)
  const previewFontSize = Math.max(9, Math.min((item.fontSize || 16) * 0.4, 22));

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`
        relative cursor-pointer rounded px-1.5 py-0.5 transition-all
        ${isSelected
          ? 'ring-2 ring-indigo-500 bg-indigo-500/10'
          : 'hover:ring-1 hover:ring-indigo-300 hover:bg-indigo-500/5'
        }
        ${isChanged ? 'ring-1 ring-amber-400/60' : ''}
        ${className}
      `}
    >
      <span
        style={{
          fontSize: `${previewFontSize}px`,
          color: item.color || 'inherit',
          fontWeight: item.fontWeight || 'normal',
          lineHeight: 1.3,
          display: 'block',
          whiteSpace: item.currentValue.includes('\n') ? 'pre-line' : 'normal',
        }}
      >
        {item.currentValue}
      </span>
      {isChanged && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
      )}
    </div>
  );
}

// ============================================
// Main TextEditor Component
// ============================================

export default function TextEditor() {
  const [sections, setSections] = useState<TextSection[]>([]);
  const [selectedItem, setSelectedItem] = useState<TextOverride | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editFontSize, setEditFontSize] = useState(16);
  const [editColor, setEditColor] = useState('');
  const [editFontWeight, setEditFontWeight] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize sections with saved overrides
  useEffect(() => {
    const defaults = getDefaultSections();
    const overrides = loadOverrides();
    const merged = defaults.map(section => ({
      ...section,
      items: section.items.map(item => {
        const override = overrides[item.id];
        if (override) {
          return {
            ...item,
            currentValue: override.currentValue ?? item.currentValue,
            fontSize: override.fontSize ?? item.fontSize,
            color: override.color ?? item.color,
            fontWeight: override.fontWeight ?? item.fontWeight,
          };
        }
        return item;
      }),
    }));
    setSections(merged);
    setHasChanges(Object.keys(overrides).length > 0);
  }, []);

  // When selecting an item, populate the edit fields
  const selectItem = (item: TextOverride) => {
    setSelectedItem(item);
    setEditValue(item.currentValue);
    setEditFontSize(item.fontSize || 16);
    setEditColor(item.color || '');
    setEditFontWeight(item.fontWeight || '');
  };

  // Apply changes to the selected item
  const applyEdit = () => {
    if (!selectedItem) return;
    setSections(prev => prev.map(section => ({
      ...section,
      items: section.items.map(item => {
        if (item.id === selectedItem.id) {
          return { ...item, currentValue: editValue, fontSize: editFontSize, color: editColor, fontWeight: editFontWeight };
        }
        return item;
      }),
    })));
    setSelectedItem(prev => prev ? { ...prev, currentValue: editValue, fontSize: editFontSize, color: editColor, fontWeight: editFontWeight } : null);
    setHasChanges(true);
  };

  // Reset a single item
  const resetItem = () => {
    if (!selectedItem) return;
    const defaults = getDefaultSections();
    let def: TextOverride | undefined;
    for (const s of defaults) { def = s.items.find(i => i.id === selectedItem.id); if (def) break; }
    if (!def) return;
    setEditValue(def.originalValue);
    setEditFontSize(def.fontSize || 16);
    setEditColor(def.color || '');
    setEditFontWeight(def.fontWeight || '');
    setSections(prev => prev.map(section => ({
      ...section,
      items: section.items.map(item => item.id === selectedItem.id ? { ...def!, currentValue: def!.originalValue } : item),
    })));
    setSelectedItem({ ...def, currentValue: def.originalValue });
    setHasChanges(true);
  };

  // Save all to localStorage
  const saveAllChanges = () => {
    const overrides: Record<string, Partial<TextOverride>> = {};
    const defaults = getDefaultSections();
    for (const section of sections) {
      for (const item of section.items) {
        const defSection = defaults.find(s => s.id === section.id);
        const defItem = defSection?.items.find(i => i.id === item.id);
        if (
          item.currentValue !== defItem?.originalValue ||
          (item.color && item.color !== (defItem?.color || '')) ||
          (item.fontSize && item.fontSize !== (defItem?.fontSize || 16)) ||
          (item.fontWeight && item.fontWeight !== (defItem?.fontWeight || ''))
        ) {
          overrides[item.id] = { currentValue: item.currentValue, fontSize: item.fontSize, color: item.color, fontWeight: item.fontWeight };
        }
      }
    }
    saveOverrides(overrides);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Reset all
  const resetAll = () => {
    if (!confirm('Alle Textänderungen zurücksetzen?')) return;
    localStorage.removeItem(STORAGE_KEY);
    const defaults = getDefaultSections();
    setSections(defaults);
    setSelectedItem(null);
    setHasChanges(false);
  };

  // Export / Import
  const exportChanges = () => {
    const overrides: Record<string, Partial<TextOverride>> = {};
    const defaults = getDefaultSections();
    for (const section of sections) {
      for (const item of section.items) {
        const defItem = defaults.flatMap(s => s.items).find(i => i.id === item.id);
        if (item.currentValue !== defItem?.originalValue) {
          overrides[item.id] = { currentValue: item.currentValue, fontSize: item.fontSize, color: item.color, fontWeight: item.fontWeight };
        }
      }
    }
    const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `texteditor-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChanges = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const overrides = JSON.parse(event.target?.result as string);
          saveOverrides(overrides);
          const defaults = getDefaultSections();
          const merged = defaults.map(section => ({
            ...section,
            items: section.items.map(item => {
              const override = overrides[item.id];
              return override ? { ...item, ...override } : item;
            }),
          }));
          setSections(merged);
          setHasChanges(true);
          setSelectedItem(null);
        } catch { alert('Fehler beim Importieren.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const changeCount = sections.reduce((c, s) => c + s.items.filter(i => i.currentValue !== i.originalValue).length, 0);

  // Find the section of the currently selected item
  const selectedSection = selectedItem ? sections.find(s => s.items.some(i => i.id === selectedItem.id)) : null;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Type className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Texteditor</h2>
              <p className="text-xs text-gray-500">Website-Texte bearbeiten. Klicke links auf einen Text.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {changeCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                {changeCount}
              </span>
            )}
            <button onClick={exportChanges} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" title="Export">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={importChanges} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" title="Import">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={resetAll} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Alles zurücksetzen">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={saveAllChanges}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Speichern
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2 text-sm text-green-800">
            <Check className="w-4 h-4" />
            Gespeichert!
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          <strong>Hinweis:</strong> Änderungen werden lokal gespeichert und sind nur im Admin-Bereich sichtbar, nicht auf der Live-Website.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {/* LEFT: Live preview */}
        <div
          ref={previewRef}
          className="flex-1 bg-white rounded-xl shadow-sm overflow-y-auto border border-gray-200"
        >
          {/* Fake browser chrome */}
          <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded px-3 py-0.5 text-[10px] text-gray-400 font-mono">
              sechszirbenhuette.de
            </div>
            <div className="flex items-center gap-1 text-[9px] text-gray-400">
              <MousePointer className="w-3 h-3" />
              Klicken zum Bearbeiten
            </div>
          </div>

          {/* Rendered sections */}
          <div className="divide-y divide-gray-100">
            {sections.map(section => (
              <PreviewSection
                key={section.id}
                section={section}
                selectedId={selectedItem?.id || null}
                onSelect={selectItem}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Editor panel */}
        <div className="w-[380px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto flex flex-col">
          {selectedItem ? (
            <>
              {/* Editor header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedSection && (() => {
                        const SIcon = selectedSection.icon;
                        return <SIcon className="w-4 h-4 text-gray-400" />;
                      })()}
                      <span className="text-xs text-gray-500">{selectedSection?.title}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mt-0.5">{selectedItem.label}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor body */}
              <div className="flex-1 p-4 space-y-4">
                {/* Text input */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Text</label>
                  {editValue.includes('\n') || editValue.length > 60 ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  )}
                </div>

                {/* Font size */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Schriftgröße</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditFontSize(Math.max(8, editFontSize - 1))}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={editFontSize}
                      onChange={(e) => setEditFontSize(Math.min(72, Math.max(8, parseInt(e.target.value) || 8)))}
                      className="w-16 text-center px-2 py-1 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      onClick={() => setEditFontSize(Math.min(72, editFontSize + 1))}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-400">px</span>
                    <input
                      type="range"
                      min={8}
                      max={72}
                      value={editFontSize}
                      onChange={(e) => setEditFontSize(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Farbe</label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={editColor || '#000000'}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                      />
                    </div>
                    <input
                      type="text"
                      value={editColor || ''}
                      onChange={(e) => setEditColor(e.target.value)}
                      placeholder="Standard"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    {editColor && (
                      <button
                        onClick={() => setEditColor('')}
                        className="px-2 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Font weight */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Schriftstärke</label>
                  <div className="flex gap-1">
                    {[
                      { value: 'light', label: 'Leicht' },
                      { value: '', label: 'Normal' },
                      { value: 'bold', label: 'Fett' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setEditFontWeight(opt.value)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          editFontWeight === opt.value
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={{ fontWeight: opt.value || 'normal' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Vorschau</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[60px] flex items-center justify-center">
                    <span
                      style={{
                        fontSize: `${Math.min(editFontSize, 32)}px`,
                        color: editColor || 'inherit',
                        fontWeight: editFontWeight || 'normal',
                        lineHeight: 1.4,
                        textAlign: 'center',
                        whiteSpace: editValue.includes('\n') ? 'pre-line' : 'normal',
                      }}
                    >
                      {editValue || '(leer)'}
                    </span>
                  </div>
                </div>

                {/* Original text (if changed) */}
                {selectedItem.currentValue !== selectedItem.originalValue && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs text-amber-700 mb-1 font-medium">Original:</p>
                    <p className="text-xs text-amber-600 line-through">{selectedItem.originalValue}</p>
                  </div>
                )}
              </div>

              {/* Editor footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
                {selectedItem.currentValue !== selectedItem.originalValue && (
                  <button
                    onClick={resetItem}
                    className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Zurücksetzen
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  onClick={applyEdit}
                  className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 font-medium"
                >
                  <Check className="w-3 h-3" />
                  Übernehmen
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <MousePointer className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Text auswählen</h3>
              <p className="text-sm text-gray-500 max-w-[240px]">
                Klicke auf einen Text in der Vorschau links, um ihn hier zu bearbeiten.
              </p>

              {/* Quick section overview */}
              <div className="mt-8 w-full space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Sektionen</p>
                {sections.map(section => {
                  const Icon = section.icon;
                  const changedCount = section.items.filter(i => i.currentValue !== i.originalValue).length;
                  return (
                    <button
                      key={section.id}
                      onClick={() => selectItem(section.items[0])}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 flex-1">{section.title}</span>
                      <span className="text-xs text-gray-400">{section.items.length}</span>
                      {changedCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
