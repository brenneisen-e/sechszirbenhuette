'use client';

import { useState, useEffect } from 'react';
import {
  Type,
  Save,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Database,
  Smartphone,
  Monitor,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FontSizeResponsive {
  mobile: string;
  desktop: string;
}

interface ContentText {
  id: number;
  text_key: string;
  content: string;
  font_family: string | null;
  font_size: string | null; // Can be JSON string for responsive sizes
  color: string | null;
  padding: string | null;
  section: string;
  text_type: string;
  updated_at: string;
}

// Helper to parse font_size (can be plain number or JSON with mobile/desktop)
function parseFontSize(fontSizeStr: string | null): FontSizeResponsive | null {
  if (!fontSizeStr) return null;
  try {
    const parsed = JSON.parse(fontSizeStr);
    if (parsed.mobile && parsed.desktop) {
      return parsed as FontSizeResponsive;
    }
  } catch {
    // Not JSON, treat as single value for both
    return { mobile: fontSizeStr, desktop: fontSizeStr };
  }
  return { mobile: fontSizeStr, desktop: fontSizeStr };
}

// Helper to serialize font_size
function serializeFontSize(sizes: FontSizeResponsive): string {
  return JSON.stringify(sizes);
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (Startbereich)',
  introtext: 'Einleitungstexte',
  ferienhaus: 'Ausstattung & Komfort',
  galerie: 'Galerie',
  location: 'Anfahrt & Lage',
  umgebung: 'Umgebung & Aktivitäten',
  buchung: 'Buchung & Preise',
  bewertungen: 'Bewertungen',
  footer: 'Footer',
};

const TEXT_KEY_LABELS: Record<string, string> = {
  // Hero
  hero_title: 'Hauptüberschrift',
  hero_subtitle: 'Untertitel',
  hero_description: 'Beschreibungstext',
  // Introtext
  introtext_main_heading: 'Hauptüberschrift (Retro)',
  introtext_heading_1: 'Überschrift - Wandern & Skifahren',
  introtext_text_1: 'Text - Wandern & Skifahren',
  introtext_heading_2: 'Überschrift - Heidi Alm',
  introtext_text_2: 'Text - Heidi Alm',
  introtext_heading_3: 'Überschrift - Winterurlaub',
  introtext_text_3: 'Text - Winterurlaub',
  // Ferienhaus
  ferienhaus_title: 'Titel',
  ferienhaus_subtitle: 'Untertitel',
  ferienhaus_grundriss_title: 'Grundriss - Titel',
  ferienhaus_grundriss_description: 'Grundriss - Beschreibung',
  ferienhaus_wohnflaeche: 'Wohnfläche',
  ferienhaus_etagen: 'Etagen',
  // Galerie
  galerie_title: 'Titel',
  galerie_subtitle: 'Untertitel',
  // Location
  location_title: 'Titel',
  location_subtitle: 'Untertitel',
  location_maps_button: 'Google Maps Button',
  location_address_title: 'Adresse - Titel',
  location_directions_title: 'Anfahrt - Titel',
  location_directions_1: 'Anfahrt - Schritt 1',
  location_directions_2: 'Anfahrt - Schritt 2',
  location_directions_3: 'Anfahrt - Schritt 3',
  location_chains_warning: 'Schneeketten-Hinweis',
  location_contact_title: 'Kontakt - Titel',
  // Umgebung
  umgebung_title: 'Titel',
  umgebung_subtitle: 'Untertitel',
  // Buchung
  buchung_title: 'Titel',
  buchung_subtitle: 'Untertitel',
  buchung_preise_title: 'Preise - Titel',
  buchung_preise_base: 'Preise - Basispreis',
  buchung_nebensaison: 'Nebensaison',
  buchung_hauptsaison: 'Hauptsaison',
  buchung_mindestaufenthalt: 'Mindestaufenthalt',
  buchung_extras_title: 'Extras - Titel',
  buchung_extra_person: 'Extra - Person',
  buchung_extra_hund: 'Extra - Hund',
  buchung_extra_waesche: 'Extra - Wäsche',
  buchung_inklusive_title: 'Inklusive - Titel',
  buchung_kontakt_title: 'Kontakt - Titel',
  buchung_form_title: 'Formular - Titel',
  buchung_form_intro: 'Formular - Einleitung',
  buchung_check_button: 'Verfügbarkeit Button',
  // Bewertungen
  bewertungen_title: 'Titel',
  bewertungen_subtitle: 'Untertitel',
  // Footer
  footer_company: 'Firmenname',
  footer_description: 'Beschreibung',
  footer_contact_title: 'Kontakt - Titel',
  footer_legal_title: 'Rechtliches - Titel',
  footer_social_title: 'Social Media - Titel',
  footer_copyright: 'Copyright',
};

// Font options including GitHub fonts
const FONT_OPTIONS = [
  { value: 'FeelingPassionate', label: 'FeelingPassionate (Handschrift)' },
  { value: 'Autography', label: 'Autography (Signatur)' },
  { value: 'BrittanySignature', label: 'Brittany Signature' },
  { value: 'RetroSignature', label: 'Retro Signature' },
  { value: 'AdleryPro', label: 'Adlery Pro' },
  { value: 'system-ui', label: 'System (Standard)' },
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Arial', label: 'Arial (Sans-Serif)' },
];

const HEADING_SIZE_OPTIONS = [
  { value: '36', label: '36px' },
  { value: '42', label: '42px' },
  { value: '48', label: '48px' },
  { value: '56', label: '56px' },
  { value: '64', label: '64px' },
  { value: '72', label: '72px' },
  { value: '80', label: '80px' },
  { value: '96', label: '96px' },
];

const BODY_SIZE_OPTIONS = [
  { value: '12', label: '12px' },
  { value: '14', label: '14px' },
  { value: '16', label: '16px' },
  { value: '18', label: '18px' },
  { value: '20', label: '20px' },
  { value: '22', label: '22px' },
  { value: '24', label: '24px' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TextEditor() {
  const [contentTexts, setContentTexts] = useState<Record<string, ContentText>>({});
  const [contentTextsBySection, setContentTextsBySection] = useState<Record<string, ContentText[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTextKey, setEditingTextKey] = useState<string | null>(null);
  const [editingTextValues, setEditingTextValues] = useState<{
    content: string;
    font_family: string;
    font_size: string;
    font_size_mobile: string;
    font_size_desktop: string;
    color: string;
    padding: string;
  }>({ content: '', font_family: '', font_size: '', font_size_mobile: '', font_size_desktop: '', color: '', padding: '' });
  const [isSavingText, setIsSavingText] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Detect device type
  const [isMobile, setIsMobile] = useState(false);

  // Load content texts on mount
  useEffect(() => {
    loadContentTexts();
  }, []);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadContentTexts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/content-texts');
      const data = await response.json() as { texts?: Record<string, ContentText>; bySection?: Record<string, ContentText[]> };
      if (data.texts) setContentTexts(data.texts);
      if (data.bySection) setContentTextsBySection(data.bySection);
    } catch (err) {
      console.error('Error loading content texts:', err);
      setError('Fehler beim Laden der Texte');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Datenbank-Migration durchführen? Dies erstellt fehlende Tabellen und fügt Standard-Texte ein.')) return;
    setIsMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate', { method: 'POST' });
      const data = await response.json() as { message?: string; error?: string };
      if (response.ok) {
        setSuccess(data.message || 'Migration erfolgreich');
        await loadContentTexts();
      } else {
        throw new Error(data.error || 'Migration fehlgeschlagen');
      }
    } catch (err) {
      console.error('Migration error:', err);
      setError('Fehler bei der Migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const startEditingText = (text: ContentText) => {
    setEditingTextKey(text.text_key);
    const responsiveSizes = parseFontSize(text.font_size);
    setEditingTextValues({
      content: text.content,
      font_family: text.font_family || '',
      font_size: text.font_size || '',
      font_size_mobile: responsiveSizes?.mobile || '',
      font_size_desktop: responsiveSizes?.desktop || '',
      color: text.color || '',
      padding: text.padding || '',
    });
  };

  const saveContentText = async (textKey: string) => {
    const text = contentTexts[textKey];
    if (!text) return;

    setIsSavingText(true);
    try {
      // Build responsive font_size JSON if either mobile or desktop is set
      let fontSizeValue: string | null = null;
      if (editingTextValues.font_size_mobile || editingTextValues.font_size_desktop) {
        fontSizeValue = serializeFontSize({
          mobile: editingTextValues.font_size_mobile || editingTextValues.font_size_desktop || '',
          desktop: editingTextValues.font_size_desktop || editingTextValues.font_size_mobile || '',
        });
      }

      const response = await fetch('/api/content-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_key: textKey,
          content: editingTextValues.content,
          font_family: editingTextValues.font_family || null,
          font_size: fontSizeValue,
          color: editingTextValues.color || null,
          padding: editingTextValues.padding || null,
          section: text.section,
          text_type: text.text_type,
        }),
      });

      if (response.ok) {
        setSuccess('Text gespeichert');
        setEditingTextKey(null);
        await loadContentTexts();
      } else {
        throw new Error('Save failed');
      }
    } catch {
      setError('Fehler beim Speichern');
    } finally {
      setIsSavingText(false);
    }
  };

  const cancelEditing = () => {
    setEditingTextKey(null);
    setEditingTextValues({ content: '', font_family: '', font_size: '', font_size_mobile: '', font_size_desktop: '', color: '', padding: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-logo-green" />
        <span className="ml-3 text-gray-600">Lade Texteditor...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Texte & Schriftarten</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadContentTexts}
              className="p-2 text-gray-500 hover:text-logo-green transition"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={runMigration}
              disabled={isMigrating}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              {isMigrating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Migration
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <p className="text-sm text-gray-600">
          Bearbeiten Sie die Texte und Schriftarten für verschiedene Bereiche Ihrer Website.
        </p>
      </div>

      {/* Content by Section */}
      <div className="p-6 space-y-4">
        {Object.entries(SECTION_LABELS).map(([sectionKey, sectionLabel]) => {
          const sectionTexts = contentTextsBySection[sectionKey] || [];
          const isExpanded = expandedSection === sectionKey;

          return (
            <div key={sectionKey} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-800">{sectionLabel}</span>
                  <span className="text-sm text-gray-400">({sectionTexts.length} Texte)</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {sectionTexts.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Keine Texte in diesem Bereich. Führen Sie die Migration aus.</p>
                  ) : (
                    sectionTexts.map((text) => {
                      const isEditing = editingTextKey === text.text_key;
                      const label = TEXT_KEY_LABELS[text.text_key] || text.text_key;
                      const isHeading = text.text_type === 'heading';
                      const sizeOptions = isHeading ? HEADING_SIZE_OPTIONS : BODY_SIZE_OPTIONS;

                      return (
                        <div
                          key={text.text_key}
                          className={`border rounded-lg p-4 ${isEditing ? 'border-logo-green bg-green-50/30' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-800">{label}</h4>
                              <p className="text-xs text-gray-400">{text.text_key}</p>
                            </div>
                            {!isEditing && (
                              <button
                                onClick={() => startEditingText(text)}
                                className="text-sm text-logo-green hover:underline"
                              >
                                Bearbeiten
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-4">
                              {/* Content */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                                {isHeading ? (
                                  <input
                                    type="text"
                                    value={editingTextValues.content}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, content: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                                  />
                                ) : (
                                  <textarea
                                    value={editingTextValues.content}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, content: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                                  />
                                )}
                              </div>

                              {/* Font & Size */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Schriftart</label>
                                  <select
                                    value={editingTextValues.font_family}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, font_family: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                                  >
                                    <option value="">Standard</option>
                                    {FONT_OPTIONS.map(font => (
                                      <option key={font.value} value={font.value}>{font.label}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Schriftgröße (Responsiv)
                                  </label>
                                  {/* Device indicator */}
                                  <div className="flex items-center gap-2 mb-3 p-2 bg-gray-100 rounded-lg">
                                    {isMobile ? (
                                      <>
                                        <Smartphone className="w-4 h-4 text-logo-green" />
                                        <span className="text-sm text-gray-700">Du bearbeitest auf einem <strong className="text-logo-green">Mobilgerät</strong></span>
                                      </>
                                    ) : (
                                      <>
                                        <Monitor className="w-4 h-4 text-logo-green" />
                                        <span className="text-sm text-gray-700">Du bearbeitest auf einem <strong className="text-logo-green">Desktop</strong></span>
                                      </>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Mobile Size */}
                                    <div>
                                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                                        <Smartphone className="w-3.5 h-3.5" />
                                        Mobil
                                        {isMobile && <span className="text-logo-green">(aktuell)</span>}
                                      </label>
                                      <select
                                        value={editingTextValues.font_size_mobile}
                                        onChange={(e) => setEditingTextValues(v => ({ ...v, font_size_mobile: e.target.value }))}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green ${isMobile ? 'border-logo-green bg-logo-green/5' : 'border-gray-300'}`}
                                      >
                                        <option value="">Standard</option>
                                        {sizeOptions.map(size => (
                                          <option key={size.value} value={size.value}>{size.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* Desktop Size */}
                                    <div>
                                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                                        <Monitor className="w-3.5 h-3.5" />
                                        Desktop
                                        {!isMobile && <span className="text-logo-green">(aktuell)</span>}
                                      </label>
                                      <select
                                        value={editingTextValues.font_size_desktop}
                                        onChange={(e) => setEditingTextValues(v => ({ ...v, font_size_desktop: e.target.value }))}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green ${!isMobile ? 'border-logo-green bg-logo-green/5' : 'border-gray-300'}`}
                                      >
                                        <option value="">Standard</option>
                                        {sizeOptions.map(size => (
                                          <option key={size.value} value={size.value}>{size.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Die Größe wird je nach Bildschirmgröße automatisch angepasst
                                  </p>
                                </div>
                              </div>

                              {/* Color & Padding */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="color"
                                      value={editingTextValues.color || '#000000'}
                                      onChange={(e) => setEditingTextValues(v => ({ ...v, color: e.target.value }))}
                                      className="w-12 h-10 p-1 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={editingTextValues.color}
                                      onChange={(e) => setEditingTextValues(v => ({ ...v, color: e.target.value }))}
                                      placeholder="#000000"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Padding (px)</label>
                                  <input
                                    type="number"
                                    value={editingTextValues.padding}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, padding: e.target.value }))}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                                  />
                                </div>
                              </div>

                              {/* Preview */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Vorschau ({isMobile ? 'Mobil' : 'Desktop'})
                                </label>
                                <div
                                  className="p-4 bg-gray-100 rounded-lg overflow-hidden"
                                  style={{
                                    fontFamily: editingTextValues.font_family || 'inherit',
                                    fontSize: (isMobile ? editingTextValues.font_size_mobile : editingTextValues.font_size_desktop)
                                      ? `${isMobile ? editingTextValues.font_size_mobile : editingTextValues.font_size_desktop}px`
                                      : 'inherit',
                                    color: editingTextValues.color || 'inherit',
                                    padding: editingTextValues.padding ? `${editingTextValues.padding}px` : undefined,
                                  }}
                                >
                                  {editingTextValues.content || 'Vorschautext...'}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  onClick={() => saveContentText(text.text_key)}
                                  disabled={isSavingText}
                                  className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
                                >
                                  {isSavingText ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                  Speichern
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p
                                className="text-gray-600"
                                style={{
                                  fontFamily: text.font_family || 'inherit',
                                  fontSize: text.font_size ? `${Math.min(parseInt(text.font_size), 24)}px` : 'inherit',
                                  color: text.color || 'inherit',
                                }}
                              >
                                {text.content}
                              </p>
                              {(text.font_family || text.font_size) && (
                                <p className="text-xs text-gray-400 mt-2">
                                  {text.font_family && <span className="mr-2">Schrift: {text.font_family}</span>}
                                  {text.font_size && <span>Größe: {text.font_size}px</span>}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {Object.keys(contentTextsBySection).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Type className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Keine Texte vorhanden</p>
            <p className="text-sm">Führen Sie die Migration aus, um Standard-Texte zu erstellen.</p>
            <button
              onClick={runMigration}
              disabled={isMigrating}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
            >
              {isMigrating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Migration durchführen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
