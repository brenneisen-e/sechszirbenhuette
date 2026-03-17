'use client';

import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';

import {
  ImageRecord,
  UploadFile,
  DuplicateGroup,
  SeasonImageReplacement,
  MAX_FILE_SIZE,
  compressImage,
  calculateImageHash,
  hammingDistance,
  inferCategoryFromFilename,
} from '../image-manager';

export function useImageManager(adminPassword: string) {
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
  const [summerImages, setSummerImages] = useState<ImageRecord[]>([]);
  const [winterImages, setWinterImages] = useState<ImageRecord[]>([]);
  const [replacingSeasonImage, setReplacingSeasonImage] = useState<SeasonImageReplacement | null>(null);
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [isExportingR2, setIsExportingR2] = useState(false);
  const [r2ExportProgress, setR2ExportProgress] = useState(0);
  const [r2ExportStatus, setR2ExportStatus] = useState<string>('');

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
          headers: { 'x-admin-password': adminPassword },
        });
      }

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('altText', altText);
      formData.append('category', replacingSeasonImage.season);
      formData.append('displayOrder', String(replacingSeasonImage.index + 1));

      const response = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword },
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
      a.download = `natberger-huette-fotos-${new Date().toISOString().split('T')[0]}.zip`;
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

  const exportR2ToGitHub = async () => {
    setIsExportingR2(true);
    setR2ExportProgress(0);
    setR2ExportStatus('Liste Bilder aus R2...');

    try {
      const listResponse = await fetch('/api/admin/export-r2');
      const listData = (await listResponse.json()) as {
        success?: boolean;
        images?: Array<{ key: string; category: string; filename: string; size: number }>;
        totalCount?: number;
        byCategory?: Record<string, number>;
        error?: string;
      };

      if (!listData.success || !listData.images) {
        throw new Error(listData.error || 'Fehler beim Auflisten der R2-Objekte');
      }

      const images = listData.images;
      if (images.length === 0) {
        setError('Keine Bilder im R2-Bucket gefunden');
        setIsExportingR2(false);
        return;
      }

      setR2ExportStatus(`${images.length} Bilder gefunden. Starte Download...`);

      const zip = new JSZip();
      const total = images.length;
      let downloaded = 0;
      let errors = 0;

      const manifest: Record<string, { files: string[]; count: number }> = {};

      for (const img of images) {
        try {
          setR2ExportStatus(`Lade ${img.filename} (${downloaded + 1}/${total})...`);

          const downloadResponse = await fetch('/api/admin/export-r2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: img.key }),
          });

          const downloadData = (await downloadResponse.json()) as {
            success?: boolean;
            data?: string;
            contentType?: string;
            error?: string;
          };

          if (downloadData.success && downloadData.data) {
            const binaryString = atob(downloadData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const filePath = `gallery/${img.category}/${img.filename}`;
            zip.file(filePath, bytes);

            if (!manifest[img.category]) {
              manifest[img.category] = { files: [], count: 0 };
            }
            manifest[img.category].files.push(img.filename);
            manifest[img.category].count++;

            downloaded++;
          } else {
            console.error(`Failed to download ${img.key}:`, downloadData.error);
            errors++;
          }

          setR2ExportProgress(Math.round(((downloaded + errors) / total) * 100));
        } catch (err) {
          console.error(`Error downloading ${img.key}:`, err);
          errors++;
        }
      }

      zip.file('gallery/manifest.json', JSON.stringify(manifest, null, 2));

      const readme = `# Sechszirbenhütte Galerie-Bilder

Diese Bilder wurden aus dem Cloudflare R2-Bucket exportiert.

## Kategorien
${Object.entries(manifest)
  .map(([cat, info]) => `- **${cat}**: ${info.count} Bilder`)
  .join('\n')}

## Integration in GitHub

1. Entpacken Sie diese ZIP-Datei
2. Kopieren Sie den \`gallery\` Ordner nach \`public/images/\`
3. Committen und pushen Sie die Änderungen

## Datum
Exportiert am: ${new Date().toLocaleString('de-DE')}
`;
      zip.file('README.md', readme);

      setR2ExportStatus('Erstelle ZIP-Archiv...');

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sechszirbenhuette-r2-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setR2ExportStatus(`Fertig! ${downloaded} Bilder exportiert${errors > 0 ? `, ${errors} Fehler` : ''}`);
      setMigrationResults(
        [
          `✓ ${downloaded} Bilder erfolgreich exportiert`,
          ...Object.entries(manifest).map(([cat, info]) => `  - ${cat}: ${info.count} Bilder`),
          errors > 0 ? `❌ ${errors} Bilder konnten nicht heruntergeladen werden` : '',
          '',
          '📋 Nächste Schritte:',
          '  1. ZIP-Datei entpacken',
          '  2. "gallery" Ordner nach public/images/ kopieren',
          '  3. git add . && git commit -m "Add gallery images" && git push',
        ].filter(Boolean)
      );
    } catch (err) {
      console.error('R2 export error:', err);
      setError(`Fehler beim R2-Export: ${err instanceof Error ? err.message : 'Unbekannt'}`);
      setR2ExportStatus('');
    } finally {
      setIsExportingR2(false);
      setR2ExportProgress(0);
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
          headers: { 'x-admin-password': adminPassword },
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
          headers: { 'x-admin-password': adminPassword },
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
        headers: { 'x-admin-password': adminPassword },
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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ id: image.id, display_order: prevImage.display_order }),
      });
      await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ id: image.id, display_order: nextImage.display_order }),
      });
      await fetch('/api/admin/images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
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
      const response = await fetch('/api/admin/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
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

  return {
    // State
    error,
    setError,
    images,
    loading,
    uploadFiles,
    isDragging,
    isUploading,
    isCheckingDuplicates,
    duplicateGroups,
    showDuplicates,
    setShowDuplicates,
    selectedForDeletion,
    selectedCategory,
    uploadCategory,
    setUploadCategory,
    showHeroOnly,
    migrationResults,
    isMigrating,
    showDbPanel,
    setShowDbPanel,
    editingImage,
    editAltText,
    setEditAltText,
    editCategory,
    setEditCategory,
    editDisplayOrder,
    setEditDisplayOrder,
    isSaving,
    isDownloading,
    downloadProgress,
    showSeasonPanel,
    setShowSeasonPanel,
    summerImages,
    winterImages,
    replacingSeasonImage,
    setReplacingSeasonImage,
    isReplacingImage,
    isExportingR2,
    r2ExportProgress,
    r2ExportStatus,
    // Derived
    pendingCount,
    doneCount,
    errorCount,
    // Handlers
    loadImages,
    handleCategoryFilter,
    handleHeroFilter,
    loadSeasonImages,
    handleSeasonImageReplace,
    downloadAllPhotos,
    exportR2ToGitHub,
    findDuplicatesInGallery,
    toggleDeletionSelection,
    selectAllDuplicatesExceptFirst,
    deleteSelectedDuplicates,
    handleFilesSelected,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    updateFileStatus,
    uploadAllFiles,
    clearCompleted,
    handleDelete,
    toggleHero,
    openEditModal,
    closeEditModal,
    saveImageChanges,
    moveImageUp,
    moveImageDown,
    runMigration,
  };
}
