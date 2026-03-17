'use client';

import { Image as ImageIcon, RefreshCw, Download, Search, Star, AlertCircle, X, Loader2, Trash2, Edit3, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';

import { ImageRecord, CATEGORIES, getCategoryLabel } from '../image-manager';

interface GalleryProps {
  images: ImageRecord[];
  loading: boolean;
  error: string;
  selectedCategory: string;
  showHeroOnly: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isCheckingDuplicates: boolean;
  onClearError: () => void;
  onRefresh: () => void;
  onDownloadAll: () => void;
  onFindDuplicates: () => void;
  onCategoryFilter: (category: string) => void;
  onHeroFilter: () => void;
  onToggleHero: (image: ImageRecord) => void;
  onOpenEditModal: (image: ImageRecord) => void;
  onMoveUp: (image: ImageRecord) => void;
  onMoveDown: (image: ImageRecord) => void;
  onDelete: (imageId: string) => void;
}

export function Gallery({
  images,
  loading,
  error,
  selectedCategory,
  showHeroOnly,
  isDownloading,
  downloadProgress,
  isCheckingDuplicates,
  onClearError,
  onRefresh,
  onDownloadAll,
  onFindDuplicates,
  onCategoryFilter,
  onHeroFilter,
  onToggleHero,
  onOpenEditModal,
  onMoveUp,
  onMoveDown,
  onDelete,
}: GalleryProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-6 h-6" />
          Bildergalerie ({images.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onDownloadAll}
            disabled={isDownloading}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? `${downloadProgress}%` : 'ZIP'}
          </button>
          <button
            onClick={onFindDuplicates}
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
          onClick={() => onCategoryFilter('')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !selectedCategory && !showHeroOnly ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        <button
          onClick={onHeroFilter}
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
            onClick={() => onCategoryFilter(cat.value)}
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
            <button onClick={onClearError} className="ml-auto text-red-500 hover:text-red-700">
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
                  onClick={() => onToggleHero(image)}
                  className={`p-2 rounded-full ${image.is_hero ? 'bg-amber-500 text-white' : 'bg-white text-gray-700'}`}
                >
                  <Star className="w-4 h-4" />
                </button>
                <button onClick={() => onOpenEditModal(image)} className="p-2 bg-white rounded-full text-gray-700">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => onMoveUp(image)} className="p-2 bg-white rounded-full text-gray-700">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => onMoveDown(image)} className="p-2 bg-white rounded-full text-gray-700">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(image.id)} className="p-2 bg-red-500 rounded-full text-white">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
