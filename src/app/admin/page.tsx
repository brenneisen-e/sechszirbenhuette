'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Upload,
  Trash2,
  Loader2,
  X,
  RefreshCw,
  Video,
  Eye,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertCircle,
  Info,
  ImageIcon,
  GripVertical,
  Plus,
  Palette,
  Type,
  Save,
} from 'lucide-react';

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

// Category configuration with display locations - NO EMOJIS
const CATEGORIES = [
  {
    value: 'hero',
    label: 'Hero (Startseite)',
    description: 'Hauptvideo/Bild auf der Startseite',
    location: 'Startseite - ganz oben, volle Breite',
    supportsVideo: true,
    maxItems: 1,
    group: 'Haupt'
  },
  {
    value: 'header',
    label: 'Header Hintergrund',
    description: 'Hintergrundbild im Header-Bereich',
    location: 'Navigation/Header - dezenter Hintergrund',
    supportsVideo: false,
    maxItems: 1,
    group: 'Haupt'
  },
  {
    value: 'innen',
    label: 'Innenbereich',
    description: 'Bilder der Innenräume der Hütte',
    location: 'Galerie - Innenräume',
    supportsVideo: true,
    maxItems: null,
    group: 'Galerie'
  },
  {
    value: 'aussen',
    label: 'Außenbereich',
    description: 'Bilder der Außenansichten',
    location: 'Galerie - Außenansicht',
    supportsVideo: true,
    maxItems: null,
    group: 'Galerie'
  },
  {
    value: 'umgebung',
    label: 'Umgebung',
    description: 'Bilder der umliegenden Landschaft',
    location: 'Sektion Umgebung',
    supportsVideo: true,
    maxItems: null,
    group: 'Galerie'
  },
  {
    value: 'winter',
    label: 'Winter',
    description: 'Winterbilder und Schneelandschaften',
    location: 'Saisonale Galerie',
    supportsVideo: true,
    maxItems: null,
    group: 'Galerie'
  },
  {
    value: 'sommer',
    label: 'Sommer',
    description: 'Sommerbilder und grüne Landschaften',
    location: 'Saisonale Galerie',
    supportsVideo: true,
    maxItems: null,
    group: 'Galerie'
  },
  // Kinderausflüge
  {
    value: 'heidi-alm',
    label: 'Heidi-Alm am Falkert',
    description: 'Bilder der Heidi-Alm',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  {
    value: 'turracher-hoehe',
    label: 'Turracher Höhe',
    description: 'Bilder vom Skigebiet',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  {
    value: 'ossiacher-see',
    label: 'Ossiacher See',
    description: 'Bilder vom See und Kletterwald',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  {
    value: 'panoramaweg',
    label: 'Panoramaweg St. Oswald',
    description: 'Bilder vom Panoramaweg',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  {
    value: 'tierpark',
    label: 'Tierpark Feld am See',
    description: 'Bilder vom Wildpark',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  {
    value: 'gerlitzen',
    label: 'Bergbahn Gerlitzen',
    description: 'Bilder von der Bergbahn',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  {
    value: 'nockalm',
    label: 'Panoramastraße Nockalm',
    description: 'Bilder der Nockberge',
    location: 'Kinderausflüge',
    supportsVideo: true,
    maxItems: null,
    group: 'Kinder'
  },
  // Hundewanderungen
  {
    value: 'hund-falkert',
    label: 'Falkert & Falkertsee',
    description: 'Bilder vom Falkert-Gipfel',
    location: 'Hundewanderungen',
    supportsVideo: true,
    maxItems: null,
    group: 'Hund'
  },
  {
    value: 'hund-rodresnock',
    label: 'Rodresnock/Moschelitzen',
    description: 'Bilder der Rundwanderung',
    location: 'Hundewanderungen',
    supportsVideo: true,
    maxItems: null,
    group: 'Hund'
  },
  {
    value: 'hund-drei-seen',
    label: 'Drei-Seen-Wanderung',
    description: 'Bilder der Drei-Seen-Wanderung',
    location: 'Hundewanderungen',
    supportsVideo: true,
    maxItems: null,
    group: 'Hund'
  },
  {
    value: 'hund-hochrindl',
    label: 'Panoramaweg Hochrindl',
    description: 'Bilder vom Panoramaweg',
    location: 'Hundewanderungen',
    supportsVideo: true,
    maxItems: null,
    group: 'Hund'
  },
  {
    value: 'hund-millstaetter',
    label: 'Strandbad Millstätter See',
    description: 'Bilder vom Hundestrand',
    location: 'Hundewanderungen',
    supportsVideo: true,
    maxItems: null,
    group: 'Hund'
  },
];

// Amenity cards configuration - NO ICONS
const AMENITY_CARDS = [
  { key: 'living', label: 'Wohnbereich' },
  { key: 'kitchen', label: 'Küche' },
  { key: 'rooms', label: 'Schlafzimmer' },
  { key: 'sauna', label: 'Sauna & Wellness' },
  { key: 'bathroom', label: 'Badezimmer' },
  { key: 'outdoor', label: 'Außenbereich' },
  { key: 'equipment', label: 'Ausstattung' },
  { key: 'location', label: 'Lage' },
];

interface AmenityCardImage {
  id: number;
  card_key: string;
  media_id: string;
  url?: string;
  title?: string;
}

interface SiteSettings {
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  headingSize: 'small' | 'normal' | 'large';
  bodySize: 'small' | 'normal' | 'large';
  sectionSpacing: 'compact' | 'normal' | 'spacious';
}

const defaultSiteSettings: SiteSettings = {
  primaryColor: '#1e5631',
  accentColor: '#8B7355',
  headingFont: 'RetroSignature',
  bodyFont: 'system-ui',
  headingSize: 'normal',
  bodySize: 'normal',
  sectionSpacing: 'normal',
};

const FONT_OPTIONS = [
  { value: 'RetroSignature', label: 'RetroSignature (Handschrift)' },
  { value: 'system-ui', label: 'System (Standard)' },
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Arial', label: 'Arial (Sans-Serif)' },
];

export default function AdminPage() {
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaRecord | null>(null);

  // Amenity card images state
  const [amenityCardImages, setAmenityCardImages] = useState<Record<string, AmenityCardImage[]>>({});
  const [selectingForCard, setSelectingForCard] = useState<string | null>(null);

  // Site settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    loadMedia();
    loadAmenityCardImages();
    loadSiteSettings();
  }, []);

  const loadMedia = async (category?: string) => {
    setLoading(true);
    try {
      let url = '/api/admin/media';
      if (category) url += `?category=${category}`;
      const response = await fetch(url);
      const data = await response.json();
      setMedia(data.media || []);
    } catch (err) {
      console.error('Error loading media:', err);
      setError('Fehler beim Laden der Medien');
    } finally {
      setLoading(false);
    }
  };

  const loadAmenityCardImages = async () => {
    try {
      const response = await fetch('/api/admin/amenity-images');
      const data = await response.json();
      setAmenityCardImages(data.byCard || {});
    } catch (err) {
      console.error('Error loading amenity card images:', err);
    }
  };

  const loadSiteSettings = async () => {
    try {
      const response = await fetch('/api/site-settings');
      const data = await response.json();
      if (data.settings) {
        setSiteSettings({ ...defaultSiteSettings, ...data.settings });
      }
    } catch (err) {
      console.error('Error loading site settings:', err);
    }
  };

  const saveSiteSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: siteSettings }),
      });
      if (response.ok) {
        setSuccess('Einstellungen gespeichert');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error('Error saving site settings:', err);
      setError('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Datenbank-Migration durchführen? Dies erstellt fehlende Tabellen.')) return;
    setIsMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Migration erfolgreich');
      } else {
        throw new Error(data.error || 'Migration fehlgeschlagen');
      }
    } catch (err) {
      console.error('Migration error:', err);
      setError('Fehler bei der Migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleAddImageToCard = async (cardKey: string, mediaId: string) => {
    try {
      // First, delete any existing images for this card
      const existingImages = amenityCardImages[cardKey] || [];
      for (const img of existingImages) {
        await fetch(`/api/admin/amenity-images?id=${img.id}`, { method: 'DELETE' });
      }

      // Then add the new image
      const response = await fetch('/api/admin/amenity-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_key: cardKey, media_id: mediaId }),
      });
      if (!response.ok) throw new Error('Failed to add image');
      setSuccess('Bild gespeichert');
      await loadAmenityCardImages();
      setSelectingForCard(null);
    } catch (err) {
      console.error('Error adding image to card:', err);
      setError('Fehler beim Speichern des Bildes');
    }
  };

  const handleRemoveImageFromCard = async (imageId: number) => {
    try {
      const response = await fetch(`/api/admin/amenity-images?id=${imageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove image');
      setSuccess('Bild von Kachel entfernt');
      await loadAmenityCardImages();
    } catch (err) {
      console.error('Error removing image from card:', err);
      setError('Fehler beim Entfernen des Bildes');
    }
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    loadMedia(category || undefined);
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

    // Check file types
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

    // Upload files one by one to avoid 413 Payload Too Large
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
          console.error(`Failed to upload ${file.name}`);
        }
      } catch (err) {
        failCount++;
        console.error(`Error uploading ${file.name}:`, err);
      }

      // Update progress
      setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100));
    }

    if (successCount > 0) {
      setSuccess(`${successCount} Datei(en) erfolgreich hochgeladen${failCount > 0 ? `, ${failCount} fehlgeschlagen` : ''}`);
      await loadMedia(selectedCategory || undefined);
    } else {
      setError('Keine Dateien konnten hochgeladen werden');
    }

    setIsUploading(false);
    setUploadProgress(0);
    e.target.value = '';
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Medium wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      const response = await fetch(`/api/admin/media?id=${mediaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Löschen fehlgeschlagen');

      setSuccess('Medium erfolgreich gelöscht');
      await loadMedia(selectedCategory || undefined);
    } catch (err) {
      console.error('Delete error:', err);
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
        body: JSON.stringify({
          id,
          alt_text: editValues.alt_text,
          title: editValues.title,
        }),
      });

      if (!response.ok) throw new Error('Speichern fehlgeschlagen');

      setEditingId(null);
      setSuccess('Änderungen gespeichert');
      await loadMedia(selectedCategory || undefined);
    } catch (err) {
      console.error('Save error:', err);
      setError('Fehler beim Speichern');
    }
  };

  const handleDragStart = (item: MediaRecord) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: MediaRecord) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
  };

  const handleDrop = async (targetItem: MediaRecord) => {
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    if (draggedItem.category !== targetItem.category) {
      setError('Medien können nur innerhalb derselben Kategorie verschoben werden');
      setDraggedItem(null);
      return;
    }

    // Calculate new order
    const categoryMedia = media
      .filter(m => m.category === draggedItem.category)
      .sort((a, b) => a.display_order - b.display_order);

    const draggedIndex = categoryMedia.findIndex(m => m.id === draggedItem.id);
    const targetIndex = categoryMedia.findIndex(m => m.id === targetItem.id);

    // Reorder
    const newOrder = [...categoryMedia];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // Update display_order for all affected items
    try {
      for (let i = 0; i < newOrder.length; i++) {
        if (newOrder[i].display_order !== i) {
          await fetch('/api/admin/media', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newOrder[i].id,
              display_order: i,
            }),
          });
        }
      }

      setSuccess('Reihenfolge aktualisiert');
      await loadMedia(selectedCategory || undefined);
    } catch (err) {
      console.error('Reorder error:', err);
      setError('Fehler beim Aktualisieren der Reihenfolge');
    }

    setDraggedItem(null);
  };

  const getMediaByCategory = useCallback((category: string) => {
    return media
      .filter(m => m.category === category)
      .sort((a, b) => a.display_order - b.display_order);
  }, [media]);

  const getCategoryConfig = (value: string) => {
    return CATEGORIES.find(c => c.value === value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-wood-700 hover:bg-wood-50 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Zur Homepage</span>
              </Link>
              <div className="border-l pl-4">
                <h1 className="text-xl font-bold text-gray-900">Admin-Panel</h1>
                <p className="text-sm text-gray-500">Medien verwalten</p>
              </div>
            </div>
            <button
              onClick={() => loadMedia(selectedCategory || undefined)}
              className="p-2 text-gray-500 hover:text-wood-700 hover:bg-wood-50 rounded-lg"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r mb-6">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-green-700">{success}</p>
              <button
                onClick={() => setSuccess('')}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Medien hochladen
          </h2>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg min-w-[200px]"
            >
              <option value="">Kategorie wählen...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <label className={`px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 ${
              selectedCategory
                ? 'bg-wood-700 text-white hover:bg-wood-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}>
              <Upload className="w-4 h-4" />
              Dateien auswählen
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || !selectedCategory}
              />
            </label>
          </div>

          {selectedCategory && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">
                    {getCategoryConfig(selectedCategory)?.label}
                  </p>
                  <p className="text-blue-700">
                    {getCategoryConfig(selectedCategory)?.description}
                  </p>
                  <p className="text-blue-600 mt-1">
                    <strong>Anzeige:</strong> {getCategoryConfig(selectedCategory)?.location}
                  </p>
                  {getCategoryConfig(selectedCategory)?.supportsVideo && (
                    <p className="text-blue-600">
                      <Video className="w-4 h-4 inline mr-1" />
                      Videos werden unterstützt
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-wood-600" />
                <span className="text-gray-600">Wird hochgeladen... {uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-wood-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Category Sections */}
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const categoryMedia = getMediaByCategory(cat.value);
            const isExpanded = expandedCategory === cat.value || selectedCategory === cat.value;

            return (
              <div key={cat.value} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.value)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {cat.supportsVideo ? (
                        <Video className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      )}
                      <h3 className="font-bold text-gray-900">{cat.label}</h3>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {categoryMedia.length} {categoryMedia.length === 1 ? 'Medium' : 'Medien'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 hidden md:block">
                      {cat.location}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t">
                    <div className="mt-4 mb-2 text-sm text-gray-500">
                      <strong>Beschreibung:</strong> {cat.description}
                    </div>

                    {categoryMedia.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">Keine Medien in dieser Kategorie</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Wählen Sie diese Kategorie oben aus und laden Sie Dateien hoch
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
                        {categoryMedia.map((item, index) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(item)}
                            onDragOver={(e) => handleDragOver(e, item)}
                            onDrop={() => handleDrop(item)}
                            className={`group relative bg-gray-100 rounded-lg overflow-hidden cursor-move ${
                              draggedItem?.id === item.id ? 'opacity-50' : ''
                            }`}
                          >
                            {/* Order Badge */}
                            <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <GripVertical className="w-3 h-3" />
                              {index + 1}
                            </div>

                            {/* Media Preview */}
                            <div className="relative aspect-video">
                              {item.media_type === 'video' ? (
                                <video
                                  src={item.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <Image
                                  src={item.url}
                                  alt={item.alt_text || 'Bild'}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 25vw"
                                />
                              )}
                              {item.media_type === 'video' && (
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  Video
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-2">
                              {editingId === item.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editValues.title}
                                    onChange={(e) => setEditValues(v => ({ ...v, title: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border rounded"
                                    placeholder="Titel"
                                  />
                                  <input
                                    type="text"
                                    value={editValues.alt_text}
                                    onChange={(e) => setEditValues(v => ({ ...v, alt_text: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border rounded"
                                    placeholder="Alt-Text (SEO)"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleSaveEdit(item.id)}
                                      className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs"
                                    >
                                      Speichern
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="px-2 py-1 bg-gray-300 rounded text-xs"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-700 truncate font-medium">
                                    {item.title || 'Ohne Titel'}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {item.alt_text || 'Kein Alt-Text'}
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Hover Actions */}
                            {editingId !== item.id && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setPreviewMedia(item)}
                                  className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                                  title="Vorschau"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                                  title="Bearbeiten"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                                  title="Löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-wood-600" />
              <span>Lade Medien...</span>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewMedia && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewMedia(null)}
          >
            <div
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{previewMedia.title || 'Vorschau'}</h3>
                  <p className="text-sm text-gray-500">
                    Kategorie: {getCategoryConfig(previewMedia.category)?.label}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative aspect-video bg-gray-900">
                {previewMedia.media_type === 'video' ? (
                  <video
                    src={previewMedia.url}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    muted
                  />
                ) : (
                  <Image
                    src={previewMedia.url}
                    alt={previewMedia.alt_text || 'Vorschau'}
                    fill
                    className="object-contain"
                    sizes="100vw"
                  />
                )}
              </div>
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Alt-Text:</span>
                    <p className="text-gray-900">{previewMedia.alt_text || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Anzeige-Position:</span>
                    <p className="text-gray-900">{getCategoryConfig(previewMedia.category)?.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Amenity Card Images Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            Ausstattung & Komfort - Kachel-Bilder
          </h2>
          <p className="text-gray-600 mb-6">
            Wählen Sie für jede Kachel im Bereich &quot;Ausstattung & Komfort&quot; ein Bild aus der Galerie aus.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {AMENITY_CARDS.map((card) => {
              const cardImages = amenityCardImages[card.key] || [];
              const firstImage = cardImages[0];

              return (
                <div key={card.key} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-sm">{card.label}</span>
                  </div>

                  {firstImage?.url ? (
                    <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mb-2 group">
                      <Image
                        src={firstImage.url}
                        alt={firstImage.title || card.label}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                      <button
                        onClick={() => handleRemoveImageFromCard(firstImage.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Bild entfernen"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <button
                    onClick={() => setSelectingForCard(card.key)}
                    className="w-full px-3 py-1.5 text-xs bg-wood-600 text-white rounded hover:bg-wood-700 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {firstImage ? 'Bild ändern' : 'Bild auswählen'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Image Selection Modal */}
        {selectingForCard && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectingForCard(null)}
          >
            <div
              className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-900">
                  Bild auswählen für: {AMENITY_CARDS.find(c => c.key === selectingForCard)?.label}
                </h3>
                <button
                  onClick={() => setSelectingForCard(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {media.filter(m => m.media_type === 'image').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Keine Bilder verfügbar. Laden Sie zuerst Bilder hoch.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {media.filter(m => m.media_type === 'image').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAddImageToCard(selectingForCard, item.id)}
                        className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-wood-500 transition group"
                      >
                        <Image
                          src={item.url}
                          alt={item.alt_text || 'Bild'}
                          fill
                          className="object-cover"
                          sizes="150px"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                          <Check className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Website Styling Settings */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Website-Einstellungen
            </h2>
            <div className="flex gap-2">
              <button
                onClick={runMigration}
                disabled={isMigrating}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
              >
                {isMigrating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Migration
              </button>
              <button
                onClick={saveSiteSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 text-sm bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition flex items-center gap-2"
              >
                {isSavingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colors */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Farben
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primärfarbe (Logo-Grün)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={siteSettings.primaryColor}
                    onChange={(e) => setSiteSettings(s => ({ ...s, primaryColor: e.target.value }))}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={siteSettings.primaryColor}
                    onChange={(e) => setSiteSettings(s => ({ ...s, primaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="#1e5631"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Akzentfarbe (Holz)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={siteSettings.accentColor}
                    onChange={(e) => setSiteSettings(s => ({ ...s, accentColor: e.target.value }))}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={siteSettings.accentColor}
                    onChange={(e) => setSiteSettings(s => ({ ...s, accentColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="#8B7355"
                  />
                </div>
              </div>
            </div>

            {/* Fonts */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Schriftarten
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Überschriften
                </label>
                <select
                  value={siteSettings.headingFont}
                  onChange={(e) => setSiteSettings(s => ({ ...s, headingFont: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fließtext
                </label>
                <select
                  value={siteSettings.bodyFont}
                  onChange={(e) => setSiteSettings(s => ({ ...s, bodyFont: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Schriftgrößen</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Überschriften-Größe
                </label>
                <select
                  value={siteSettings.headingSize}
                  onChange={(e) => setSiteSettings(s => ({ ...s, headingSize: e.target.value as SiteSettings['headingSize'] }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="small">Klein</option>
                  <option value="normal">Normal</option>
                  <option value="large">Groß</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text-Größe
                </label>
                <select
                  value={siteSettings.bodySize}
                  onChange={(e) => setSiteSettings(s => ({ ...s, bodySize: e.target.value as SiteSettings['bodySize'] }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="small">Klein (14px)</option>
                  <option value="normal">Normal (16px)</option>
                  <option value="large">Groß (18px)</option>
                </select>
              </div>
            </div>

            {/* Spacing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Abstände</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sektions-Abstände
                </label>
                <select
                  value={siteSettings.sectionSpacing}
                  onChange={(e) => setSiteSettings(s => ({ ...s, sectionSpacing: e.target.value as SiteSettings['sectionSpacing'] }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="compact">Kompakt</option>
                  <option value="normal">Normal</option>
                  <option value="spacious">Großzügig</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-700 mb-3">Vorschau</h4>
            <div className="space-y-2">
              <p
                className="text-2xl"
                style={{
                  fontFamily: siteSettings.headingFont + ', cursive',
                  color: siteSettings.primaryColor,
                }}
              >
                Überschrift Beispiel
              </p>
              <p
                style={{
                  fontFamily: siteSettings.bodyFont + ', sans-serif',
                  color: siteSettings.accentColor,
                }}
              >
                Dies ist ein Beispieltext in der gewählten Fließtext-Schriftart.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Info */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Verwendung
          </h3>
          <ul className="text-amber-700 text-sm space-y-2">
            <li><strong>Reihenfolge ändern:</strong> Medien per Drag & Drop verschieben</li>
            <li><strong>Bearbeiten:</strong> Hover über ein Bild und auf das Stift-Symbol klicken</li>
            <li><strong>Vorschau:</strong> Hover und auf das Augen-Symbol klicken</li>
            <li><strong>Videos:</strong> MP4, WebM und andere Videoformate werden unterstützt</li>
            <li><strong>Migration:</strong> Führt fehlende Datenbank-Tabellen nach (z.B. für neue Features)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
