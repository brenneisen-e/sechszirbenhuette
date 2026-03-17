'use client';

import { Tags, X, Check } from 'lucide-react';
import { CATEGORIES, GALLERY_CATEGORIES } from './constants';

interface CategoryEditModalProps {
  editingCategories: string[];
  onToggleCategory: (category: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function CategoryEditModal({
  editingCategories,
  onToggleCategory,
  onSave,
  onClose,
}: CategoryEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Tags className="w-5 h-5 text-logo-green" />
            Galerie-Kategorien
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Wählen Sie alle Kategorien, in denen dieses Bild erscheinen soll:
        </p>

        <div className="space-y-2 mb-6">
          {GALLERY_CATEGORIES.map(cat => {
            const catConfig = CATEGORIES.find(c => c.value === cat);
            const isSelected = editingCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggleCategory(cat)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition flex items-center justify-between ${
                  isSelected
                    ? 'border-logo-green bg-logo-green/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={isSelected ? 'font-medium text-logo-green' : 'text-gray-700'}>
                  {catConfig?.label || cat}
                </span>
                {isSelected && <Check className="w-5 h-5 text-logo-green" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Abbrechen
          </button>
          <button
            onClick={onSave}
            disabled={editingCategories.length === 0}
            className="flex-1 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
