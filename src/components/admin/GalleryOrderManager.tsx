'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, X, GripVertical, Save, Check } from 'lucide-react';
import Image from 'next/image';

interface MediaRecord {
  id: string;
  url: string;
  title: string;
  alt_text: string;
  category: string;
  display_order: number;
}

const HERO_CATS = new Set(['hero', 'hero-thumbnail', 'hero-1080p', 'hero-720p', 'hero-480p', 'hero-360p']);

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

interface GalleryOrderManagerProps {
  onClose: () => void;
}

export function GalleryOrderManager({ onClose }: GalleryOrderManagerProps) {
  const [images, setImages] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json() as { media?: MediaRecord[] };
      const all = (data.media || [])
        .filter((m: MediaRecord) => m.url && !HERO_CATS.has(m.category) && !m.url.includes('.m3u8'))
        .sort((a: MediaRecord, b: MediaRecord) => a.display_order - b.display_order);
      setImages(all);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setImages(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
    setHasChanges(true);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update display_order for all images based on new position
      const updates = images.map((img, index) => ({
        id: img.id,
        display_order: index,
      }));

      // Save in batches
      for (const u of updates) {
        await fetch('/api/media', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: u.id, display_order: u.display_order }),
        });
      }

      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Homepage Galerie — Reihenfolge</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Per Drag & Drop die Reihenfolge der Bilder auf der Homepage ändern
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Speichern
              </button>
            )}
            {saved && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                Gespeichert
              </span>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border-2 transition group ${
                    dragOverIndex === index
                      ? 'border-green-500 scale-105'
                      : dragIndex === index
                        ? 'opacity-50 border-gray-300'
                        : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text || ''}
                    fill
                    className="object-cover pointer-events-none"
                    sizes="150px"
                  />
                  {/* Position badge */}
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </div>
                  {/* Drag handle */}
                  <div className="absolute top-1 right-1 p-0.5 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition">
                    <GripVertical className="w-3 h-3 text-gray-600" />
                  </div>
                  {/* Category label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <p className="text-[8px] text-white truncate">
                      {CATEGORY_LABELS[img.category] || img.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
