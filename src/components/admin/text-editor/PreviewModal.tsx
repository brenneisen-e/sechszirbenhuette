'use client';

import {
  Eye,
  RefreshCw,
  ExternalLink,
  X,
  MousePointerClick,
  Smartphone,
  Monitor,
  Save,
  Loader2,
} from 'lucide-react';
import { FONT_OPTIONS, HEADING_SIZE_OPTIONS, BODY_SIZE_OPTIONS, TEXT_KEY_LABELS } from './types';
import type { ContentText, EditingTextValues } from './types';

interface PreviewModalProps {
  previewKey: number;
  isInteractivePreview: boolean;
  editingTextKey: string | null;
  editingTextValues: EditingTextValues;
  contentTexts: Record<string, ContentText>;
  isSavingText: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToggleInteractive: () => void;
  onCancelEditing: () => void;
  onSave: () => Promise<void>;
  onEditingValuesChange: (updater: (prev: EditingTextValues) => EditingTextValues) => void;
  onClearSelectedFromPreview: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PreviewModal({
  previewKey,
  isInteractivePreview,
  editingTextKey,
  editingTextValues,
  contentTexts,
  isSavingText,
  onClose,
  onRefresh,
  onToggleInteractive,
  onCancelEditing,
  onSave,
  onEditingValuesChange,
  onClearSelectedFromPreview,
}: PreviewModalProps) {
  const editingText = editingTextKey ? contentTexts[editingTextKey] : null;
  const label = editingText ? (TEXT_KEY_LABELS[editingText.text_key] || editingText.text_key) : '';
  const isHeading = editingText?.text_type === 'heading';
  const sizeOptions = isHeading ? HEADING_SIZE_OPTIONS : BODY_SIZE_OPTIONS;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-logo-green" />
            <h3 className="font-semibold text-gray-900">Live-Vorschau der Homepage</h3>
            {isInteractivePreview && (
              <span className="px-2 py-0.5 text-xs font-medium bg-logo-green/10 text-logo-green rounded-full">
                Interaktiv
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleInteractive}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
                isInteractivePreview
                  ? 'bg-logo-green text-white hover:bg-logo-green/90'
                  : 'text-gray-600 hover:text-logo-green hover:bg-gray-100'
              }`}
              title={isInteractivePreview ? 'Interaktiver Modus aktiv - Texte anklicken zum Bearbeiten' : 'Interaktiven Modus aktivieren'}
            >
              <MousePointerClick className="w-4 h-4" />
              <span className="hidden sm:inline">{isInteractivePreview ? 'Klick-Modus' : 'Nur Ansicht'}</span>
            </button>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-logo-green transition rounded-lg hover:bg-gray-100"
              title="Vorschau aktualisieren"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Aktualisieren</span>
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-logo-green transition rounded-lg hover:bg-gray-100"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">In neuem Tab</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area with iframe and optional edit panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* iframe Container */}
          <div className={`flex-1 relative bg-gray-100 ${editingTextKey && isInteractivePreview ? 'border-r border-gray-200' : ''}`}>
            <iframe
              key={`${previewKey}-${isInteractivePreview}`}
              src={`/?preview=1${isInteractivePreview ? '&interactive=1' : ''}`}
              className="absolute inset-0 w-full h-full border-0"
              title="Homepage Vorschau"
            />
          </div>

          {/* Edit Panel - shown when a text is selected in interactive mode */}
          {editingTextKey && editingText && isInteractivePreview && (
            <div className="w-96 bg-white flex flex-col overflow-hidden">
              {/* Edit Panel Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{label}</h4>
                    <p className="text-xs text-gray-500">{editingTextKey}</p>
                  </div>
                  <button
                    onClick={() => {
                      onCancelEditing();
                      onClearSelectedFromPreview();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Edit Panel Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                  {isHeading ? (
                    <input
                      type="text"
                      value={editingTextValues.content}
                      onChange={(e) => onEditingValuesChange(v => ({ ...v, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green text-sm"
                    />
                  ) : (
                    <textarea
                      value={editingTextValues.content}
                      onChange={(e) => onEditingValuesChange(v => ({ ...v, content: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green text-sm"
                    />
                  )}
                </div>

                {/* Font */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schriftart</label>
                  <select
                    value={editingTextValues.font_family}
                    onChange={(e) => onEditingValuesChange(v => ({ ...v, font_family: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green text-sm"
                  >
                    <option value="">Standard</option>
                    {FONT_OPTIONS.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>

                {/* Size (Responsive) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schriftgröße</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Smartphone className="w-3 h-3" /> Mobil
                      </label>
                      <select
                        value={editingTextValues.font_size_mobile}
                        onChange={(e) => onEditingValuesChange(v => ({ ...v, font_size_mobile: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Standard</option>
                        {sizeOptions.map(size => (
                          <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Monitor className="w-3 h-3" /> Desktop
                      </label>
                      <select
                        value={editingTextValues.font_size_desktop}
                        onChange={(e) => onEditingValuesChange(v => ({ ...v, font_size_desktop: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Standard</option>
                        {sizeOptions.map(size => (
                          <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingTextValues.color || '#000000'}
                      onChange={(e) => onEditingValuesChange(v => ({ ...v, color: e.target.value }))}
                      className="w-10 h-9 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingTextValues.color}
                      onChange={(e) => onEditingValuesChange(v => ({ ...v, color: e.target.value }))}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorschau</label>
                  <div
                    className="p-3 bg-gray-100 rounded-lg text-sm overflow-hidden"
                    style={{
                      fontFamily: editingTextValues.font_family || 'inherit',
                      fontSize: editingTextValues.font_size_desktop
                        ? `${Math.min(parseInt(editingTextValues.font_size_desktop), 24)}px`
                        : 'inherit',
                      color: editingTextValues.color || 'inherit',
                    }}
                  >
                    {editingTextValues.content || 'Vorschautext...'}
                  </div>
                </div>
              </div>

              {/* Edit Panel Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex gap-2">
                <button
                  onClick={() => {
                    onCancelEditing();
                    onClearSelectedFromPreview();
                  }}
                  className="flex-1 px-3 py-2 text-gray-600 hover:text-gray-800 transition text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={onSave}
                  disabled={isSavingText}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition text-sm disabled:opacity-50"
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
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {isInteractivePreview
              ? 'Klicken Sie auf Texte in der Vorschau, um sie direkt zu bearbeiten. Der Text wird rechts im Editor geöffnet.'
              : 'Änderungen werden nach dem Speichern in der Vorschau angezeigt. Klicken Sie auf "Aktualisieren" um die neuesten Änderungen zu sehen.'}
          </p>
        </div>
      </div>
    </div>
  );
}
