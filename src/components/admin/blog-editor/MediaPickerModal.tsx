'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import type { MediaItem } from './types';

interface MediaPickerModalProps {
  availableMedia: MediaItem[];
  onSelect: (media: MediaItem) => void;
  onClose: () => void;
}

export function MediaPickerModal({ availableMedia, onSelect, onClose }: MediaPickerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Bild auswählen</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {availableMedia.filter(m => m.url).map((media) => (
              <button
                key={media.id}
                onClick={() => onSelect(media)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-logo-green transition"
              >
                <Image
                  src={media.url}
                  alt={media.alt_text || ''}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          {availableMedia.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Keine Bilder verfügbar. Laden Sie zuerst Bilder in der Bilderverwaltung hoch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
