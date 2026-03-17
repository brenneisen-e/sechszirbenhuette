'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Compass,
  Monitor,
  Tablet,
  Smartphone,
  Mountain,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import Image from 'next/image';
import { compressImage } from './utils';

interface HeroImageRecord {
  id: number;
  side: string;
  aspect_ratio: string;
  image_key: string;
  image_url: string;
  alt_text: string;
  created_at: string;
}

interface HeroImageManagerProps {
  adminPassword: string;
}

interface AspectRatioSlot {
  ratio: string;
  label: string;
  device: string;
  icon: typeof Monitor;
  width: number;
  height: number;
  previewAspect: string;
}

const ASPECT_RATIO_SLOTS: AspectRatioSlot[] = [
  { ratio: '21:9', label: '21:9', device: 'Desktop / Laptop', icon: Monitor, width: 2520, height: 1080, previewAspect: 'aspect-[21/9]' },
  { ratio: '16:9', label: '16:9', device: 'Tablet', icon: Tablet, width: 1920, height: 1080, previewAspect: 'aspect-video' },
  { ratio: '4:5', label: '4:5', device: 'Mobil / Handy', icon: Smartphone, width: 1080, height: 1350, previewAspect: 'aspect-[4/5]' },
];

const SIDES = [
  { value: 'nord', label: 'Nordseite', color: 'blue' },
  { value: 'sued', label: 'Südseite', color: 'amber' },
] as const;

/**
 * Compresses and CENTER-CROPS an image to the target aspect ratio.
 * Example: A 16:9 photo uploaded to the 21:9 slot gets cropped
 * to 21:9 (top/bottom trimmed) so it fills the hero without CSS cropping.
 */
async function compressForAspectRatio(file: File, targetWidth: number, targetHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      const srcW = img.width;
      const srcH = img.height;
      const targetRatio = targetWidth / targetHeight;
      const srcRatio = srcW / srcH;

      // ── Center-crop source to target aspect ratio ──
      let cropX = 0;
      let cropY = 0;
      let cropW = srcW;
      let cropH = srcH;

      if (srcRatio > targetRatio) {
        // Source is wider → crop left/right
        cropW = Math.round(srcH * targetRatio);
        cropX = Math.round((srcW - cropW) / 2);
      } else if (srcRatio < targetRatio) {
        // Source is taller → crop top/bottom
        cropH = Math.round(srcW / targetRatio);
        cropY = Math.round((srcH - cropH) / 2);
      }

      // ── Scale to target output dimensions ──
      let outW = targetWidth;
      let outH = targetHeight;
      // If source crop is smaller than target, don't upscale
      if (cropW < targetWidth || cropH < targetHeight) {
        const scale = Math.min(targetWidth / cropW, targetHeight / cropH);
        outW = Math.round(cropW * scale);
        outH = Math.round(cropH * scale);
      }

      canvas.width = outW;
      canvas.height = outH;
      ctx?.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

      let quality = 0.88;
      const maxSize = 3 * 1024 * 1024;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Komprimierung fehlgeschlagen'));
              return;
            }
            if (blob.size > maxSize && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };

    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    img.src = URL.createObjectURL(file);
  });
}

export function HeroImageManager({ adminPassword }: HeroImageManagerProps) {
  const [heroImages, setHeroImages] = useState<HeroImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null); // "nord-21:9" format
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadHeroImages = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/hero-images');
      const data = (await response.json()) as { heroImages?: HeroImageRecord[] };
      setHeroImages(data.heroImages || []);
    } catch (err) {
      console.error('Error loading hero images:', err);
      setError('Fehler beim Laden der Hero-Bilder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHeroImages();
  }, [loadHeroImages]);

  const getImage = (side: string, ratio: string): HeroImageRecord | undefined => {
    return heroImages.find((img: HeroImageRecord) => img.side === side && img.aspect_ratio === ratio);
  };

  const handleUpload = async (side: string, ratio: string, file: File) => {
    const slotKey = `${side}-${ratio}`;
    setUploading(slotKey);
    setError('');
    setSuccessMsg('');

    try {
      const slot = ASPECT_RATIO_SLOTS.find(s => s.ratio === ratio);
      if (!slot) throw new Error('Unknown aspect ratio');

      // Compress image for the target resolution
      const compressedBlob = await compressForAspectRatio(file, slot.width, slot.height);

      const formData = new FormData();
      formData.append('file', compressedBlob, file.name.replace(/\.[^/.]+$/, '.jpg'));
      formData.append('side', side);
      formData.append('aspectRatio', ratio);
      formData.append('altText', `Sechszirbenhütte - ${side === 'nord' ? 'Nordseite' : 'Südseite'}`);

      const response = await fetch('/api/admin/hero-images', {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      await loadHeroImages();
      const sideLabel = side === 'nord' ? 'Nordseite' : 'Südseite';
      setSuccessMsg(`${sideLabel} ${ratio} erfolgreich hochgeladen`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (side: string, ratio: string) => {
    const sideLabel = side === 'nord' ? 'Nordseite' : 'Südseite';
    if (!confirm(`${sideLabel} ${ratio} Bild wirklich löschen?`)) return;

    setError('');
    try {
      const response = await fetch(`/api/admin/hero-images?side=${side}&ratio=${encodeURIComponent(ratio)}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword },
      });

      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      await loadHeroImages();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Fehler beim Löschen');
    }
  };

  const getCompletionCount = (side: string): number => {
    return ASPECT_RATIO_SLOTS.filter(slot => getImage(side, slot.ratio)).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Compass className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Responsive Hero-Bilder</h3>
            <p className="text-sm text-gray-500">Nordseite & Südseite in 3 Formaten</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {heroImages.length} / 6 Bilder
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Mountain className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <p className="font-medium mb-1">Optimale Bildgrößen:</p>
            <ul className="space-y-1 text-emerald-700">
              <li><strong>21:9</strong> Desktop/Laptop — min. 2520×1080 px</li>
              <li><strong>16:9</strong> Tablet — min. 1920×1080 px</li>
              <li><strong>4:5</strong> Mobil/Handy — min. 1080×1350 px</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        /* Two side cards */
        SIDES.map(({ value: side, label: sideLabel, color }) => {
          const completionCount = getCompletionCount(side);
          const isComplete = completionCount === 3;
          const borderColor = color === 'blue' ? 'border-blue-200' : 'border-amber-200';
          const bgColor = color === 'blue' ? 'bg-blue-50' : 'bg-amber-50';
          const headerBg = color === 'blue' ? 'bg-blue-100' : 'bg-amber-100';
          const headerText = color === 'blue' ? 'text-blue-800' : 'text-amber-800';
          const badgeBg = isComplete
            ? 'bg-green-100 text-green-700'
            : color === 'blue' ? 'bg-blue-200 text-blue-700' : 'bg-amber-200 text-amber-700';

          return (
            <div key={side} className={`border ${borderColor} rounded-xl overflow-hidden`}>
              {/* Side Header */}
              <div className={`${headerBg} px-5 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Compass className={`w-5 h-5 ${headerText}`} />
                  <h4 className={`font-bold ${headerText}`}>{sideLabel}</h4>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeBg}`}>
                  {completionCount}/3 {isComplete ? '✓' : ''}
                </span>
              </div>

              {/* Aspect Ratio Slots */}
              <div className={`${bgColor} p-4`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ASPECT_RATIO_SLOTS.map((slot) => {
                    const image = getImage(side, slot.ratio);
                    const slotKey = `${side}-${slot.ratio}`;
                    const isUploading = uploading === slotKey;
                    const Icon = slot.icon;

                    return (
                      <div key={slot.ratio} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* Slot Header */}
                        <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">{slot.label}</span>
                          </div>
                          <span className="text-xs text-gray-400">{slot.device}</span>
                        </div>

                        {/* Image Preview or Upload Area */}
                        <div className="p-3">
                          {image ? (
                            <div className="space-y-2">
                              <div className={`relative ${slot.previewAspect} w-full rounded overflow-hidden bg-gray-100`}>
                                <Image
                                  src={image.image_url}
                                  alt={image.alt_text}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleUpload(side, slot.ratio, f);
                                      e.target.value = '';
                                    }}
                                    disabled={isUploading}
                                  />
                                  <div className="w-full px-2 py-1.5 text-xs text-center bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-center gap-1">
                                    {isUploading ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Upload className="w-3 h-3" />
                                    )}
                                    Ersetzen
                                  </div>
                                </label>
                                <button
                                  onClick={() => handleDelete(side, slot.ratio)}
                                  disabled={isUploading}
                                  className="px-2 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUpload(side, slot.ratio, f);
                                  e.target.value = '';
                                }}
                                disabled={isUploading}
                              />
                              <div className={`${slot.previewAspect} w-full rounded border-2 border-dashed border-gray-300 hover:border-emerald-400 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors`}>
                                {isUploading ? (
                                  <Loader2 className="w-8 h-8 animate-spin" />
                                ) : (
                                  <>
                                    <ImageIcon className="w-8 h-8 mb-1" />
                                    <span className="text-xs">Bild hochladen</span>
                                    <span className="text-xs text-gray-300">{slot.width}×{slot.height}</span>
                                  </>
                                )}
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
