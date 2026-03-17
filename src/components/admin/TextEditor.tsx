'use client';

import { useState, useEffect } from 'react';
import {
  Type,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Database,
  Eye,
} from 'lucide-react';
import { SECTION_LABELS, TEXT_KEY_LABELS } from './text-editor/types';
import type { ContentText, EditingTextValues } from './text-editor/types';
import { parseFontSize, serializeFontSize } from './text-editor/utils';
import PreviewModal from './text-editor/PreviewModal';
import TextEditorForm from './text-editor/TextEditorForm';

const EMPTY_EDITING_VALUES: EditingTextValues = {
  content: '',
  font_family: '',
  font_size: '',
  font_size_mobile: '',
  font_size_desktop: '',
  color: '',
  padding: '',
};

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
  const [editingTextValues, setEditingTextValues] = useState<EditingTextValues>(EMPTY_EDITING_VALUES);
  const [isSavingText, setIsSavingText] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [isInteractivePreview, setIsInteractivePreview] = useState(true);
  const [selectedTextKeyFromPreview, setSelectedTextKeyFromPreview] = useState<string | null>(null);

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

  // Listen for text selection from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ADMIN_TEXT_SELECTED') {
        const textKey = event.data.textKey;
        setSelectedTextKeyFromPreview(textKey);

        // Find the text and its section
        const text = contentTexts[textKey];
        if (text) {
          // Expand the section and start editing
          setExpandedSection(text.section);
          startEditingText(text);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [contentTexts]);

  // Send live updates to preview iframe when editing values change
  useEffect(() => {
    if (!editingTextKey || !showPreview || !isInteractivePreview) return;

    // Get the iframe and send the update
    const iframe = document.querySelector('iframe[title="Homepage Vorschau"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'ADMIN_TEXT_UPDATE',
        textKey: editingTextKey,
        content: editingTextValues.content,
        fontFamily: editingTextValues.font_family,
        fontSize: editingTextValues.font_size_desktop || editingTextValues.font_size_mobile,
        color: editingTextValues.color,
        padding: editingTextValues.padding,
      }, '*');
    }
  }, [editingTextKey, editingTextValues, showPreview, isInteractivePreview]);

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
    setEditingTextValues(EMPTY_EDITING_VALUES);
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
              onClick={() => {
                setPreviewKey(k => k + 1);
                setShowPreview(true);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition"
              title="Live-Vorschau"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Live-Vorschau</span>
            </button>
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
                            <TextEditorForm
                              text={text}
                              editingTextValues={editingTextValues}
                              isSavingText={isSavingText}
                              isMobile={isMobile}
                              onValuesChange={setEditingTextValues}
                              onSave={saveContentText}
                              onCancel={cancelEditing}
                            />
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

      {/* Live Preview Modal */}
      {showPreview && (
        <PreviewModal
          previewKey={previewKey}
          isInteractivePreview={isInteractivePreview}
          editingTextKey={editingTextKey}
          editingTextValues={editingTextValues}
          contentTexts={contentTexts}
          isSavingText={isSavingText}
          onClose={() => setShowPreview(false)}
          onRefresh={() => setPreviewKey(k => k + 1)}
          onToggleInteractive={() => setIsInteractivePreview(!isInteractivePreview)}
          onCancelEditing={cancelEditing}
          onSave={async () => {
            if (editingTextKey) {
              await saveContentText(editingTextKey);
              setPreviewKey(k => k + 1); // Refresh preview after save
            }
          }}
          onEditingValuesChange={setEditingTextValues}
          onClearSelectedFromPreview={() => setSelectedTextKeyFromPreview(null)}
        />
      )}
    </div>
  );
}
