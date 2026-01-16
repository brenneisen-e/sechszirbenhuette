'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
  ArrowLeft,
  AlertCircle,
  Info,
  ImageIcon,
  GripVertical,
  Type,
  Save,
  Images,
  FileText,
  Layers,
  Settings,
} from 'lucide-react';

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

interface AmenityCardImage {
  id: number;
  card_key: string;
  media_id: string;
  url?: string;
  title?: string;
}

interface ContentText {
  id: number;
  text_key: string;
  content: string;
  font_family: string | null;
  font_size: string | null;
  color: string | null;
  section: string;
  text_type: string;
  updated_at: string;
}

interface GalleryCategory {
  id: string;
  label: string;
  visible: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Category configuration with display locations
const CATEGORIES = [
  { value: 'hero', label: 'Hero (Startseite)', description: 'Hauptvideo/Bild auf der Startseite', location: 'Startseite - ganz oben', supportsVideo: true, maxItems: 1, group: 'Haupt' },
  { value: 'header', label: 'Header Hintergrund', description: 'Hintergrundbild im Header-Bereich', location: 'Navigation/Header', supportsVideo: false, maxItems: 1, group: 'Haupt' },
  { value: 'innen', label: 'Innenbereich', description: 'Bilder der Innenräume', location: 'Galerie - Innenräume', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'aussen', label: 'Außenbereich', description: 'Bilder der Außenansichten', location: 'Galerie - Außenansicht', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'umgebung', label: 'Umgebung', description: 'Bilder der Landschaft', location: 'Sektion Umgebung', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'winter', label: 'Winter', description: 'Winterbilder', location: 'Saisonale Galerie', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'sommer', label: 'Sommer', description: 'Sommerbilder', location: 'Saisonale Galerie', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'heidi-alm', label: 'Heidi-Alm', description: 'Heidi-Alm Bilder', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'turracher-hoehe', label: 'Turracher Höhe', description: 'Skigebiet Bilder', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'ossiacher-see', label: 'Ossiacher See', description: 'See und Kletterwald', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'panoramaweg', label: 'Panoramaweg', description: 'Panoramaweg Bilder', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'tierpark', label: 'Tierpark', description: 'Wildpark Bilder', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'gerlitzen', label: 'Gerlitzen', description: 'Bergbahn Bilder', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'nockalm', label: 'Nockalm', description: 'Nockberge Bilder', location: 'Kinderausflüge', supportsVideo: true, maxItems: null, group: 'Kinder' },
  { value: 'hund-falkert', label: 'Falkert & See', description: 'Falkert-Gipfel Bilder', location: 'Hundewanderungen', supportsVideo: true, maxItems: null, group: 'Hund' },
  { value: 'hund-rodresnock', label: 'Rodresnock', description: 'Rundwanderung', location: 'Hundewanderungen', supportsVideo: true, maxItems: null, group: 'Hund' },
  { value: 'hund-drei-seen', label: 'Drei-Seen', description: 'Drei-Seen-Wanderung', location: 'Hundewanderungen', supportsVideo: true, maxItems: null, group: 'Hund' },
  { value: 'hund-hochrindl', label: 'Hochrindl', description: 'Panoramaweg', location: 'Hundewanderungen', supportsVideo: true, maxItems: null, group: 'Hund' },
  { value: 'hund-millstaetter', label: 'Millstätter See', description: 'Hundestrand', location: 'Hundewanderungen', supportsVideo: true, maxItems: null, group: 'Hund' },
];

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

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (Startbereich)',
  introtext: 'Einleitungstexte',
  ferienhaus: 'Ausstattung & Komfort',
  umgebung: 'Umgebung & Aktivitäten',
  buchung: 'Buchung & Preise',
  bewertungen: 'Bewertungen',
};

const TEXT_KEY_LABELS: Record<string, string> = {
  hero_title: 'Hauptüberschrift',
  hero_subtitle: 'Untertitel',
  hero_description: 'Beschreibungstext',
  introtext_main_heading: 'Hauptüberschrift (Retro)',
  introtext_heading_1: 'Überschrift - Wandern & Skifahren',
  introtext_text_1: 'Text - Wandern & Skifahren',
  introtext_heading_2: 'Überschrift - Heidi Alm',
  introtext_text_2: 'Text - Heidi Alm',
  introtext_heading_3: 'Überschrift - Winterurlaub',
  introtext_text_3: 'Text - Winterurlaub',
  ferienhaus_title: 'Titel',
  ferienhaus_subtitle: 'Untertitel',
  umgebung_title: 'Titel',
  umgebung_subtitle: 'Untertitel',
  buchung_title: 'Titel',
  buchung_subtitle: 'Untertitel',
  bewertungen_title: 'Titel',
  bewertungen_subtitle: 'Untertitel',
};

const FONT_OPTIONS = [
  { value: 'FeelingPassionate', label: 'FeelingPassionate (Handschrift)' },
  { value: 'system-ui', label: 'System (Standard)' },
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Arial', label: 'Arial (Sans-Serif)' },
];

const HEADING_SIZE_OPTIONS = [
  { value: '36', label: '36' },
  { value: '42', label: '42' },
  { value: '48', label: '48' },
  { value: '56', label: '56' },
  { value: '64', label: '64' },
  { value: '72', label: '72' },
  { value: '80', label: '80' },
  { value: '96', label: '96' },
];

const BODY_SIZE_OPTIONS = [
  { value: '12', label: '12' },
  { value: '14', label: '14' },
  { value: '16', label: '16' },
  { value: '18', label: '18' },
  { value: '20', label: '20' },
  { value: '22', label: '22' },
  { value: '24', label: '24' },
];

// Default gallery categories for the homepage
const DEFAULT_GALLERY_CATEGORIES: GalleryCategory[] = [
  { id: 'aussen', label: 'Außenbereich', visible: true },
  { id: 'wohnen', label: 'Wohnbereich', visible: true },
  { id: 'schlafen', label: 'Schlafzimmer', visible: true },
  { id: 'kueche', label: 'Küche', visible: true },
  { id: 'bad', label: 'Bad & Sauna', visible: true },
  { id: 'umgebung', label: 'Umgebung', visible: true },
];

// Website sections for the preview
const WEBSITE_SECTIONS = [
  { id: 'hero', label: 'Hero', icon: ImageIcon },
  { id: 'reviews', label: 'Bewertungen', icon: FileText },
  { id: 'introtext', label: 'Einleitung', icon: Type },
  { id: 'ferienhaus', label: 'Ferienhaus', icon: Layers },
  { id: 'location', label: 'Lage', icon: Settings },
  { id: 'umgebung', label: 'Umgebung', icon: Images },
  { id: 'galerie', label: 'Galerie', icon: Images },
  { id: 'buchung', label: 'Buchung', icon: FileText },
];

// ============================================================================
// ADMIN PAGE CONTENT COMPONENT (with useSearchParams)
// ============================================================================

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get active tab from URL, default to 'bilder'
  const activeTab = searchParams.get('tab') || 'bilder';

  // State
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
  const [previewMedia, setPreviewMedia] = useState<MediaRecord | null>(null);
  const [amenityCardImages, setAmenityCardImages] = useState<Record<string, AmenityCardImage[]>>({});
  const [selectingForCard, setSelectingForCard] = useState<string | null>(null);
  const [contentTexts, setContentTexts] = useState<Record<string, ContentText>>({});
  const [contentTextsBySection, setContentTextsBySection] = useState<Record<string, ContentText[]>>({});
  const [editingTextKey, setEditingTextKey] = useState<string | null>(null);
  const [editingTextValues, setEditingTextValues] = useState<{
    content: string;
    font_family: string;
    font_size: string;
    color: string;
  }>({ content: '', font_family: '', font_size: '', color: '' });
  const [isSavingText, setIsSavingText] = useState(false);
  const [expandedTextSection, setExpandedTextSection] = useState<string | null>(null);
  const [selectedWebsiteSection, setSelectedWebsiteSection] = useState<string>('hero');
  const [galleryCategories, setGalleryCategories] = useState<GalleryCategory[]>(DEFAULT_GALLERY_CATEGORIES);

  // Tab change handler
  const setActiveTab = (tab: string) => {
    router.push(`/admin?tab=${tab}`);
  };

  // Load all data
  useEffect(() => {
    loadMedia();
    loadAmenityCardImages();
    loadContentTexts();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/media');
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

  const loadContentTexts = async () => {
    try {
      const response = await fetch('/api/content-texts');
      const data = await response.json();
      if (data.texts) setContentTexts(data.texts);
      if (data.bySection) setContentTextsBySection(data.bySection);
    } catch (err) {
      console.error('Error loading content texts:', err);
    }
  };

  // Media handlers
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

  // Amenity card handlers
  const handleAddImageToCard = async (cardKey: string, mediaId: string) => {
    try {
      const existingImages = amenityCardImages[cardKey] || [];
      for (const img of existingImages) {
        await fetch(`/api/admin/amenity-images?id=${img.id}`, { method: 'DELETE' });
      }

      const response = await fetch('/api/admin/amenity-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_key: cardKey, media_id: mediaId }),
      });
      if (!response.ok) throw new Error('Failed');
      setSuccess('Bild gespeichert');
      await loadAmenityCardImages();
      setSelectingForCard(null);
    } catch {
      setError('Fehler beim Speichern');
    }
  };

  const handleRemoveImageFromCard = async (imageId: number) => {
    try {
      const response = await fetch(`/api/admin/amenity-images?id=${imageId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      setSuccess('Bild entfernt');
      await loadAmenityCardImages();
    } catch {
      setError('Fehler beim Entfernen');
    }
  };

  // Content text handlers
  const startEditingText = (text: ContentText) => {
    setEditingTextKey(text.text_key);
    setEditingTextValues({
      content: text.content,
      font_family: text.font_family || '',
      font_size: text.font_size || '',
      color: text.color || '',
    });
  };

  const saveContentText = async (textKey: string) => {
    const text = contentTexts[textKey];
    if (!text) return;

    setIsSavingText(true);
    try {
      const response = await fetch('/api/content-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_key: textKey,
          content: editingTextValues.content,
          font_family: editingTextValues.font_family || null,
          font_size: editingTextValues.font_size || null,
          color: editingTextValues.color || null,
          section: text.section,
          text_type: text.text_type,
        }),
      });

      if (response.ok) {
        setSuccess('Text gespeichert');
        setEditingTextKey(null);
        await loadContentTexts();
      } else {
        throw new Error('Save failed');
      }
    } catch {
      setError('Fehler beim Speichern');
    } finally {
      setIsSavingText(false);
    }
  };

  const getMediaByCategory = useCallback((category: string) => {
    return media
      .filter(m => m.category === category)
      .sort((a, b) => a.display_order - b.display_order);
  }, [media]);

  const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value);

  // Get thumbnail URL with low quality
  const getThumbnailUrl = (url: string) => {
    // For Next.js Image optimization, we'll use the quality prop instead
    return url;
  };

  // Group categories by group
  const groupedCategories = CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof CATEGORIES>);

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

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-800 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Zur Homepage</span>
              </Link>
              <div className="border-l border-slate-600 pl-4">
                <h1 className="text-xl font-bold">Admin-Center</h1>
                <p className="text-xs text-slate-300">Inhalte verwalten</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                loadMedia();
                loadAmenityCardImages();
                loadContentTexts();
              }}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4">
          <div className="flex gap-1 border-t border-slate-700 pt-2 pb-0">
            <button
              onClick={() => setActiveTab('bilder')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${
                activeTab === 'bilder'
                  ? 'bg-slate-100 text-slate-800'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <Images className="w-4 h-4" />
              Bilder
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${
                activeTab === 'text'
                  ? 'bg-slate-100 text-slate-800'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <Type className="w-4 h-4" />
              Text
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="container mx-auto px-4 pt-4">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded-r mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 p-3 rounded-r mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        {/* ================================================================ */}
        {/* BILDER TAB */}
        {/* ================================================================ */}
        {activeTab === 'bilder' && (
          <div className="flex gap-4 mt-4">
            {/* Left: Website Preview */}
            <div className="w-80 shrink-0 bg-white rounded-xl shadow-sm overflow-hidden sticky top-32 self-start">
              <div className="bg-slate-700 text-white px-4 py-2 text-sm font-medium">
                Website-Bereiche
              </div>
              <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Website sections list */}
                {WEBSITE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const sectionMedia = getMediaByCategory(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => setSelectedWebsiteSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                        selectedWebsiteSection === section.id
                          ? 'bg-logo-green text-white'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium flex-1">{section.label}</span>
                      {sectionMedia.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          selectedWebsiteSection === section.id
                            ? 'bg-white/20'
                            : 'bg-slate-200'
                        }`}>
                          {sectionMedia.length}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="border-t border-slate-200 my-2" />
                <p className="px-3 py-1 text-xs text-slate-500 font-medium">Ausstattung-Kacheln</p>

                {AMENITY_CARDS.map((card) => {
                  const cardImage = amenityCardImages[card.key]?.[0];
                  return (
                    <button
                      key={card.key}
                      onClick={() => setSelectingForCard(card.key)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 text-slate-700 transition"
                    >
                      {cardImage?.url ? (
                        <div className="w-8 h-8 rounded bg-slate-200 overflow-hidden relative shrink-0">
                          <Image
                            src={cardImage.url}
                            alt={card.label}
                            fill
                            className="object-cover"
                            sizes="32px"
                            quality={20}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <span className="text-sm flex-1">{card.label}</span>
                      <Edit2 className="w-3 h-3 text-slate-400" />
                    </button>
                  );
                })}

                <div className="border-t border-slate-200 my-2" />
                <p className="px-3 py-1 text-xs text-slate-500 font-medium">Galerie-Kategorien</p>

                {galleryCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                  >
                    <input
                      type="checkbox"
                      checked={cat.visible}
                      onChange={() => {
                        setGalleryCategories(cats =>
                          cats.map(c => c.id === cat.id ? { ...c, visible: !c.visible } : c)
                        );
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-logo-green focus:ring-logo-green"
                    />
                    <span className="text-sm text-slate-700">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Image Management */}
            <div className="flex-1 space-y-4">
              {/* Upload Section */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Medien hochladen
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]"
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

                  <label className={`px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm ${
                    selectedCategory
                      ? 'bg-logo-green text-white hover:bg-logo-green/90'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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

                  {selectedCategory && (
                    <span className="text-xs text-slate-500">
                      {getCategoryConfig(selectedCategory)?.supportsVideo && '(Videos erlaubt)'}
                    </span>
                  )}
                </div>

                {isUploading && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Hochladen... {uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-logo-green h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Section Images */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    {WEBSITE_SECTIONS.find(s => s.id === selectedWebsiteSection)?.label || 'Bilder'} - Medien
                  </h2>
                  <span className="text-sm text-slate-500">
                    {getMediaByCategory(selectedWebsiteSection).length} Medien
                  </span>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-logo-green mx-auto" />
                  </div>
                ) : getMediaByCategory(selectedWebsiteSection).length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Keine Medien in dieser Kategorie</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Wählen Sie &quot;{getCategoryConfig(selectedWebsiteSection)?.label || selectedWebsiteSection}&quot; oben und laden Sie Dateien hoch
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {getMediaByCategory(selectedWebsiteSection).map((item, index) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(item)}
                        className={`group relative bg-slate-100 rounded-lg overflow-hidden cursor-move ${
                          draggedItem?.id === item.id ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Order Badge */}
                        <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
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
                              src={getThumbnailUrl(item.url)}
                              alt={item.alt_text || 'Bild'}
                              fill
                              className="object-cover"
                              sizes="150px"
                              quality={30}
                            />
                          )}
                          {item.media_type === 'video' && (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Video className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-1.5">
                          {editingId === item.id ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editValues.title}
                                onChange={(e) => setEditValues(v => ({ ...v, title: e.target.value }))}
                                className="w-full px-1.5 py-1 text-xs border rounded"
                                placeholder="Titel"
                              />
                              <input
                                type="text"
                                value={editValues.alt_text}
                                onChange={(e) => setEditValues(v => ({ ...v, alt_text: e.target.value }))}
                                className="w-full px-1.5 py-1 text-xs border rounded"
                                placeholder="Alt-Text"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-2 py-1 bg-slate-300 rounded text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-600 truncate">{item.title || 'Ohne Titel'}</p>
                          )}
                        </div>

                        {/* Hover Actions */}
                        {editingId !== item.id && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button
                              onClick={() => setPreviewMedia(item)}
                              className="p-1.5 bg-white rounded-full text-slate-700 hover:bg-slate-100"
                              title="Vorschau"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 bg-white rounded-full text-slate-700 hover:bg-slate-100"
                              title="Bearbeiten"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                              title="Löschen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Categories Overview */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Alle Kategorien
                </h2>
                <div className="space-y-2">
                  {Object.entries(groupedCategories).map(([group, cats]) => (
                    <div key={group}>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{group}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                        {cats.map(cat => {
                          const catMedia = getMediaByCategory(cat.value);
                          const firstImage = catMedia.find(m => m.media_type === 'image');
                          return (
                            <button
                              key={cat.value}
                              onClick={() => {
                                setSelectedWebsiteSection(cat.value);
                                setSelectedCategory(cat.value);
                              }}
                              className={`relative bg-slate-100 rounded-lg overflow-hidden aspect-video group hover:ring-2 hover:ring-logo-green transition ${
                                selectedWebsiteSection === cat.value ? 'ring-2 ring-logo-green' : ''
                              }`}
                            >
                              {firstImage ? (
                                <Image
                                  src={firstImage.url}
                                  alt={cat.label}
                                  fill
                                  className="object-cover"
                                  sizes="150px"
                                  quality={20}
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-slate-300" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                                <div className="text-white text-xs">
                                  <p className="font-medium truncate">{cat.label}</p>
                                  <p className="opacity-75">{catMedia.length}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TEXT TAB */}
        {/* ================================================================ */}
        {activeTab === 'text' && (
          <div className="flex gap-4 mt-4">
            {/* Left: Website Section Preview */}
            <div className="w-80 shrink-0 bg-white rounded-xl shadow-sm overflow-hidden sticky top-32 self-start">
              <div className="bg-slate-700 text-white px-4 py-2 text-sm font-medium">
                Website-Sektionen
              </div>
              <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {Object.entries(SECTION_LABELS).map(([key, label]) => {
                  const sectionTexts = contentTextsBySection[key] || [];
                  return (
                    <button
                      key={key}
                      onClick={() => setExpandedTextSection(expandedTextSection === key ? null : key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                        expandedTextSection === key
                          ? 'bg-logo-green text-white'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Type className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium flex-1">{label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        expandedTextSection === key ? 'bg-white/20' : 'bg-slate-200'
                      }`}>
                        {sectionTexts.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Text Editor */}
            <div className="flex-1 space-y-4">
              {expandedTextSection ? (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    {SECTION_LABELS[expandedTextSection]} - Texte bearbeiten
                  </h2>

                  {(contentTextsBySection[expandedTextSection] || []).length === 0 ? (
                    <p className="text-slate-500 text-sm">Keine Texte in dieser Sektion.</p>
                  ) : (
                    <div className="space-y-4">
                      {(contentTextsBySection[expandedTextSection] || []).map((text) => (
                        <div key={text.text_key} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="font-medium text-slate-800">
                                {TEXT_KEY_LABELS[text.text_key] || text.text_key}
                              </span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                text.text_type === 'heading'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {text.text_type === 'heading' ? 'Überschrift' : 'Fließtext'}
                              </span>
                            </div>
                            {editingTextKey !== text.text_key && (
                              <button
                                onClick={() => startEditingText(text)}
                                className="p-1.5 text-slate-500 hover:text-logo-green hover:bg-slate-100 rounded transition"
                                title="Bearbeiten"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {editingTextKey === text.text_key ? (
                            <div className="space-y-3">
                              {/* Content Edit */}
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Inhalt</label>
                                {text.text_type === 'heading' ? (
                                  <input
                                    type="text"
                                    value={editingTextValues.content}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, content: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                  />
                                ) : (
                                  <textarea
                                    value={editingTextValues.content}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, content: e.target.value }))}
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-y"
                                  />
                                )}
                              </div>

                              {/* Style Options */}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Schriftart</label>
                                  <select
                                    value={editingTextValues.font_family}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, font_family: e.target.value }))}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  >
                                    <option value="">Standard</option>
                                    {FONT_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Größe (px)</label>
                                  <select
                                    value={editingTextValues.font_size}
                                    onChange={(e) => setEditingTextValues(v => ({ ...v, font_size: e.target.value }))}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  >
                                    <option value="">Standard</option>
                                    {(text.text_type === 'heading' ? HEADING_SIZE_OPTIONS : BODY_SIZE_OPTIONS).map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label} px</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Farbe</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={editingTextValues.color || '#1e5631'}
                                      onChange={(e) => setEditingTextValues(v => ({ ...v, color: e.target.value }))}
                                      className="w-8 h-8 rounded border cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={editingTextValues.color}
                                      onChange={(e) => setEditingTextValues(v => ({ ...v, color: e.target.value }))}
                                      className="flex-1 px-2 py-1.5 border rounded text-sm"
                                      placeholder="#..."
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Preview */}
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-xs text-slate-500 block mb-2">Vorschau:</span>
                                <p
                                  style={{
                                    fontFamily: editingTextValues.font_family
                                      ? editingTextValues.font_family + (text.text_type === 'heading' ? ', cursive' : ', sans-serif')
                                      : undefined,
                                    fontSize: editingTextValues.font_size ? editingTextValues.font_size + 'px' : undefined,
                                    color: editingTextValues.color || undefined,
                                    lineHeight: text.text_type === 'heading' ? 1.2 : 1.5,
                                  }}
                                  className={text.text_type === 'heading' ? 'text-xl' : 'text-sm'}
                                >
                                  {editingTextValues.content || '(Kein Inhalt)'}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => saveContentText(text.text_key)}
                                  disabled={isSavingText}
                                  className="px-4 py-2 bg-logo-green text-white rounded-lg text-sm hover:bg-logo-green/90 transition flex items-center gap-2"
                                >
                                  {isSavingText ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                  Speichern
                                </button>
                                <button
                                  onClick={() => setEditingTextKey(null)}
                                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 transition"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p
                                className={`text-slate-700 ${text.text_type === 'heading' ? 'text-lg font-medium' : 'text-sm'}`}
                                style={{
                                  fontFamily: text.font_family
                                    ? text.font_family + (text.text_type === 'heading' ? ', cursive' : ', sans-serif')
                                    : undefined,
                                  fontSize: text.font_size ? text.font_size + 'px' : undefined,
                                  color: text.color || undefined,
                                }}
                              >
                                {text.content}
                              </p>
                              {(text.font_family || text.font_size || text.color) && (
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  {text.font_family && (
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">
                                      Schrift: {text.font_family}
                                    </span>
                                  )}
                                  {text.font_size && (
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">
                                      {text.font_size}px
                                    </span>
                                  )}
                                  {text.color && (
                                    <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: text.color }} />
                                      {text.color}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <Type className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">Sektion auswählen</h3>
                  <p className="text-sm text-slate-500">
                    Wählen Sie links eine Website-Sektion aus, um die Texte zu bearbeiten.
                  </p>
                </div>
              )}

              {/* All Sections Quick Overview */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Übersicht aller Texte
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(SECTION_LABELS).map(([key, label]) => {
                    const sectionTexts = contentTextsBySection[key] || [];
                    const headings = sectionTexts.filter(t => t.text_type === 'heading').length;
                    const bodies = sectionTexts.filter(t => t.text_type === 'body').length;
                    return (
                      <button
                        key={key}
                        onClick={() => setExpandedTextSection(key)}
                        className={`p-3 rounded-lg text-left transition ${
                          expandedTextSection === key
                            ? 'bg-logo-green text-white'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <p className="font-medium text-sm mb-1">{label}</p>
                        <div className="flex gap-2 text-xs">
                          <span className={expandedTextSection === key ? 'text-white/80' : 'text-purple-600'}>
                            {headings} Überschriften
                          </span>
                          <span className={expandedTextSection === key ? 'text-white/80' : 'text-blue-600'}>
                            {bodies} Texte
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
                <h3 className="font-bold text-slate-800">{previewMedia.title || 'Vorschau'}</h3>
                <p className="text-sm text-slate-500">
                  {getCategoryConfig(previewMedia.category)?.label}
                </p>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-slate-900">
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
            <div className="p-4 bg-slate-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Alt-Text:</span>
                  <p className="text-slate-800">{previewMedia.alt_text || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Position:</span>
                  <p className="text-slate-800">{getCategoryConfig(previewMedia.category)?.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amenity Card Image Selection Modal */}
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
              <h3 className="font-bold text-slate-800">
                Bild für: {AMENITY_CARDS.find(c => c.key === selectingForCard)?.label}
              </h3>
              <button
                onClick={() => setSelectingForCard(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {media.filter(m => m.media_type === 'image').length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Keine Bilder vorhanden. Laden Sie zuerst Bilder hoch.
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {media.filter(m => m.media_type === 'image').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddImageToCard(selectingForCard, item.id)}
                      className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-logo-green transition group"
                    >
                      <Image
                        src={item.url}
                        alt={item.alt_text || 'Bild'}
                        fill
                        className="object-cover"
                        sizes="150px"
                        quality={30}
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

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-6 h-6 animate-spin text-logo-green" />
            <span className="text-slate-700">Lade Daten...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN EXPORT with Suspense boundary for useSearchParams
// ============================================================================

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
          <Loader2 className="w-6 h-6 animate-spin text-logo-green" />
          <span className="text-slate-700">Admin-Center wird geladen...</span>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
