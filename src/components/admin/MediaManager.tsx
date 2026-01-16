'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Video,
  Loader2,
  Edit2,
  Check,
  X,
  GripVertical,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MediaRecord {
  id: string;
  file_key: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Category configuration with display locations
const CATEGORIES = [
  { value: 'hero', label: 'Hero (Startseite)', description: 'Hauptvideo/Bild auf der Startseite', supportsVideo: true, maxItems: 1, group: 'Haupt' },
  { value: 'header', label: 'Header Hintergrund', description: 'Hintergrundbild im Header-Bereich', supportsVideo: false, maxItems: 1, group: 'Haupt' },
  { value: 'aussen', label: 'Außenbereich', description: 'Bilder der Außenansichten', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'wohnen', label: 'Wohnbereich', description: 'Wohnzimmer, Essbereich', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'schlafen', label: 'Schlafzimmer', description: 'Schlafräume und Betten', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'kueche', label: 'Küche', description: 'Küchenbilder', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'bad', label: 'Bad & Sauna', description: 'Badezimmer, Sauna, Wellness', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'umgebung', label: 'Umgebung', description: 'Bilder der Landschaft', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'extras', label: 'Extras', description: 'Sonstige Ausstattung', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'heidi-alm', label: 'Heidi-Alm', description: 'Heidi-Alm Bilder', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'turracher-hoehe', label: 'Turracher Höhe', description: 'Skigebiet Bilder', supportsVideo: true, maxItems: null, group: 'Kinder' },
];

// Group categories by group
const groupedCategories = CATEGORIES.reduce((acc, cat) => {
  if (!acc[cat.group]) acc[cat.group] = [];
  acc[cat.group].push(cat);
  return acc;
}, {} as Record<string, typeof CATEGORIES>);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MediaManager() {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ alt_text: string; title: string }>({ alt_text: '', title: '' });
  const [draggedItem, setDraggedItem] = useState<MediaRecord | null>(null);

  // Load media on mount
  useEffect(() => {
    loadMedia();
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/media');
      const data = await response.json() as { media?: MediaRecord[] };
      setMedia(data.media || []);
    } catch (err) {
      console.error('Error loading media:', err);
      setError('Fehler beim Laden der Medien');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedCategory) {
      setError('Bitte wählen Sie zuerst eine Kategorie aus');
      return;
    }

    const categoryConfig = CATEGORIES.find(c => c.value === selectedCategory);
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const isVideo = file.type.startsWith('video/');
      if (isVideo && categoryConfig && !categoryConfig.supportsVideo) {
        setError(`Die Kategorie "${categoryConfig.label}" unterstützt keine Videos`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const formData = new FormData();
      formData.append('files', file);
      formData.append('category', selectedCategory);

      try {
        const response = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100));
    }

    if (successCount > 0) {
      setSuccess(`${successCount} Datei(en) hochgeladen${failCount > 0 ? `, ${failCount} fehlgeschlagen` : ''}`);
      await loadMedia();
    } else {
      setError('Keine Dateien konnten hochgeladen werden');
    }

    setIsUploading(false);
    setUploadProgress(0);
    e.target.value = '';
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Medium wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/admin/media?id=${mediaId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      setSuccess('Medium gelöscht');
      await loadMedia();
    } catch {
      setError('Fehler beim Löschen');
    }
  };

  const handleEdit = (item: MediaRecord) => {
    setEditingId(item.id);
    setEditValues({ alt_text: item.alt_text, title: item.title });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, alt_text: editValues.alt_text, title: editValues.title }),
      });

      if (!response.ok) throw new Error('Speichern fehlgeschlagen');
      setEditingId(null);
      setSuccess('Änderungen gespeichert');
      await loadMedia();
    } catch {
      setError('Fehler beim Speichern');
    }
  };

  const handleDragStart = (item: MediaRecord) => setDraggedItem(item);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (targetItem: MediaRecord) => {
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    if (draggedItem.category !== targetItem.category) {
      setError('Medien können nur innerhalb derselben Kategorie verschoben werden');
      setDraggedItem(null);
      return;
    }

    const categoryMedia = media
      .filter(m => m.category === draggedItem.category)
      .sort((a, b) => a.display_order - b.display_order);

    const draggedIndex = categoryMedia.findIndex(m => m.id === draggedItem.id);
    const targetIndex = categoryMedia.findIndex(m => m.id === targetItem.id);

    const newOrder = [...categoryMedia];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    try {
      for (let i = 0; i < newOrder.length; i++) {
        if (newOrder[i].display_order !== i) {
          await fetch('/api/admin/media', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newOrder[i].id, display_order: i }),
          });
        }
      }
      setSuccess('Reihenfolge aktualisiert');
      await loadMedia();
    } catch {
      setError('Fehler beim Aktualisieren der Reihenfolge');
    }

    setDraggedItem(null);
  };

  const getMediaByCategory = useCallback((category: string) => {
    return media
      .filter(m => m.category === category)
      .sort((a, b) => a.display_order - b.display_order);
  }, [media]);

  const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-logo-green" />
        <span className="ml-3 text-gray-600">Lade Bilderverwaltung...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Bilderverwaltung</h2>
          <button
            onClick={loadMedia}
            className="p-2 text-gray-500 hover:text-logo-green transition"
            title="Aktualisieren"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Upload Section */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
            >
              <option value="">Kategorie wählen...</option>
              {Object.entries(groupedCategories).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dateien hochladen</label>
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg cursor-pointer hover:bg-logo-green/90 transition">
              <Upload className="w-5 h-5" />
              <span>Dateien auswählen</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || !selectedCategory}
              />
            </label>
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{uploadProgress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Media Grid by Category */}
      <div className="p-6 space-y-8">
        {Object.entries(groupedCategories).map(([group, cats]) => (
          <div key={group}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{group}</h3>

            {cats.map(category => {
              const categoryMedia = getMediaByCategory(category.value);
              if (categoryMedia.length === 0) return null;

              return (
                <div key={category.value} className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {category.label}
                    <span className="text-sm text-gray-400">({categoryMedia.length})</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {categoryMedia.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(item)}
                        className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition ${
                          draggedItem?.id === item.id ? 'border-logo-green opacity-50' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        {/* Drag Handle */}
                        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition cursor-grab">
                          <GripVertical className="w-5 h-5 text-white drop-shadow" />
                        </div>

                        {/* Media */}
                        {item.media_type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Video className="w-12 h-12 text-white" />
                          </div>
                        ) : (
                          <Image
                            src={item.url}
                            alt={item.alt_text || 'Bild'}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          />
                        )}

                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-white rounded-full hover:bg-red-100 transition"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>

                        {/* Edit Form */}
                        {editingId === item.id && (
                          <div className="absolute inset-0 bg-white p-2 flex flex-col gap-2">
                            <input
                              type="text"
                              value={editValues.title}
                              onChange={(e) => setEditValues(v => ({ ...v, title: e.target.value }))}
                              placeholder="Titel"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                            <input
                              type="text"
                              value={editValues.alt_text}
                              onChange={(e) => setEditValues(v => ({ ...v, alt_text: e.target.value }))}
                              placeholder="Alt-Text"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                            <div className="flex gap-1 mt-auto">
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="flex-1 py-1 bg-logo-green text-white text-xs rounded hover:bg-logo-green/90"
                              >
                                <Check className="w-3 h-3 inline" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex-1 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                              >
                                <X className="w-3 h-3 inline" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty State */}
        {media.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Noch keine Medien vorhanden</p>
            <p className="text-sm">Wählen Sie eine Kategorie und laden Sie Dateien hoch</p>
          </div>
        )}
      </div>
    </div>
  );
}
