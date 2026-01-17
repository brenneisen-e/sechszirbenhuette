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
  Tags,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FolderDown,
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
  categories?: string[]; // Additional categories from junction table
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
}

// Gallery categories that support multiple selection
const GALLERY_CATEGORIES = ['aussen', 'wohnen', 'schlafen', 'kueche', 'bad', 'umgebung', 'extras'];

// ============================================================================
// CONSTANTS
// ============================================================================

// Category configuration matching the gallery on the website
const CATEGORIES = [
  // Haupt (nicht in Galerie)
  { value: 'hero', label: 'Hero (Startseite)', description: 'Hauptvideo/Bild auf der Startseite', supportsVideo: true, maxItems: 1, group: 'Haupt' },
  { value: 'header', label: 'Header Hintergrund', description: 'Hintergrundbild im Header-Bereich', supportsVideo: false, maxItems: 1, group: 'Haupt' },
  // Galerie-Kategorien (wie auf Website)
  { value: 'aussen', label: 'Außenbereich', description: 'Außenansichten der Hütte', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'wohnen', label: 'Wohnbereich', description: 'Wohnzimmer, Essbereich', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'schlafen', label: 'Schlafzimmer', description: 'Schlafräume und Betten', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'kueche', label: 'Küche', description: 'Küchenbilder', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'bad', label: 'Bad & Sauna', description: 'Badezimmer, Sauna, Wellness', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'umgebung', label: 'Umgebung', description: 'Landschaft und Natur', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'extras', label: 'Extras', description: 'Sonstige Ausstattung', supportsVideo: true, maxItems: null, group: 'Galerie' },
  // Ausstattungskarten (für Ferienhaus-Kacheln)
  { value: 'card-living', label: 'Karte: Wohnbereich', description: 'Bild für Ausstattungskarte Wohnen', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-kitchen', label: 'Karte: Küche', description: 'Bild für Ausstattungskarte Küche', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-rooms', label: 'Karte: Schlafzimmer', description: 'Bild für Ausstattungskarte Schlafzimmer', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-sauna', label: 'Karte: Sauna', description: 'Bild für Ausstattungskarte Sauna', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-bathroom', label: 'Karte: Bad', description: 'Bild für Ausstattungskarte Badezimmer', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-outdoor', label: 'Karte: Außenbereich', description: 'Bild für Ausstattungskarte Außen', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-equipment', label: 'Karte: Ausstattung', description: 'Bild für Ausstattungskarte Equipment', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-location', label: 'Karte: Lage', description: 'Bild für Ausstattungskarte Lage', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
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
  // Category editing state
  const [editingCategoriesId, setEditingCategoriesId] = useState<string | null>(null);
  const [editingCategories, setEditingCategories] = useState<string[]>([]);
  // GitHub import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<string[]>([]);

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
      // Deduplicate by ID to prevent any duplicate entries from appearing
      const mediaList = data.media || [];
      const seenIds = new Set<string>();
      const deduplicatedMedia = mediaList.filter(m => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
      });
      setMedia(deduplicatedMedia);
    } catch (err) {
      console.error('Error loading media:', err);
      setError('Fehler beim Laden der Medien');
    } finally {
      setLoading(false);
    }
  };

  // GitHub Import - imports static images from public/images/ to database
  const runGitHubImport = async () => {
    setIsImporting(true);
    setImportResults([]);
    setError('');
    try {
      const response = await fetch('/api/admin/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate_from_github' }),
      });
      const data = await response.json() as { success?: boolean; results?: string[]; error?: string };
      if (data.success && data.results) {
        setImportResults(data.results);
        setSuccess('GitHub-Import erfolgreich!');
        await loadMedia();
      } else {
        setError(data.error || 'Import fehlgeschlagen');
      }
    } catch (err) {
      console.error('GitHub import error:', err);
      setError('Verbindungsfehler beim Import');
    } finally {
      setIsImporting(false);
      // Clear results after 10 seconds
      setTimeout(() => setImportResults([]), 10000);
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

  // Move item up in its category
  const handleMoveUp = async (item: MediaRecord) => {
    const categoryMedia = media
      .filter(m => m.category === item.category)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = categoryMedia.findIndex(m => m.id === item.id);
    if (currentIndex <= 0) return; // Already at the top

    const prevItem = categoryMedia[currentIndex - 1];

    try {
      // Swap display orders
      await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, display_order: prevItem.display_order }),
      });
      await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prevItem.id, display_order: item.display_order }),
      });
      setSuccess('Position geändert');
      await loadMedia();
    } catch {
      setError('Fehler beim Ändern der Position');
    }
  };

  // Move item down in its category
  const handleMoveDown = async (item: MediaRecord) => {
    const categoryMedia = media
      .filter(m => m.category === item.category)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = categoryMedia.findIndex(m => m.id === item.id);
    if (currentIndex >= categoryMedia.length - 1) return; // Already at the bottom

    const nextItem = categoryMedia[currentIndex + 1];

    try {
      // Swap display orders
      await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, display_order: nextItem.display_order }),
      });
      await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nextItem.id, display_order: item.display_order }),
      });
      setSuccess('Position geändert');
      await loadMedia();
    } catch {
      setError('Fehler beim Ändern der Position');
    }
  };

  const getMediaByCategory = useCallback((category: string) => {
    return media
      .filter(m => m.category === category)
      .sort((a, b) => a.display_order - b.display_order);
  }, [media]);

  const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value);

  // Open category editing modal
  const handleEditCategories = (item: MediaRecord) => {
    setEditingCategoriesId(item.id);
    // Combine primary category with additional categories
    const allCategories = [item.category, ...(item.categories || [])];
    // Only include gallery categories
    setEditingCategories(allCategories.filter(c => GALLERY_CATEGORIES.includes(c)));
  };

  // Toggle a category in the editing list
  const toggleCategory = (category: string) => {
    setEditingCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Save category changes
  const handleSaveCategories = async () => {
    if (!editingCategoriesId) return;

    const item = media.find(m => m.id === editingCategoriesId);
    if (!item) return;

    try {
      // The first selected category becomes the primary, rest go to junction table
      const primaryCategory = editingCategories[0] || item.category;
      // Filter out the primary category from additional categories to avoid duplicates
      const additionalCategories = editingCategories.slice(1).filter(c => c !== primaryCategory);

      const response = await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategoriesId,
          category: primaryCategory,
          categories: additionalCategories
        }),
      });

      if (!response.ok) throw new Error('Speichern fehlgeschlagen');
      setEditingCategoriesId(null);
      setSuccess('Kategorien gespeichert');
      await loadMedia();
    } catch {
      setError('Fehler beim Speichern der Kategorien');
    }
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={runGitHubImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              title="Bilder aus GitHub importieren"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderDown className="w-4 h-4" />
              )}
              <span className="text-sm">GitHub-Import</span>
            </button>
            <button
              onClick={loadMedia}
              className="p-2 text-gray-500 hover:text-logo-green transition"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="font-medium mb-2">Import-Ergebnis:</p>
            <ul className="text-sm space-y-1">
              {importResults.map((result, i) => (
                <li key={i}>{result}</li>
              ))}
            </ul>
          </div>
        )}

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

                        {/* Move buttons - top right */}
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition flex flex-col gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveUp(item); }}
                            className="p-1 bg-white/90 rounded hover:bg-white transition"
                            title="Nach oben"
                          >
                            <ChevronUp className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveDown(item); }}
                            className="p-1 bg-white/90 rounded hover:bg-white transition"
                            title="Nach unten"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>

                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-4 h-4 text-gray-700" />
                          </button>
                          {/* Show category button only for gallery categories */}
                          {GALLERY_CATEGORIES.includes(item.category) && (
                            <button
                              onClick={() => handleEditCategories(item)}
                              className="p-2 bg-white rounded-full hover:bg-blue-100 transition"
                              title="Kategorien"
                            >
                              <Tags className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
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

      {/* Category Edit Modal */}
      {editingCategoriesId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Tags className="w-5 h-5 text-logo-green" />
                Galerie-Kategorien
              </h3>
              <button
                onClick={() => setEditingCategoriesId(null)}
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
                    onClick={() => toggleCategory(cat)}
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
                onClick={() => setEditingCategoriesId(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveCategories}
                disabled={editingCategories.length === 0}
                className="flex-1 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
