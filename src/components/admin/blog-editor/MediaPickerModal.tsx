'use client';

import { useState, useRef, useMemo } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import type { MediaItem } from './types';

const CATEGORY_LABELS: Record<string, string> = {
  aussen: 'Außen',
  wohnen: 'Wohnzimmer',
  schlafen: 'Schlafzimmer',
  kueche: 'Küche',
  bad: 'Bad & Sauna',
  umgebung: 'Umgebung',
  sommer: 'Sommer',
  winter: 'Winter',
  gastgeber: 'Gastgeber',
  galerie: 'Galerie',
  blog: 'Blog',
  innen: 'Innen',
};

interface MediaPickerModalProps {
  availableMedia: MediaItem[];
  onSelect: (media: MediaItem) => void;
  onClose: () => void;
  onMediaUploaded?: () => void;
}

export function MediaPickerModal({ availableMedia, onSelect, onClose, onMediaUploaded }: MediaPickerModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group valid media by category
  const { grouped, categories, allMedia } = useMemo(() => {
    const valid = availableMedia.filter(m => m.url && m.url.startsWith('https://'));
    const grp: Record<string, MediaItem[]> = {};
    for (const m of valid) {
      const cat = m.category || 'sonstige';
      if (!grp[cat]) grp[cat] = [];
      grp[cat].push(m);
    }
    const cats = Object.keys(grp).sort((a, b) =>
      (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b)
    );
    return { grouped: grp, categories: cats, allMedia: valid };
  }, [availableMedia]);

  const displayMedia = activeCategory ? (grouped[activeCategory] || []) : allMedia;

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

      onMediaUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderMediaGrid = (items: MediaItem[]) => (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {items.map((media) => (
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
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Bild auswählen</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload area */}
        <div className="px-4 pt-3 shrink-0">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-logo-green transition cursor-pointer"
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
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Category filter tabs */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('')}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                !activeCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Alle ({allMedia.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({grouped[cat].length})
              </button>
            ))}
          </div>
        </div>

        {/* Media grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeCategory ? (
            renderMediaGrid(displayMedia)
          ) : (
            <div className="space-y-5">
              {categories.map(cat => (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[cat] || cat} ({grouped[cat].length})
                  </h4>
                  {renderMediaGrid(grouped[cat])}
                </div>
              ))}
            </div>
          )}

          {allMedia.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Keine Bilder verfügbar. Laden Sie oben Bilder hoch oder nutzen Sie die Bilderverwaltung.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
