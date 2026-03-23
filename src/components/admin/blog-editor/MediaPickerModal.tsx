'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import type { MediaItem } from './types';

interface MediaPickerModalProps {
  availableMedia: MediaItem[];
  onSelect: (media: MediaItem) => void;
  onClose: () => void;
  onMediaUploaded?: () => void;
}

export function MediaPickerModal({ availableMedia, onSelect, onClose, onMediaUploaded }: MediaPickerModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('category', 'blog');
      formData.append('alt_text', '');

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      // Reload media list
      onMediaUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Bild auswählen</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload area */}
        <div className="px-4 pt-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-logo-green transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files); }}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-logo-green">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Wird hochgeladen...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Upload className="w-5 h-5" />
                <span className="text-sm">Fotos hochladen oder hierher ziehen</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Media grid */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {availableMedia.filter(m => m.url).map((media) => (
              <button
                key={media.id}
                onClick={() => onSelect(media)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-logo-green transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media.url}
                  alt={media.alt_text || ''}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
          {availableMedia.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Keine Bilder verfügbar. Laden Sie oben Bilder hoch oder nutzen Sie die Bilderverwaltung.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
