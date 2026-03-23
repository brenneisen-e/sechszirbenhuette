'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  X,
  AlertCircle,
  Loader2,
  Search,
  Star,
  Database,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Download,
  Sun,
  Snowflake,
  Edit3,
  Compass,
} from 'lucide-react';
import Image from 'next/image';
import JSZip from 'jszip';

import {
  ImageRecord,
  UploadFile,
  DuplicateGroup,
  ImageManagerProps,
  SeasonImageReplacement,
  CATEGORIES,
  MAX_FILE_SIZE,
  SUMMER_ACTIVITY_NAMES,
  WINTER_ACTIVITY_NAMES,
  compressImage,
  calculateImageHash,
  hammingDistance,
  getCategoryLabel,
  inferCategoryFromFilename,
} from './image-manager';

import { EditImageModal } from './image-manager/EditImageModal';
import { SeasonImageReplaceModal } from './image-manager/SeasonImageReplaceModal';
import { DuplicatesModal } from './image-manager/DuplicatesModal';
import { HeroImageManager } from './image-manager/HeroImageManager';

export function ImageManager({}: ImageManagerProps) {
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('hero');
  const [showHeroOnly, setShowHeroOnly] = useState(false);
  const [migrationResults, setMigrationResults] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showDbPanel, setShowDbPanel] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageRecord | null>(null);
  const [editAltText, setEditAltText] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showSeasonPanel, setShowSeasonPanel] = useState(false);
  const [showHeroPanel, setShowHeroPanel] = useState(false);
  const [summerImages, setSummerImages] = useState<ImageRecord[]>([]);
  const [winterImages, setWinterImages] = useState<ImageRecord[]>([]);
  const [replacingSeasonImage, setReplacingSeasonImage] = useState<SeasonImageReplacement | null>(null);
  const [isReplacingImage, setIsReplacingImage] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async (category?: string, heroOnly?: boolean) => {
    setLoading(true);
    try {
      let url = '/api/admin/images';
      if (heroOnly) url = '/api/admin/images?hero=true';
      else if (category) url = `/api/admin/images?category=${category}`;
      const response = await fetch(url);
      const data = (await response.json()) as { images?: ImageRecord[] };
      setImages(data.images || []);
    } catch (err) {
      console.error('Error loading images:', err);
      setError('Fehler beim Laden der Bilder');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setShowHeroOnly(false);
    loadImages(category || undefined);
  };

  const handleHeroFilter = () => {
    setShowHeroOnly(true);
    setSelectedCategory('');
    loadImages(undefined, true);
  };

  const loadSeasonImages = async () => {
    try {
      const [summerRes, winterRes] = await Promise.all([
        fetch('/api/admin/images?category=summer'),
        fetch('/api/admin/images?category=winter'),
      ]);
      const summerData = (await summerRes.json()) as { images?: ImageRecord[] };
      const winterData = (await winterRes.json()) as { images?: ImageRecord[] };
      setSummerImages((summerData.images || []).sort((a, b) => a.display_order - b.display_order));
      setWinterImages((winterData.images || []).sort((a, b) => a.display_order - b.display_order));
    } catch (err) {
      console.error('Error loading season images:', err);
    }
  };

  const handleSeasonImageReplace = async (file: File, altText: string) => {
    if (!replacingSeasonImage) return;
    setIsReplacingImage(true);

    try {
      const compressedFile = await compressImage(file);

      if (replacingSeasonImage.existingImage) {
        await fetch(`/api/admin/images?id=${replacingSeasonImage.existingImage.id}`, {
          method: 'DELETE',
          });
      }

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('altText', altText);
      formData.append('category', replacingSeasonImage.season);
      formData.append('displayOrder', String(replacingSeasonImage.index + 1));

      const response = await fetch('/api/admin/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      await loadSeasonImages();
      setReplacingSeasonImage(null);
    } catch (err) {
      console.error('Error replacing season image:', err);
      setError('Fehler beim Ersetzen des Bildes');
    } finally {
      setIsReplacingImage(false);
    }
  };

  const downloadAllPhotos = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const response = await fetch('/api/admin/images');
      const data = (await response.json()) as { images?: ImageRecord[] };

      if (!data.images || data.images.length === 0) {
        setError('Keine Bilder zum Herunterladen gefunden');
        setIsDownloading(false);
        return;
      }

      const imagesToDownload = data.images.filter((img) => img.category !== 'summer' && img.category !== 'winter');

      if (imagesToDownload.length === 0) {
        setError('Keine Bilder zum Herunterladen (alle sind Sommer/Winter)');
        setIsDownloading(false);
        return;
      }

      const zip = new JSZip();
      const total = imagesToDownload.length;

      for (let i = 0; i < imagesToDownload.length; i++) {
        const img = imagesToDownload[i];
        try {
          const imgResponse = await fetch(img.image_url);
          const blob = await imgResponse.blob();
          const extension = img.image_url.split('.').pop() || 'jpg';
          const safeName = (img.alt_text || img.image_key || `image_${i}`)
            .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
          const filename = `${img.category}/${safeName}.${extension}`;
          zip.file(filename, blob);
          setDownloadProgress(Math.round(((i + 1) / total) * 100));
        } catch (err) {
          console.error(`Error downloading image ${img.id}:`, err);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sechszirbenhuette-fotos-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Fehler beim Herunterladen der Bilder');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const findDuplicatesInGallery = async () => {
    if (images.length < 2) return;
    setIsCheckingDuplicates(true);
    setShowDuplicates(true);

    const imagesWithHashes: { image: ImageRecord; hash: string }[] = [];
    for (const image of images) {
      try {
        const hash = await calculateImageHash(image.image_url);
        imagesWithHashes.push({ image, hash });
      } catch (err) {
        console.error('Error hashing image:', image.id, err);
      }
    }

    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < imagesWithHashes.length; i++) {
      if (processed.has(imagesWithHashes[i].image.id)) continue;
      const group: ImageRecord[] = [{ ...imagesWithHashes[i].image, hash: imagesWithHashes[i].hash }];
      processed.add(imagesWithHashes[i].image.id);

      for (let j = i + 1; j < imagesWithHashes.length; j++) {
        if (processed.has(imagesWithHashes[j].image.id)) continue;
        const distance = hammingDistance(imagesWithHashes[i].hash, imagesWithHashes[j].hash);
        if (distance < 12) {
          group.push({ ...imagesWithHashes[j].image, hash: imagesWithHashes[j].hash });
          processed.add(imagesWithHashes[j].image.id);
        }
      }

      if (group.length > 1) {
        groups.push({ hash: imagesWithHashes[i].hash, images: group });
      }
    }

    setDuplicateGroups(groups);
    setIsCheckingDuplicates(false);
  };

  const toggleDeletionSelection = (imageId: string) => {
    setSelectedForDeletion((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) newSet.delete(imageId);
      else newSet.add(imageId);
      return newSet;
    });
  };

  const selectAllDuplicatesExceptFirst = () => {
    const toDelete = new Set<string>();
    for (const group of duplicateGroups) {
      for (let i = 1; i < group.images.length; i++) {
        toDelete.add(group.images[i].id);
      }
    }
    setSelectedForDeletion(toDelete);
  };

  const deleteSelectedDuplicates = async () => {
    if (selectedForDeletion.size === 0) return;
    if (!confirm(`${selectedForDeletion.size} Bilder wirklich löschen?`)) return;

    setIsUploading(true);
    for (const imageId of selectedForDeletion) {
      try {
        await fetch(`/api/admin/images?id=${imageId}`, {
          method: 'DELETE',
          });
      } catch (err) {
        console.error('Delete error:', err);
      }
    }

    setSelectedForDeletion(new Set());
    setDuplicateGroups([]);
    setShowDuplicates(false);
    await loadImages(selectedCategory || undefined);
    setIsUploading(false);
  };

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles: UploadFile[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} ist zu groß (max. 15MB)`);
        continue;
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      });
    }

    setUploadFiles((prev) => [...prev, ...newFiles]);
    setError('');

    setTimeout(() => {
      newFiles.forEach(async (uploadFile) => {
        try {
          const formData = new FormData();
          formData.append('file', uploadFile.file);

          setUploadFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, isAnalyzing: true, status: 'analyzing' as const } : f))
          );

          const response = await fetch('/api/admin/images/analyze', {
            method: 'POST',
            body: formData,
          });

          const data = (await response.json()) as { suggestion?: string; category?: string; isHeroCandidate?: boolean };

          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    altText: data.suggestion || uploadFile.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                    suggestedCategory: data.category || 'exterior',
                    isHeroCandidate: data.isHeroCandidate ?? true,
                    isAnalyzing: false,
                    status: 'pending' as const,
                  }
                : f
            )
          );
        } catch {
          const fallbackCategory = inferCategoryFromFilename(uploadFile.file.name);

          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    altText: uploadFile.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                    suggestedCategory: fallbackCategory,
                    isHeroCandidate: ['exterior', 'surroundings'].includes(fallbackCategory),
                    isAnalyzing: false,
                    status: 'pending' as const,
                  }
                : f
            )
          );
        }
      });
    }, 100);
  }, []);

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

  const removeFile = (id: string) => {
    setUploadFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFileStatus = (id: string, updates: Partial<UploadFile>) => {
    setUploadFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const uploadAllFiles = async () => {
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    const pendingFiles = uploadFiles.filter((f) => f.status === 'pending' || f.status === 'error');

    for (let i = 0; i < pendingFiles.length; i++) {
      const uploadFile = pendingFiles[i];
      try {
        updateFileStatus(uploadFile.id, { status: 'compressing', progress: 0 });
        const compressedBlob = await compressImage(uploadFile.file);
        updateFileStatus(uploadFile.id, { status: 'uploading', progress: 50, compressedSize: compressedBlob.size });

        const formData = new FormData();
        formData.append('file', compressedBlob, uploadFile.file.name.replace(/\.[^/.]+$/, '.jpg'));
        formData.append('altText', uploadFile.altText || uploadFile.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        formData.append('category', uploadFile.suggestedCategory || uploadCategory || 'exterior');
        formData.append('displayOrder', String(images.length + i + 1));
        if (uploadFile.isHeroCandidate !== undefined) {
          formData.append('isHero', uploadFile.isHeroCandidate ? 'true' : 'false');
        }

        const response = await fetch('/api/admin/images', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload fehlgeschlagen');
        updateFileStatus(uploadFile.id, { status: 'done', progress: 100 });
      } catch (err) {
        console.error('Upload error:', err);
        updateFileStatus(uploadFile.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload fehlgeschlagen' });
      }
    }

    setIsUploading(false);
    await loadImages(selectedCategory || undefined);
  };

  const clearCompleted = () => {
    setUploadFiles((prev) => {
      prev.filter((f) => f.status === 'done').forEach((f) => URL.revokeObjectURL(f.preview));
      return prev.filter((f) => f.status !== 'done');
    });
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Bild wirklich löschen?')) return;
    try {
      const response = await fetch(`/api/admin/images?id=${imageId}`, {
        method: 'DELETE',
        });
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      await loadImages(selectedCategory || undefined);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Fehler beim Löschen');
    }
  };

  const toggleHero = async (image: ImageRecord) => {
    try {
      const response = await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: image.id, is_hero: !image.is_hero }),
      });
      if (!response.ok) throw new Error('Update fehlgeschlagen');
      setImages((prev) => prev.map((img) => (img.id === image.id ? { ...img, is_hero: image.is_hero ? 0 : 1 } : img)));
    } catch (err) {
      console.error('Toggle hero error:', err);
      setError('Fehler beim Aktualisieren');
    }
  };

  const openEditModal = (image: ImageRecord) => {
    setEditingImage(image);
    setEditAltText(image.alt_text);
    setEditCategory(image.category);
    setEditDisplayOrder(image.display_order);
  };

  const closeEditModal = () => {
    setEditingImage(null);
    setEditAltText('');
    setEditCategory('');
    setEditDisplayOrder(0);
  };

  const saveImageChanges = async () => {
    if (!editingImage) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingImage.id, alt_text: editAltText, category: editCategory, display_order: editDisplayOrder }),
      });
      if (!response.ok) throw new Error('Update fehlgeschlagen');
      setImages((prev) =>
        prev.map((img) =>
          img.id === editingImage.id ? { ...img, alt_text: editAltText, category: editCategory, display_order: editDisplayOrder } : img
        )
      );
      closeEditModal();
    } catch (err) {
      console.error('Save error:', err);
      setError('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const moveImageUp = async (image: ImageRecord) => {
    const currentIndex = images.findIndex((img) => img.id === image.id);
    if (currentIndex <= 0) return;
    const prevImage = images[currentIndex - 1];
    try {
      await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: image.id, display_order: prevImage.display_order }),
      });
      await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prevImage.id, display_order: image.display_order }),
      });
      await loadImages(selectedCategory || undefined, showHeroOnly);
    } catch (err) {
      console.error('Move error:', err);
      setError('Fehler beim Verschieben');
    }
  };

  const moveImageDown = async (image: ImageRecord) => {
    const currentIndex = images.findIndex((img) => img.id === image.id);
    if (currentIndex >= images.length - 1) return;
    const nextImage = images[currentIndex + 1];
    try {
      await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: image.id, display_order: nextImage.display_order }),
      });
      await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nextImage.id, display_order: image.display_order }),
      });
      await loadImages(selectedCategory || undefined, showHeroOnly);
    } catch (err) {
      console.error('Move error:', err);
      setError('Fehler beim Verschieben');
    }
  };

  const runMigration = async (action: string) => {
    if (action === 'delete_all_images' || action === 'recreate_table') {
      if (!confirm('ACHTUNG: Diese Aktion löscht alle Bilder! Fortfahren?')) return;
    }
    setIsMigrating(true);
    setMigrationResults([]);

    try {
      const response = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { results?: string[]; error?: string };

      if (data.results) {
        setMigrationResults(data.results);
        if (action === 'delete_all_images' || action === 'recreate_table' || action === 'migrate_from_github') {
          await loadImages();
        }
      } else if (data.error) {
        setMigrationResults([`❌ Fehler: ${data.error}`]);
      }
    } catch (err) {
      setMigrationResults([`❌ Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`]);
    } finally {
      setIsMigrating(false);
    }
  };

  const pendingCount = uploadFiles.filter((f) => f.status === 'pending').length;
  const doneCount = uploadFiles.filter((f) => f.status === 'done').length;
  const errorCount = uploadFiles.filter((f) => f.status === 'error').length;

  return (
    <>
      {/* Database Management Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <button onClick={() => setShowDbPanel(!showDbPanel)} className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Database className="w-5 h-5" />
          Datenbank-Verwaltung
          <span className="text-sm font-normal text-gray-500">({showDbPanel ? 'ausblenden' : 'anzeigen'})</span>
        </button>

        {showDbPanel && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runMigration('create_images_table')}
                disabled={isMigrating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Tabelle erstellen
              </button>
              <button
                onClick={() => runMigration('migrate_from_github')}
                disabled={isMigrating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                GitHub-Import
              </button>
              <button
                onClick={() => runMigration('delete_all_images')}
                disabled={isMigrating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Alle löschen
              </button>
            </div>
            {migrationResults.length > 0 && (
              <div className="bg-gray-100 rounded-lg p-4 max-h-60 overflow-y-auto">
                {migrationResults.map((result, i) => (
                  <p
                    key={i}
                    className={`text-sm font-mono ${result.startsWith('✓') ? 'text-green-600' : result.startsWith('❌') ? 'text-red-600' : 'text-gray-700'}`}
                  >
                    {result}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hero Images Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <button
          onClick={() => setShowHeroPanel(!showHeroPanel)}
          className="flex items-center gap-2 text-lg font-bold text-gray-900"
        >
          <Compass className="w-5 h-5 text-emerald-600" />
          Hero-Bilder (Responsive)
          <span className="text-sm font-normal text-gray-500">({showHeroPanel ? 'ausblenden' : 'anzeigen'})</span>
        </button>

        {showHeroPanel && (
          <div className="mt-4">
            <HeroImageManager />
          </div>
        )}
      </div>

      {/* Season Activities Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <button
          onClick={() => {
            setShowSeasonPanel(!showSeasonPanel);
            if (!showSeasonPanel) loadSeasonImages();
          }}
          className="flex items-center gap-2 text-lg font-bold text-gray-900"
        >
          <Sun className="w-5 h-5 text-amber-500" />
          <Snowflake className="w-5 h-5 text-blue-500" />
          Saison-Aktivitäten
          <span className="text-sm font-normal text-gray-500">({showSeasonPanel ? 'ausblenden' : 'anzeigen'})</span>
        </button>

        {showSeasonPanel && (
          <div className="mt-4 grid md:grid-cols-2 gap-6">
            {/* Summer Activities */}
            <div>
              <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2">
                <Sun className="w-4 h-4" />
                Sommer ({summerImages.length}/6)
              </h3>
              <div className="space-y-2">
                {SUMMER_ACTIVITY_NAMES.map((name, i) => {
                  const img = summerImages[i];
                  return (
                    <div key={i} className="flex items-center gap-3 bg-amber-50 rounded-lg p-2">
                      {img ? (
                        <div className="relative w-16 h-12 rounded overflow-hidden">
                          <Image src={img.image_url} alt={img.alt_text} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-amber-100 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-amber-300" />
                        </div>
                      )}
                      <span className="flex-1 text-sm">{img?.alt_text || name}</span>
                      <button
                        onClick={() => setReplacingSeasonImage({ season: 'summer', index: i, existingImage: img || null })}
                        className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                      >
                        {img ? 'Ersetzen' : 'Hinzufügen'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Winter Activities */}
            <div>
              <h3 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                <Snowflake className="w-4 h-4" />
                Winter ({winterImages.length}/6)
              </h3>
              <div className="space-y-2">
                {WINTER_ACTIVITY_NAMES.map((name, i) => {
                  const img = winterImages[i];
                  return (
                    <div key={i} className="flex items-center gap-3 bg-blue-50 rounded-lg p-2">
                      {img ? (
                        <div className="relative w-16 h-12 rounded overflow-hidden">
                          <Image src={img.image_url} alt={img.alt_text} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-blue-100 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-blue-300" />
                        </div>
                      )}
                      <span className="flex-1 text-sm">{img?.alt_text || name}</span>
                      <button
                        onClick={() => setReplacingSeasonImage({ season: 'winter', index: i, existingImage: img || null })}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {img ? 'Ersetzen' : 'Hinzufügen'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Bilder hochladen
        </h2>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Bilder hierher ziehen oder klicken zum Auswählen</p>
            <p className="text-sm text-gray-400 mt-2">Max. 15MB pro Bild</p>
          </label>
        </div>

        {uploadFiles.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {pendingCount} ausstehend • {doneCount} fertig • {errorCount} Fehler
              </p>
              <div className="flex gap-2">
                {doneCount > 0 && (
                  <button onClick={clearCompleted} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Fertige entfernen
                  </button>
                )}
                <button
                  onClick={uploadAllFiles}
                  disabled={isUploading || pendingCount === 0}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Alle hochladen
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {uploadFiles.map((file) => (
                <div key={file.id} className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <div className="relative aspect-video">
                    <Image src={file.preview} alt="Preview" fill className="object-cover" />
                  </div>
                  <div className="p-2">
                    <input
                      type="text"
                      value={file.altText || ''}
                      onChange={(e) => updateFileStatus(file.id, { altText: e.target.value })}
                      placeholder="Beschreibung..."
                      className="w-full text-xs px-2 py-1 border rounded"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`text-xs ${file.status === 'done' ? 'text-green-600' : file.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}
                      >
                        {file.status === 'analyzing'
                          ? 'Analysiert...'
                          : file.status === 'compressing'
                            ? 'Komprimiert...'
                            : file.status === 'uploading'
                              ? 'Lädt hoch...'
                              : file.status === 'done'
                                ? 'Fertig'
                                : file.status === 'error'
                                  ? 'Fehler'
                                  : 'Warten'}
                      </span>
                      <button onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Gallery */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            Bildergalerie ({images.length})
          </h2>
          <div className="flex gap-2">
            <button onClick={() => loadImages()} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={downloadAllPhotos}
              disabled={isDownloading}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? `${downloadProgress}%` : 'ZIP'}
            </button>
            <button
              onClick={findDuplicatesInGallery}
              disabled={isCheckingDuplicates}
              className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center gap-2"
            >
              {isCheckingDuplicates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Duplikate
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => handleCategoryFilter('')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              !selectedCategory && !showHeroOnly ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
          <button
            onClick={handleHeroFilter}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              showHeroOnly ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star className="w-4 h-4" />
            Hero
          </button>
          {CATEGORIES.filter((c) => c.value !== 'hero').map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryFilter(cat.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedCategory === cat.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Keine Bilder gefunden</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((image) => (
              <div key={image.id} className="group relative bg-gray-100 rounded-lg overflow-hidden">
                <div className="relative aspect-video">
                  <Image src={image.image_url} alt={image.alt_text} fill className="object-cover" />
                  {image.is_hero === 1 && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Hero
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-600 truncate">{image.alt_text}</p>
                  <p className="text-xs text-gray-400">{getCategoryLabel(image.category)}</p>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => toggleHero(image)}
                    className={`p-2 rounded-full ${image.is_hero ? 'bg-amber-500 text-white' : 'bg-white text-gray-700'}`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditModal(image)} className="p-2 bg-white rounded-full text-gray-700">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveImageUp(image)} className="p-2 bg-white rounded-full text-gray-700">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveImageDown(image)} className="p-2 bg-white rounded-full text-gray-700">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(image.id)} className="p-2 bg-red-500 rounded-full text-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDuplicates && duplicateGroups.length > 0 && (
        <DuplicatesModal
          groups={duplicateGroups}
          selectedForDeletion={selectedForDeletion}
          isDeleting={isUploading}
          onToggleSelection={toggleDeletionSelection}
          onSelectAllExceptFirst={selectAllDuplicatesExceptFirst}
          onDeleteSelected={deleteSelectedDuplicates}
          onClose={() => setShowDuplicates(false)}
        />
      )}

      {replacingSeasonImage && (
        <SeasonImageReplaceModal
          replacement={replacingSeasonImage}
          isReplacing={isReplacingImage}
          onReplace={handleSeasonImageReplace}
          onClose={() => setReplacingSeasonImage(null)}
        />
      )}

      {editingImage && (
        <EditImageModal
          image={editingImage}
          categories={CATEGORIES}
          altText={editAltText}
          category={editCategory}
          displayOrder={editDisplayOrder}
          isSaving={isSaving}
          onAltTextChange={setEditAltText}
          onCategoryChange={setEditCategory}
          onDisplayOrderChange={setEditDisplayOrder}
          onSave={saveImageChanges}
          onClose={closeEditModal}
        />
      )}
    </>
  );
}
