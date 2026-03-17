'use client';

import {
  Save,
  Loader2,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { FONT_OPTIONS, HEADING_SIZE_OPTIONS, BODY_SIZE_OPTIONS } from './types';
import type { ContentText, EditingTextValues } from './types';

interface TextEditorFormProps {
  text: ContentText;
  editingTextValues: EditingTextValues;
  isSavingText: boolean;
  isMobile: boolean;
  onValuesChange: (updater: (prev: EditingTextValues) => EditingTextValues) => void;
  onSave: (textKey: string) => Promise<void>;
  onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TextEditorForm({
  text,
  editingTextValues,
  isSavingText,
  isMobile,
  onValuesChange,
  onSave,
  onCancel,
}: TextEditorFormProps) {
  const isHeading = text.text_type === 'heading';
  const sizeOptions = isHeading ? HEADING_SIZE_OPTIONS : BODY_SIZE_OPTIONS;

  return (
    <div className="space-y-4">
      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
        {isHeading ? (
          <input
            type="text"
            value={editingTextValues.content}
            onChange={(e) => onValuesChange(v => ({ ...v, content: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
          />
        ) : (
          <textarea
            value={editingTextValues.content}
            onChange={(e) => onValuesChange(v => ({ ...v, content: e.target.value }))}
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
            onChange={(e) => onValuesChange(v => ({ ...v, font_family: e.target.value }))}
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
                onChange={(e) => onValuesChange(v => ({ ...v, font_size_mobile: e.target.value }))}
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
                onChange={(e) => onValuesChange(v => ({ ...v, font_size_desktop: e.target.value }))}
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
              onChange={(e) => onValuesChange(v => ({ ...v, color: e.target.value }))}
              className="w-12 h-10 p-1 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={editingTextValues.color}
              onChange={(e) => onValuesChange(v => ({ ...v, color: e.target.value }))}
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
            onChange={(e) => onValuesChange(v => ({ ...v, padding: e.target.value }))}
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
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
        >
          Abbrechen
        </button>
        <button
          onClick={() => onSave(text.text_key)}
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
  );
}
