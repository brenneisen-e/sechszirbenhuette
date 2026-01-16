'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { X, Images, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  src: string;
  title: string;
  description: string;
  category: string;
}

interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
}

// Map database categories to gallery categories
const categoryMap: Record<string, string> = {
  exterior: 'aussen',
  aussen: 'aussen',
  living: 'wohnen',
  wohnen: 'wohnen',
  innen: 'wohnen',
  bedrooms: 'schlafen',
  schlafen: 'schlafen',
  kitchen: 'kueche',
  kueche: 'kueche',
  bathroom: 'bad',
  bad: 'bad',
  sauna: 'bad',
  wellness: 'bad',
  surroundings: 'umgebung',
  umgebung: 'umgebung',
  extras: 'extras',
  // Kinderausflüge
  'heidi-alm': 'heidi-alm',
  'turracher-hoehe': 'turracher-hoehe',
  'ossiacher-see': 'ossiacher-see',
  'panoramaweg': 'panoramaweg',
  'tierpark': 'tierpark',
  'gerlitzen': 'gerlitzen',
  'nockalm': 'nockalm',
  // Hundewanderungen
  'hund-falkert': 'hund-falkert',
  'hund-rodresnock': 'hund-rodresnock',
  'hund-drei-seen': 'hund-drei-seen',
  'hund-hochrindl': 'hund-hochrindl',
  'hund-millstaetter': 'hund-millstaetter',
};

// Fallback static images
const fallbackImages: GalleryImage[] = [
  { src: '/images/fallback/exterior-1.jpg', title: 'Sechszirbenhütte', description: 'Traumhafte Berglage auf 1700m', category: 'aussen' },
  { src: '/images/fallback/living-1.jpg', title: 'Wohnraum', description: 'Gemütlicher Holzofen', category: 'wohnen' },
  { src: '/images/fallback/bedroom-1.jpg', title: 'Schlafzimmer', description: 'Komfortable Betten', category: 'schlafen' },
  { src: '/images/fallback/kitchen-1.jpg', title: 'Küche', description: 'Vollausgestattet', category: 'kueche' },
  { src: '/images/fallback/bathroom-1.jpg', title: 'Bad', description: 'Modern mit Fußbodenheizung', category: 'bad' },
];

// Parse alt_text format "Title - Description" into title and description
function parseAltText(altText: string): { title: string; description: string } {
  const parts = altText.split(' - ');
  if (parts.length >= 2) {
    return { title: parts[0], description: parts.slice(1).join(' - ') };
  }
  return { title: altText, description: '' };
}

export function Galerie() {
  const { t, language } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [images, setImages] = useState<GalleryImage[]>(fallbackImages);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const imagesPerPage = 4;

  // Reset pagination when category changes
  useEffect(() => {
    setCurrentPage(0);
    setIsExpanded(false);
  }, [selectedCategory]);

  // Fetch images from API on mount
  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/media');
        const data = await response.json() as { media?: MediaItem[] };

        if (data.media && data.media.length > 0) {
          const galleryCategories = [
            'exterior', 'aussen', 'living', 'wohnen', 'innen', 'bedrooms', 'schlafen',
            'kitchen', 'kueche', 'bathroom', 'bad', 'sauna', 'wellness', 'surroundings',
            'umgebung', 'extras',
            // Kinderausflüge
            'heidi-alm', 'turracher-hoehe', 'ossiacher-see', 'panoramaweg',
            'tierpark', 'gerlitzen', 'nockalm',
            // Hundewanderungen
            'hund-falkert', 'hund-rodresnock', 'hund-drei-seen', 'hund-hochrindl', 'hund-millstaetter'
          ];
          const allMedia = data.media;
          const dbImages: GalleryImage[] = allMedia
            .filter((img: MediaItem) => galleryCategories.includes(img.category))
            .map((img: MediaItem) => {
              const { title, description } = parseAltText(img.alt_text || img.title || '');
              return {
                src: img.url,
                title,
                description,
                category: categoryMap[img.category] || img.category,
              };
            });

          if (dbImages.length > 0) {
            setImages(dbImages);
          }
        }
      } catch (error) {
        console.error('Failed to fetch images from API:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, []);

  const categoryLabels: Record<string, { de: string; en: string }> = {
    all: { de: 'Alle', en: 'All' },
    aussen: { de: 'Außenbereich', en: 'Exterior' },
    wohnen: { de: 'Wohnbereich', en: 'Living' },
    schlafen: { de: 'Schlafzimmer', en: 'Bedrooms' },
    kueche: { de: 'Küche', en: 'Kitchen' },
    bad: { de: 'Bad & Sauna', en: 'Bath & Sauna' },
    umgebung: { de: 'Umgebung', en: 'Surroundings' },
    extras: { de: 'Extras', en: 'Extras' },
    // Kinderausflüge
    'heidi-alm': { de: 'Heidi-Alm', en: 'Heidi-Alm' },
    'turracher-hoehe': { de: 'Turracher Höhe', en: 'Turracher Höhe' },
    'ossiacher-see': { de: 'Ossiacher See', en: 'Lake Ossiach' },
    'panoramaweg': { de: 'Panoramaweg', en: 'Panorama Trail' },
    'tierpark': { de: 'Tierpark', en: 'Animal Park' },
    'gerlitzen': { de: 'Gerlitzen-Alpe', en: 'Gerlitzen-Alpe' },
    'nockalm': { de: 'Nockalm', en: 'Nockalm' },
    // Hundewanderungen
    'hund-falkert': { de: 'Falkert & See', en: 'Falkert & Lake' },
    'hund-rodresnock': { de: 'Rodresnock', en: 'Rodresnock' },
    'hund-drei-seen': { de: 'Drei Seen', en: 'Three Lakes' },
    'hund-hochrindl': { de: 'Hochrindl', en: 'Hochrindl' },
    'hund-millstaetter': { de: 'Millstätter See', en: 'Millstätter See' },
  };

  // Build categories dynamically - only show main gallery categories
  const categoryIds = ['all', 'aussen', 'wohnen', 'schlafen', 'kueche', 'bad', 'umgebung', 'extras'];

  const categories = categoryIds.map(id => ({
    id,
    label: categoryLabels[id]?.[language as 'de' | 'en'] || id,
    count: id === 'all' ? images.length : images.filter(img => img.category === id).length,
  }));

  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter(img => img.category === selectedCategory);

  // Calculate paginated images
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const displayedImages = isExpanded
    ? filteredImages
    : filteredImages.slice(currentPage * imagesPerPage, (currentPage + 1) * imagesPerPage);

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <section id="galerie" className="py-20 bg-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-logo-green/10 rounded-full mb-4">
            <Images className="w-8 h-8 text-logo-green" strokeWidth={1.5} />
          </div>
          <h2
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green mb-4"
            style={{ fontFamily: 'RetroSignature, cursive' }}
          >
            {language === 'de' ? 'Galerie' : 'Gallery'}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            {language === 'de'
              ? 'Entdecken Sie die Sechszirbenhütte in Bildern'
              : 'Discover the Sechszirbenhütte in pictures'}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              data-category={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-logo-green text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label} {category.count > 0 && <span className="text-sm opacity-75">({category.count})</span>}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-wood-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">{language === 'de' ? 'Bilder werden geladen...' : 'Loading images...'}</p>
          </div>
        )}

        {/* Image Grid */}
        {!isLoading && (
          <>
            <div className="relative">
              {/* Previous Button (only when not expanded) */}
              {!isExpanded && filteredImages.length > imagesPerPage && (
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={!canGoPrev}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition -translate-x-1/2 ${!canGoPrev ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Next Button (only when not expanded) */}
              {!isExpanded && filteredImages.length > imagesPerPage && (
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={!canGoNext}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${!canGoNext ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Image Grid */}
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${!isExpanded ? 'mx-4 md:mx-8' : ''}`}>
                {displayedImages.map((image, index) => (
                  <div
                    key={`${currentPage}-${index}`}
                    onClick={() => setSelectedImage(images.indexOf(image))}
                    className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer group"
                  >
                    <Image
                      src={image.src}
                      alt={image.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                      <div className="text-white p-4 w-full">
                        <h3 className="font-bold text-lg mb-1">{image.title}</h3>
                        {image.description && (
                          <p className="text-sm opacity-90">{image.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination indicator and Expand Button */}
            {filteredImages.length > imagesPerPage && (
              <div className="flex items-center justify-between mt-6">
                {/* Page indicator (left side - only when not expanded) */}
                {!isExpanded ? (
                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          currentPage === index
                            ? 'bg-logo-green w-6'
                            : 'bg-logo-green/30 hover:bg-logo-green/50'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <div />
                )}

                {/* Expand/Collapse Button (right side) */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-4 py-2 rounded-lg font-medium text-sm bg-logo-green text-white hover:bg-logo-green/90 transition-all"
                >
                  {isExpanded
                    ? (language === 'de' ? 'Galerie einklappen' : 'Collapse Gallery')
                    : (language === 'de' ? 'Galerie ausklappen' : 'Expand Gallery')}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && filteredImages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {language === 'de'
                ? 'Keine Bilder in dieser Kategorie'
                : 'No images in this category'}
            </p>
          </div>
        )}

        {/* Lightbox */}
        {selectedImage !== null && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage((selectedImage - 1 + images.length) % images.length);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/20 hover:bg-white/40 transition z-20"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage((selectedImage + 1) % images.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/20 hover:bg-white/40 transition z-20"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition p-2 rounded-full hover:bg-white/10"
                aria-label="Schließen"
              >
                <X className="w-8 h-8" strokeWidth={2} />
              </button>
              <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
                <Image
                  src={images[selectedImage].src}
                  alt={images[selectedImage].title}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
              <div className="mt-4 text-white text-center">
                <h3 className="text-2xl font-bold mb-2">{images[selectedImage].title}</h3>
                {images[selectedImage].description && (
                  <p className="text-lg opacity-90">{images[selectedImage].description}</p>
                )}
                <p className="text-sm text-gray-400 mt-2">
                  {selectedImage + 1} / {images.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
