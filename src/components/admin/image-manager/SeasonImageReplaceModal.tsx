'use client';

import { X, Upload, Loader2, Sun, Snowflake } from 'lucide-react';
import { SeasonImageReplacement } from './types';

interface SeasonImageReplaceModalProps {
  replacement: SeasonImageReplacement;
  isReplacing: boolean;
  onReplace: (file: File, altText: string) => void;
  onClose: () => void;
}

export function SeasonImageReplaceModal({
  replacement,
  isReplacing,
  onReplace,
  onClose,
}: SeasonImageReplaceModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    const altText = formData.get('altText') as string;
    if (file && file.size > 0) {
      onReplace(file, altText || 'Aktivität');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              {replacement.season === 'summer' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Snowflake className="w-5 h-5 text-blue-500" />
              )}
              {replacement.existingImage ? 'Bild ersetzen' : 'Bild hinzufügen'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <input
                type="text"
                name="altText"
                defaultValue={replacement.existingImage?.alt_text || ''}
                placeholder="z.B. Wandern, Skifahren..."
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neues Bild</label>
              <input type="file" name="file" accept="image/*" className="w-full" required />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isReplacing}
                className={`flex-1 px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 ${
                  replacement.season === 'summer'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {isReplacing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {replacement.existingImage ? 'Ersetzen' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
