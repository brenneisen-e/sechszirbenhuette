'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Save, Trash2, Plus, RefreshCw, ArrowLeft } from 'lucide-react';

interface TextCustomization {
  id?: number;
  section_key: string;
  text_de: string | null;
  text_en: string | null;
  font_size: string | null;
  font_color: string | null;
  font_family: string | null;
  font_weight: string | null;
}

// Vordefinierte Section Keys für die Homepage
const PREDEFINED_SECTIONS = [
  { key: 'hero.title', label: 'Hero - Titel', defaultDe: 'Willkommen in der Sechszirbenhütte', defaultEn: 'Welcome to Sechszirbenhütte' },
  { key: 'hero.subtitle', label: 'Hero - Untertitel', defaultDe: 'Luxus-Ferienhaus auf 1.700m Höhe', defaultEn: 'Luxury vacation home at 1,700m altitude' },
  { key: 'hero.description', label: 'Hero - Beschreibung', defaultDe: 'Erleben Sie Ruhe und Natur pur', defaultEn: 'Experience peace and nature' },
  { key: 'ferienhaus.title', label: 'Ferienhaus - Titel', defaultDe: 'Die Sechszirbenhütte', defaultEn: 'The Sechszirbenhütte' },
  { key: 'ferienhaus.intro', label: 'Ferienhaus - Einleitung', defaultDe: 'Unser gemütliches Ferienhaus bietet Platz für bis zu 10 Personen', defaultEn: 'Our cozy vacation home accommodates up to 10 people' },
  { key: 'umgebung.title', label: 'Umgebung - Titel', defaultDe: 'Umgebung & Aktivitäten', defaultEn: 'Surroundings & Activities' },
  { key: 'buchung.title', label: 'Buchung - Titel', defaultDe: 'Buchungsanfrage', defaultEn: 'Booking Request' },
];

const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Playfair Display',
  'Roboto',
  'Open Sans',
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi-Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra-Bold (800)' },
];

export default function TextCustomizationsAdmin() {
  const [customizations, setCustomizations] = useState<TextCustomization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Load customizations from API
  const loadCustomizations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/text-customizations');
      const data = await response.json();
      if (data.success) {
        setCustomizations(data.customizations || []);
      }
    } catch (error) {
      console.error('Error loading customizations:', error);
      alert('Fehler beim Laden der Textanpassungen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomizations();
  }, []);

  // Save or update a customization
  const saveCustomization = async (customization: TextCustomization) => {
    setSaving(customization.section_key);
    try {
      const response = await fetch('/api/admin/text-customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customization),
      });

      const data = await response.json();
      if (data.success) {
        await loadCustomizations(); // Reload to get updated data
        alert('Textanpassung gespeichert!');
      } else {
        alert('Fehler beim Speichern: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving customization:', error);
      alert('Fehler beim Speichern der Textanpassung');
    } finally {
      setSaving(null);
    }
  };

  // Delete a customization
  const deleteCustomization = async (sectionKey: string) => {
    if (!confirm('Möchten Sie diese Textanpassung wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/text-customizations?section_key=${encodeURIComponent(sectionKey)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await loadCustomizations();
        setSelectedSection(null);
        alert('Textanpassung gelöscht!');
      } else {
        alert('Fehler beim Löschen: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting customization:', error);
      alert('Fehler beim Löschen der Textanpassung');
    }
  };

  // Get customization for a section key
  const getCustomization = (sectionKey: string): TextCustomization | null => {
    return customizations.find(c => c.section_key === sectionKey) || null;
  };

  // Update local state
  const updateLocalCustomization = (sectionKey: string, field: keyof TextCustomization, value: string | null) => {
    setCustomizations(prev => {
      const existing = prev.find(c => c.section_key === sectionKey);
      if (existing) {
        return prev.map(c => c.section_key === sectionKey ? { ...c, [field]: value } : c);
      } else {
        const defaultSection = PREDEFINED_SECTIONS.find(s => s.key === sectionKey);
        return [...prev, {
          section_key: sectionKey,
          text_de: field === 'text_de' ? value : (defaultSection?.defaultDe || null),
          text_en: field === 'text_en' ? value : (defaultSection?.defaultEn || null),
          font_size: field === 'font_size' ? value : '1rem',
          font_color: field === 'font_color' ? value : '#000000',
          font_family: field === 'font_family' ? value : 'Inter',
          font_weight: field === 'font_weight' ? value : '400',
          [field]: value,
        }];
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-logo-green" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-logo-green hover:bg-gray-50 rounded-lg transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Zurück zum Admin-Panel</span>
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Textanpassungen</h1>
              <p className="text-gray-600 mt-2">
                Passen Sie die Texte auf der Homepage an. Änderungen werden sofort auf der Website sichtbar.
              </p>
            </div>
            <button
              onClick={loadCustomizations}
              className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Neu laden
            </button>
          </div>

          {/* Section Selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Wählen Sie einen Bereich aus:</label>
            <select
              value={selectedSection || ''}
              onChange={(e) => setSelectedSection(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
            >
              <option value="">-- Bereich auswählen --</option>
              {PREDEFINED_SECTIONS.map(section => (
                <option key={section.key} value={section.key}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editor */}
          {selectedSection && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.label || selectedSection}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const customization = getCustomization(selectedSection) || {
                        section_key: selectedSection,
                        text_de: PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.defaultDe || null,
                        text_en: PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.defaultEn || null,
                        font_size: '1rem',
                        font_color: '#000000',
                        font_family: 'Inter',
                        font_weight: '400',
                      };
                      saveCustomization(customization);
                    }}
                    disabled={saving === selectedSection}
                    className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving === selectedSection ? 'Speichern...' : 'Speichern'}
                  </button>
                  {getCustomization(selectedSection) && (
                    <button
                      onClick={() => deleteCustomization(selectedSection)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Löschen
                    </button>
                  )}
                </div>
              </div>

              {/* Text Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text (Deutsch)</label>
                  <textarea
                    value={getCustomization(selectedSection)?.text_de || PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.defaultDe || ''}
                    onChange={(e) => updateLocalCustomization(selectedSection, 'text_de', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
                    placeholder="Deutscher Text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text (Englisch)</label>
                  <textarea
                    value={getCustomization(selectedSection)?.text_en || PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.defaultEn || ''}
                    onChange={(e) => updateLocalCustomization(selectedSection, 'text_en', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
                    placeholder="Englischer Text"
                  />
                </div>
              </div>

              {/* Style Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schriftgröße</label>
                  <input
                    type="text"
                    value={getCustomization(selectedSection)?.font_size || '1rem'}
                    onChange={(e) => updateLocalCustomization(selectedSection, 'font_size', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
                    placeholder="z.B. 1.5rem, 24px"
                  />
                  <p className="text-xs text-gray-500 mt-1">z.B. 1.5rem, 24px, text-2xl</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={getCustomization(selectedSection)?.font_color || '#000000'}
                      onChange={(e) => updateLocalCustomization(selectedSection, 'font_color', e.target.value)}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getCustomization(selectedSection)?.font_color || '#000000'}
                      onChange={(e) => updateLocalCustomization(selectedSection, 'font_color', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schriftart</label>
                  <select
                    value={getCustomization(selectedSection)?.font_family || 'Inter'}
                    onChange={(e) => updateLocalCustomization(selectedSection, 'font_family', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
                  >
                    {FONT_FAMILIES.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schriftstärke</label>
                  <select
                    value={getCustomization(selectedSection)?.font_weight || '400'}
                    onChange={(e) => updateLocalCustomization(selectedSection, 'font_weight', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-transparent"
                  >
                    {FONT_WEIGHTS.map(weight => (
                      <option key={weight.value} value={weight.value}>
                        {weight.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview */}
              <div className="mt-6 p-6 bg-white rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Live-Vorschau</h3>
                <div
                  style={{
                    fontSize: getCustomization(selectedSection)?.font_size || '1rem',
                    color: getCustomization(selectedSection)?.font_color || '#000000',
                    fontFamily: getCustomization(selectedSection)?.font_family || 'Inter',
                    fontWeight: getCustomization(selectedSection)?.font_weight || '400',
                  }}
                >
                  <p className="mb-2">
                    <strong>DE:</strong> {getCustomization(selectedSection)?.text_de || PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.defaultDe || 'Deutscher Text'}
                  </p>
                  <p>
                    <strong>EN:</strong> {getCustomization(selectedSection)?.text_en || PREDEFINED_SECTIONS.find(s => s.key === selectedSection)?.defaultEn || 'English text'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overview List */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Übersicht aller Anpassungen</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bereich</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Text (DE)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schriftart</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Größe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customizations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Noch keine Textanpassungen vorhanden. Wählen Sie einen Bereich aus, um zu beginnen.
                      </td>
                    </tr>
                  ) : (
                    customizations.map(customization => (
                      <tr key={customization.section_key} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {PREDEFINED_SECTIONS.find(s => s.key === customization.section_key)?.label || customization.section_key}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {customization.text_de || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customization.font_family || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customization.font_size || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedSection(customization.section_key)}
                            className="text-logo-green hover:text-logo-green/80 font-medium"
                          >
                            Bearbeiten
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
