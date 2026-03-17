import { useState, useEffect, useCallback } from 'react';
import { convertVideoForSafari, convertVideoMultiQuality, needsConversion, extractThumbnailAtTime, type ConversionProgress, VIDEO_QUALITIES } from '@/lib/videoConverter';
import { MediaRecord } from './types';
import { CATEGORIES, GALLERY_CATEGORIES } from './constants';

export function useMediaManager() {
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
  // Duplicate cleanup state
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  // Bulk category assignment state
  const [bulkAssignMode, setBulkAssignMode] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  // GitHub import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<string[]>([]);
  // Video conversion state
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  // Hero video quality selection
  const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null);
  const [heroQualityModalOpen, setHeroQualityModalOpen] = useState(false);

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

  // Upload hero video with selected quality
  // Detect video resolution from file
  const detectVideoResolution = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Could not load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Determine quality category based on video height
  const getQualityFromResolution = (height: number): '1080p' | '720p' | '480p' | '360p' => {
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    return '360p';
  };

  const uploadHeroVideo = async (quality: '1080p' | '720p' | '480p' | '360p') => {
    if (!heroVideoFile) return;

    setHeroQualityModalOpen(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('files', heroVideoFile);
      formData.append('category', `hero-${quality}`);

      const response = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccess(`Hero Video (${quality}) erfolgreich hochgeladen!`);
        await loadMedia();
      } else {
        const data = await response.json() as { error?: string };
        setError(data.error || 'Upload fehlgeschlagen');
      }
    } catch (err) {
      console.error('Hero video upload failed:', err);
      setError('Upload fehlgeschlagen');
    } finally {
      setHeroVideoFile(null);
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Auto-detect quality and upload
  const uploadHeroVideoAutoDetect = async () => {
    if (!heroVideoFile) return;

    setHeroQualityModalOpen(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Detect resolution
      const resolution = await detectVideoResolution(heroVideoFile);
      const quality = getQualityFromResolution(resolution.height);

      console.log(`[MediaManager] Detected resolution: ${resolution.width}x${resolution.height} -> ${quality}`);

      const formData = new FormData();
      formData.append('files', heroVideoFile);
      formData.append('category', `hero-${quality}`);

      const response = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccess(`Hero Video automatisch als ${quality} erkannt und hochgeladen! (${resolution.width}×${resolution.height})`);
        await loadMedia();
      } else {
        const data = await response.json() as { error?: string };
        setError(data.error || 'Upload fehlgeschlagen');
      }
    } catch (err) {
      console.error('Hero video auto-detect upload failed:', err);
      setError('Upload fehlgeschlagen - Qualität konnte nicht erkannt werden');
    } finally {
      setHeroVideoFile(null);
      setIsUploading(false);
      setUploadProgress(100);
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

    // For hero video uploads, open quality selector
    if (selectedCategory === 'hero' && fileArray.length === 1 && fileArray[0].type.startsWith('video/')) {
      setHeroVideoFile(fileArray[0]);
      setHeroQualityModalOpen(true);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const isVideo = file.type.startsWith('video/');

      // For hero videos (shouldn't reach here for single video, but handle multiple)
      if (isVideo && selectedCategory === 'hero' && needsConversion(file)) {
        try {
          setConversionProgress({ stage: 'loading', message: 'Video-Konverter wird geladen...' });
          const multiResult = await convertVideoMultiQuality(file, (progress) => {
            setConversionProgress(progress);
          });
          setConversionProgress(null);

          // Upload thumbnail first (auto-generated at 1 second)
          const thumbnail = await extractThumbnailAtTime(file, 1);
          const thumbFormData = new FormData();
          thumbFormData.append('files', thumbnail);
          thumbFormData.append('category', 'hero-thumbnail');

          try {
            const thumbResponse = await fetch('/api/admin/media', {
              method: 'POST',
              body: thumbFormData,
            });

            if (thumbResponse.ok) {
              successCount++;
            } else {
              console.warn('Thumbnail upload failed');
            }
          } catch {
            console.warn('Thumbnail upload error');
          }

          // Upload all quality versions
          for (const { quality, file: convertedFile } of multiResult.files) {
            const qualitySuffix = VIDEO_QUALITIES[quality].suffix;
            const formData = new FormData();
            formData.append('files', convertedFile);
            // Use quality-specific category like "hero-720p", "hero-480p", "hero-360p"
            formData.append('category', `hero-${qualitySuffix}`);

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
          }
        } catch (err) {
          console.error('Multi-quality video conversion failed:', err);
          setConversionProgress(null);
          failCount++;
        }
      } else {
        // Standard upload (images or non-hero videos)
        let uploadFile = file;

        // Convert non-hero videos for Safari compatibility
        if (needsConversion(file)) {
          try {
            setConversionProgress({ stage: 'loading', message: 'Video-Konverter wird geladen...' });
            uploadFile = await convertVideoForSafari(file, (progress) => {
              setConversionProgress(progress);
            });
            setConversionProgress(null);
          } catch (err) {
            console.error('Video conversion failed:', err);
            setConversionProgress(null);
          }
        }

        const formData = new FormData();
        formData.append('files', uploadFile);
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
    setConversionProgress(null);
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
    // Deduplicate and only include gallery categories
    const uniqueCategories = [...new Set(allCategories)].filter(c => GALLERY_CATEGORIES.includes(c));
    setEditingCategories(uniqueCategories);
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

  // Remove duplicate entries based on file_key or title, and clean up junction table
  const handleRemoveDuplicates = async () => {
    if (!confirm('Duplikate wirklich entfernen? Es werden alle doppelten Einträge und Kategorie-Duplikate bereinigt.')) return;

    setIsCleaningDuplicates(true);
    setError('');

    try {
      // Step 1: Find and delete duplicate media records by file_key
      const seen = new Map<string, MediaRecord>();
      const duplicates: string[] = [];

      for (const item of media) {
        // Use file_key as the unique identifier, or fall back to title
        const key = item.file_key || item.title;
        if (seen.has(key)) {
          // This is a duplicate - mark for deletion
          duplicates.push(item.id);
        } else {
          seen.set(key, item);
        }
      }

      let deletedMedia = 0;
      for (const id of duplicates) {
        try {
          const response = await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
          if (response.ok) {
            deletedMedia++;
          }
        } catch {
          console.error('Error deleting duplicate:', id);
        }
      }

      // Step 2: Clean up junction table duplicates (categories that match primary category)
      let categoryCleanupMsg = '';
      try {
        const cleanupResponse = await fetch('/api/admin/media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup_category_duplicates' })
        });
        const cleanupData = await cleanupResponse.json() as { success?: boolean; message?: string };
        if (cleanupData.success && cleanupData.message) {
          categoryCleanupMsg = cleanupData.message;
        }
      } catch {
        console.error('Error cleaning up category duplicates');
      }

      // Show result
      if (deletedMedia === 0 && !categoryCleanupMsg) {
        setSuccess('Keine Duplikate gefunden!');
      } else {
        const messages = [];
        if (deletedMedia > 0) messages.push(`${deletedMedia} Medien-Duplikat(e) gelöscht`);
        if (categoryCleanupMsg) messages.push(categoryCleanupMsg);
        setSuccess(messages.join('. '));
      }

      await loadMedia();
    } catch (err) {
      console.error('Error removing duplicates:', err);
      setError('Fehler beim Entfernen der Duplikate');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Initialize bulk selection when entering bulk mode or changing category
  const initBulkSelection = useCallback((category: string) => {
    if (!category) {
      setBulkSelectedIds(new Set());
      return;
    }
    // Pre-select all media that already have this category
    const selected = new Set<string>();
    for (const item of media) {
      const hasCategory = item.category === category || (item.categories || []).includes(category);
      if (hasCategory) {
        selected.add(item.id);
      }
    }
    setBulkSelectedIds(selected);
  }, [media]);

  // Toggle bulk mode
  const toggleBulkMode = () => {
    if (bulkAssignMode) {
      // Exit bulk mode
      setBulkAssignMode(false);
      setBulkCategory('');
      setBulkSelectedIds(new Set());
    } else {
      // Enter bulk mode
      setBulkAssignMode(true);
    }
  };

  // Handle bulk category change
  const handleBulkCategoryChange = (category: string) => {
    setBulkCategory(category);
    initBulkSelection(category);
  };

  // Toggle single item in bulk selection
  const toggleBulkItem = (id: string) => {
    const newSet = new Set(bulkSelectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setBulkSelectedIds(newSet);
  };

  // Select all visible media
  const selectAllBulk = () => {
    const newSet = new Set(media.map(m => m.id));
    setBulkSelectedIds(newSet);
  };

  // Deselect all
  const deselectAllBulk = () => {
    setBulkSelectedIds(new Set());
  };

  // Save bulk category assignment
  const saveBulkAssignment = async () => {
    if (!bulkCategory) return;

    setIsSavingBulk(true);
    setError('');

    try {
      let updated = 0;

      for (const item of media) {
        const isSelected = bulkSelectedIds.has(item.id);
        const hasCategory = item.category === bulkCategory || (item.categories || []).includes(bulkCategory);

        // Only update if selection state differs from current state
        if (isSelected !== hasCategory) {
          // Get current categories
          const currentCategories = [item.category, ...(item.categories || [])].filter(c => c !== bulkCategory);

          if (isSelected) {
            // Add category
            currentCategories.push(bulkCategory);
          }
          // If not selected and had category, it's already removed by the filter

          // First category becomes primary, rest are additional
          const primaryCategory = currentCategories[0] || item.category;
          const additionalCategories = currentCategories.slice(1);

          const response = await fetch('/api/admin/media', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: item.id,
              category: primaryCategory,
              categories: additionalCategories
            }),
          });

          if (response.ok) {
            updated++;
          }
        }
      }

      setSuccess(`${updated} Bild(er) aktualisiert!`);
      await loadMedia();
      // Re-init selection with fresh data
      setTimeout(() => initBulkSelection(bulkCategory), 100);
    } catch (err) {
      console.error('Error saving bulk assignment:', err);
      setError('Fehler beim Speichern');
    } finally {
      setIsSavingBulk(false);
    }
  };

  return {
    // State
    media,
    loading,
    error,
    success,
    selectedCategory,
    isUploading,
    uploadProgress,
    editingId,
    editValues,
    draggedItem,
    editingCategoriesId,
    editingCategories,
    isCleaningDuplicates,
    bulkAssignMode,
    bulkCategory,
    bulkSelectedIds,
    isSavingBulk,
    isImporting,
    importResults,
    conversionProgress,
    heroVideoFile,
    heroQualityModalOpen,
    // Setters
    setSelectedCategory,
    setEditValues,
    setEditingId,
    setEditingCategoriesId,
    setHeroQualityModalOpen,
    setHeroVideoFile,
    // Handlers
    loadMedia,
    runGitHubImport,
    handleFileUpload,
    handleDelete,
    handleEdit,
    handleSaveEdit,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleMoveUp,
    handleMoveDown,
    getMediaByCategory,
    getCategoryConfig,
    handleEditCategories,
    toggleCategory,
    handleSaveCategories,
    handleRemoveDuplicates,
    toggleBulkMode,
    handleBulkCategoryChange,
    toggleBulkItem,
    selectAllBulk,
    deselectAllBulk,
    saveBulkAssignment,
    uploadHeroVideo,
    uploadHeroVideoAutoDetect,
  };
}
