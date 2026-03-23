'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  X,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  Edit3,
  Save,
  Check,
  Grid,
  List,
} from 'lucide-react';
import Image from 'next/image';

interface MediaRecord {
  id: string;
  file_key: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
  categories?: string[];
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
  cf_image_id?: string | null;
  cf_stream_uid?: string | null;
}

const MEDIA_CATEGORIES = [
  { value: 'hero', label: 'Hero' },
  { value: 'aussen', label: 'Außen' },
  { value: 'wohnen', label: 'Wohnen' },
  { value: 'schlafen', label: 'Schlafen' },
  { value: 'kueche', label: 'Küche' },
  { value: 'bad', label: 'Bad' },
  { value: 'umgebung', label: 'Umgebung' },
  { value: 'sommer', label: 'Sommer' },
  { value: 'winter', label: 'Winter' },
  { value: 'extras', label: 'Extras' },
  { value: 'gastgeber', label: 'Gastgeber' },
  { value: 'galerie', label: 'Galerie' },
  { value: 'blog', label: 'Blog' },
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  category: string;
  categories: string[];
  altText: string;
}

export function ImageManager() {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaRecord | null>(null);
  const [editForm, setEditForm] = useState({ alt_text: '', category: '', categories: [] as string[] });
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async (category?: string) => {
    setLoading(true);
    try {
      let url = '/api/admin/media';
      if (category) url += `?category=${category}`;
      const res = await fetch(url);
      const data = await res.json() as { media?: MediaRecord[] };
      setMedia(data.media || []);
    } catch {
      setError('Fehler beim Laden der Medien');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (category: string) => {
    setFilterCategory(category);
    if (category) {
      loadMedia(category);
    } else {
      loadMedia();
    }
  };

  // Filtered media based on search
  const filteredMedia = media.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.alt_text?.toLowerCase().includes(q) ||
      m.title?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    );
  });

  // File handling
  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} ist zu groß (max. 15MB)`);
        continue;
      }

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        category: filterCategory || 'aussen',
        categories: filterCategory ? [filterCategory] : ['aussen'],
        altText: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      });
    }

    setUploadItems((prev) => [...prev, ...newItems]);
    setError('');
  }, [filterCategory]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected]
  );

  const removeUploadItem = (id: string) => {
    setUploadItems((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadAll = async () => {
    const pending = uploadItems.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);

    for (const item of pending) {
      setUploadItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const } : f))
      );

      try {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('category', item.category);
        formData.append('alt_text', item.altText);

        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload fehlgeschlagen');

        const data = await res.json() as { media?: MediaRecord[]; success?: boolean };

        // If multi-category, update categories via PUT
        if (data.media && data.media[0] && item.categories.length > 0) {
          const additionalCats = item.categories.filter((c) => c !== item.category);
          if (additionalCats.length > 0) {
            await fetch('/api/admin/media', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.media[0].id,
                categories: item.categories,
              }),
            });
          }
        }

        setUploadItems((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'done' as const } : f))
        );
      } catch {
        setUploadItems((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'error' as const } : f))
        );
      }
    }

    setIsUploading(false);
    // Remove completed items
    setUploadItems((prev) => {
      prev.filter((f) => f.status === 'done').forEach((f) => URL.revokeObjectURL(f.preview));
      return prev.filter((f) => f.status !== 'done');
    });
    await loadMedia(filterCategory || undefined);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Medium wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Löschen fehlgeschlagen');
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Fehler beim Löschen');
    }
  };

  const openEdit = (m: MediaRecord) => {
    setEditingMedia(m);
    setEditForm({
      alt_text: m.alt_text || '',
      category: m.category,
      categories: m.categories || [],
    });
  };

  const saveEdit = async () => {
    if (!editingMedia) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMedia.id,
          alt_text: editForm.alt_text,
          category: editForm.category,
          categories: editForm.categories,
        }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      setMedia((prev) =>
        prev.map((m) =>
          m.id === editingMedia.id
            ? { ...m, alt_text: editForm.alt_text, category: editForm.category, categories: editForm.categories }
            : m
        )
      );
      setEditingMedia(null);
    } catch {
      setError('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEditCategory = (cat: string) => {
    setEditForm((prev) => {
      const cats = prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories: cats };
    });
  };

  const getMediaUrl = (m: MediaRecord): string => {
    if (m.url && m.url.startsWith('http')) return m.url;
    return m.url || '';
  };

  const pendingCount = uploadItems.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Medienverwaltung</h2>
          <p className="text-sm text-gray-500">{media.length} Medien</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            title={viewMode === 'grid' ? 'Listenansicht' : 'Rasteransicht'}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          <button
            onClick={() => loadMedia(filterCategory || undefined)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          Dateien hierher ziehen oder{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            auswählen
          </button>
        </p>
        <p className="text-xs text-gray-400">Bilder & Videos, max. 15 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Upload Queue */}
      {uploadItems.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {pendingCount} Dateien zum Hochladen
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  uploadItems.forEach((f) => URL.revokeObjectURL(f.preview));
                  setUploadItems([]);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Alle entfernen
              </button>
              <button
                onClick={uploadAll}
                disabled={isUploading || pendingCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Alle hochladen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uploadItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                    {item.file.type.startsWith('image/') ? (
                      <Image src={item.preview} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">{item.file.name}</p>
                    <input
                      type="text"
                      value={item.altText}
                      onChange={(e) =>
                        setUploadItems((prev) =>
                          prev.map((f) => (f.id === item.id ? { ...f, altText: e.target.value } : f))
                        )
                      }
                      placeholder="Alt-Text"
                      className="w-full mt-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <button
                    onClick={() => removeUploadItem(item.id)}
                    className="p-0.5 hover:bg-gray-100 rounded text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Category multi-select */}
                <div className="flex flex-wrap gap-1">
                  {MEDIA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setUploadItems((prev) =>
                          prev.map((f) => {
                            if (f.id !== item.id) return f;
                            const cats = f.categories.includes(cat.value)
                              ? f.categories.filter((c) => c !== cat.value)
                              : [...f.categories, cat.value];
                            return {
                              ...f,
                              categories: cats,
                              category: cats[0] || 'aussen',
                            };
                          })
                        );
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                        item.categories.includes(cat.value)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Status */}
                {item.status === 'uploading' && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Hochladen...
                  </div>
                )}
                {item.status === 'done' && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    Fertig
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    Fehler
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => handleCategoryFilter('')}
          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
            !filterCategory
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alle ({media.length})
        </button>
        {MEDIA_CATEGORIES.map((cat) => {
          const count = media.filter(
            (m) => m.category === cat.value || m.categories?.includes(cat.value)
          ).length;
          return (
            <button
              key={cat.value}
              onClick={() => handleCategoryFilter(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                filterCategory === cat.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Suchen..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-3 text-sm text-gray-500">Lade Medien...</span>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Keine Medien gefunden</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredMedia.map((m) => (
            <div
              key={m.id}
              className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-square bg-gray-100">
                {m.media_type === 'image' ? (
                  <Image
                    src={getMediaUrl(m)}
                    alt={m.alt_text || ''}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <span className="text-xs">Video</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(m)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                    title="Bearbeiten"
                  >
                    <Edit3 className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">{m.alt_text || m.title || '–'}</p>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                    {MEDIA_CATEGORIES.find((c) => c.value === m.category)?.label || m.category}
                  </span>
                  {m.categories
                    ?.filter((c) => c !== m.category)
                    .map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {MEDIA_CATEGORIES.find((cat) => cat.value === c)?.label || c}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="divide-y border rounded-lg">
          {filteredMedia.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
              <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                {m.media_type === 'image' ? (
                  <Image
                    src={getMediaUrl(m)}
                    alt={m.alt_text || ''}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                    Video
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{m.alt_text || m.title || '–'}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                    {MEDIA_CATEGORIES.find((c) => c.value === m.category)?.label || m.category}
                  </span>
                  {m.categories
                    ?.filter((c) => c !== m.category)
                    .map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {MEDIA_CATEGORIES.find((cat) => cat.value === c)?.label || c}
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(m)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Medium bearbeiten</h3>
              <button onClick={() => setEditingMedia(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                {editingMedia.media_type === 'image' ? (
                  <Image
                    src={getMediaUrl(editingMedia)}
                    alt={editForm.alt_text || ''}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Video
                  </div>
                )}
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt-Text / Beschreibung</label>
                <input
                  type="text"
                  value={editForm.alt_text}
                  onChange={(e) => setEditForm({ ...editForm, alt_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
              </div>

              {/* Primary Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hauptkategorie</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  {MEDIA_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Categories (multi-select) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zusätzliche Kategorien
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MEDIA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleEditCategory(cat.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        editForm.categories.includes(cat.value)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingMedia(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
