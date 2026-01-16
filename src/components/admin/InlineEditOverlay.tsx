'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface EditableElement {
  element: HTMLElement;
  textKey: string;
  currentText: string;
  rect: DOMRect;
}

export function InlineEditOverlay() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingElement, setEditingElement] = useState<EditableElement | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if we're in preview mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEditMode(params.get('preview') === 'true');
  }, []);

  // Add click handlers to editable elements
  useEffect(() => {
    if (!isEditMode) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editableElement = target.closest('[data-text-key]') as HTMLElement;

      if (editableElement) {
        e.preventDefault();
        e.stopPropagation();

        const textKey = editableElement.getAttribute('data-text-key');
        if (textKey) {
          const rect = editableElement.getBoundingClientRect();
          setEditingElement({
            element: editableElement,
            textKey,
            currentText: editableElement.innerText,
            rect,
          });
          setEditValue(editableElement.innerText);
        }
      }
    };

    // Add visual indicator for editable elements
    const style = document.createElement('style');
    style.id = 'inline-edit-styles';
    style.textContent = `
      [data-text-key] {
        cursor: pointer !important;
        transition: outline 0.2s ease, background-color 0.2s ease !important;
      }
      [data-text-key]:hover {
        outline: 2px dashed #1e5631 !important;
        outline-offset: 4px !important;
        background-color: rgba(30, 86, 49, 0.05) !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      const existingStyle = document.getElementById('inline-edit-styles');
      if (existingStyle) existingStyle.remove();
    };
  }, [isEditMode]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSave = useCallback(async () => {
    if (!editingElement) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/content-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_key: editingElement.textKey,
          content: editValue,
        }),
      });

      if (response.ok) {
        // Update the element's text directly
        editingElement.element.innerText = editValue;
        setMessage({ type: 'success', text: 'Gespeichert!' });
        setEditingElement(null);
      } else {
        throw new Error('Speichern fehlgeschlagen');
      }
    } catch {
      setMessage({ type: 'error', text: 'Fehler beim Speichern' });
    } finally {
      setIsSaving(false);
    }
  }, [editingElement, editValue]);

  const handleClose = useCallback(() => {
    setEditingElement(null);
    setEditValue('');
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'Enter' && e.ctrlKey) handleSave();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleSave]);

  if (!isEditMode) return null;

  return (
    <>
      {/* Edit Mode Indicator */}
      <div className="fixed top-4 left-4 z-[9999] bg-logo-green text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-sm font-medium">Bearbeitungsmodus</span>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Edit Dialog */}
      {editingElement && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-900">Text bearbeiten</h3>
                <p className="text-xs text-gray-500">{editingElement.textKey}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 text-gray-500 hover:text-gray-700 transition rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Tipp: Strg+Enter zum Speichern, Esc zum Abbrechen
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
