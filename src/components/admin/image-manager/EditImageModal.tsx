'use client';

import { X, Save, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ImageRecord, CategoryOption } from './types';

interface EditImageModalProps {
  image: ImageRecord;
  categories: CategoryOption[];
  altText: string;
  category: string;
  displayOrder: number;
  isSaving: boolean;
  onAltTextChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDisplayOrderChange: (value: number) => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditImageModal({
  image,
  categories,
  altText,
  category,
  displayOrder,
  isSaving,
  onAltTextChange,
  onCategoryChange,
  onDisplayOrderChange,
  onSave,
  onClose,
}: EditImageModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Bild bearbeiten</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6 bg-gray-100">
            <Image src={image.image_url} alt={image.alt_text} fill className="object-contain" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea
                value={altText}
                onChange={(e) => onAltTextChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reihenfolge</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => onDisplayOrderChange(parseInt(e.target.value) || 0)}
                min={1}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
