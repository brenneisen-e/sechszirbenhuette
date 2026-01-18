'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import Image from 'next/image';
import { AdaptiveImage } from '@/components/ui/AdaptiveImage';
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

// Fallback static images from local gallery
const fallbackImages: GalleryImage[] = [
  // Wohnbereich
  { src: '/images/innen/Wohnzimmer_01.jpg', title: 'Gemütliche Stube', description: 'Eckbank mit Holztisch', category: 'wohnen' },
  { src: '/images/innen/Wohnzimmer_02_Galerie.jpg', title: 'Wohnzimmer', description: 'Blick von der Galerie', category: 'wohnen' },
  { src: '/images/innen/Stube.jpg', title: 'Wohnbereich', description: 'Bauernschrank und Treppe', category: 'wohnen' },
  { src: '/images/innen/Stube_02.jpg', title: 'Stube', description: 'Gemütliche Atmosphäre', category: 'wohnen' },
  { src: '/images/innen/Stube_03.jpg', title: 'Stube', description: 'Rustikales Ambiente', category: 'wohnen' },
  { src: '/images/innen/Kamin.jpg', title: 'Kamin', description: 'Wohlige Wärme', category: 'wohnen' },
  { src: '/images/innen/Treppenaufgang.jpg', title: 'Treppenaufgang', description: 'Zum Obergeschoss', category: 'wohnen' },
  // Küche
  { src: '/images/innen/Küche_01.jpg', title: 'Küche', description: 'Mit Bauernschrank', category: 'kueche' },
  { src: '/images/innen/Küche_02.jpg', title: 'Küchenzeile', description: 'Voll ausgestattet', category: 'kueche' },
  { src: '/images/innen/Kaffeemaschinen.jpg', title: 'Kaffeemaschine', description: 'Für den perfekten Kaffee', category: 'kueche' },
  // Schlafzimmer
  { src: '/images/innen/Schlafzimmer_groß.jpg', title: 'Großes Schlafzimmer', description: 'Doppelbett und Einzelbett', category: 'schlafen' },
  { src: '/images/innen/Schlafzimmer_klein.jpg', title: 'Kleines Schlafzimmer', description: 'Gemütliches Doppelbett', category: 'schlafen' },
  // Bad & Sauna
  { src: '/images/innen/Sauna.jpg', title: 'Finnische Sauna', description: 'Eigene Sauna im Haus', category: 'bad' },
  { src: '/images/innen/Badezimmer.jpg', title: 'Badezimmer', description: 'Mit Dusche', category: 'bad' },
  { src: '/images/innen/WC.jpg', title: 'WC', description: 'Separates WC', category: 'bad' },
  { src: '/images/innen/Ruheraum.jpg', title: 'Ruheraum', description: 'Entspannung nach der Sauna', category: 'bad' },
  { src: '/images/innen/Ruheraum_02.jpg', title: 'Ruheraum', description: 'Wellness-Bereich', category: 'bad' },
  { src: '/images/innen/Ruheraum Dusche.jpg', title: 'Dusche', description: 'Im Ruheraum', category: 'bad' },
  // Außenbereich
  { src: '/images/aussen/Sommerhütte.jpg', title: 'Sechszirbenhütte', description: 'Im Sommer mit Balkon', category: 'aussen' },
  { src: '/images/aussen/Herbst.jpg', title: 'Herbstansicht', description: 'Die Hütte im Herbst', category: 'aussen' },
  { src: '/images/aussen/Balkon.jpg', title: 'Verschneiter Balkon', description: 'Winterstimmung', category: 'aussen' },
  // Umgebung
  { src: '/images/aussen/Nockberge.jpg', title: 'Nockberge Panorama', description: 'Atemberaubende Berglandschaft', category: 'umgebung' },
  { src: '/images/aussen/Falkertsee_Winter.png', title: 'Falkertsee', description: 'Mystische Winterstimmung', category: 'umgebung' },
  { src: '/images/aussen/Kühe_Rodresnock.jpg', title: 'Almkühe', description: 'Am Rodresnock', category: 'umgebung' },
  // Aktivitäten
  { src: '/images/aussen/Snowboard.jpg', title: 'Snowboarden', description: 'Im Tiefschnee', category: 'extras' },
  { src: '/images/aussen/Skigebiet.jpeg', title: 'Skigebiet Falkert', description: 'Familiäres Skigebiet', category: 'extras' },
  { src: '/images/aussen/Gravel.jpg', title: 'Gravelbiken', description: 'In den Lärchenwäldern', category: 'extras' },
  { src: '/images/aussen/Nockiflitzer.jpg', title: 'Nocki-Flitzer', description: 'Sommerrodelbahn', category: 'extras' },
  { src: '/images/aussen/Pilze.jpg', title: 'Pilze sammeln', description: 'Im Wald', category: 'extras' },
  { src: '/images/aussen/Angeln.jpg', title: 'Angeln', description: 'Am Bergsee', category: 'extras' },
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
  const { getText, getTextStyle } = useContentTexts();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Start with empty images to prevent hydration mismatch
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const imagesPerPage = 4;

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detect mobile viewport (only after mount)
  useEffect(() => {
    if (!isMounted) return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMounted]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((filteredLength: number) => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && mobileIndex < filteredLength - 1) {
        // Swipe left - next image
        setMobileIndex(prev => prev + 1);
      } else if (diff < 0 && mobileIndex > 0) {
        // Swipe right - previous image
        setMobileIndex(prev => prev - 1);
      }
    }
  }, [mobileIndex]);

  // Reset pagination when category changes
  useEffect(() => {
    setCurrentPage(0);
    setIsExpanded(false);
    setMobileIndex(0);
  }, [selectedCategory]);

  // Fetch images from API on mount (only after client mount to prevent hydration mismatch)
  useEffect(() => {
    if (!isMounted) return;

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
          } else {
            // Use fallback images if no images from database
            setImages(fallbackImages);
          }
        } else {
          // Use fallback images if no media returned
          setImages(fallbackImages);
        }
      } catch (error) {
        console.error('Failed to fetch images from API:', error);
        // Use fallback images on error
        setImages(fallbackImages);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, [isMounted]);

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
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-logo-green mb-4"
            style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('galerie_title') }}
          >
            {getText('galerie_title') || (language === 'de' ? 'Galerie' : 'Gallery')}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto" style={getTextStyle('galerie_subtitle')}>
            {getText('galerie_subtitle') || (language === 'de'
              ? 'Entdecken Sie die Sechszirbenhütte in Bildern'
              : 'Discover the Sechszirbenhütte in pictures')}
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
            {/* Mobile Carousel */}
            {isMobile && filteredImages.length > 0 && (
              <div className="md:hidden">
                <div
                  className="relative overflow-hidden rounded-xl"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(filteredImages.length)}
                >
                  {/* Current Image */}
                  <div
                    onClick={() => setSelectedImage(images.indexOf(filteredImages[mobileIndex]))}
                    className="relative aspect-[4/3] bg-gray-100 cursor-pointer"
                  >
                    <AdaptiveImage
                      src={filteredImages[mobileIndex].src}
                      alt={filteredImages[mobileIndex].title || 'Galeriebild'}
                      fill
                      className="object-cover"
                      sizes="100vw"
                      priority
                    />
                  </div>

                  {/* Navigation Arrows */}
                  {mobileIndex > 0 && (
                    <button
                      onClick={() => setMobileIndex(prev => prev - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center text-gray-700"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {mobileIndex < filteredImages.length - 1 && (
                    <button
                      onClick={() => setMobileIndex(prev => prev + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center text-gray-700"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {filteredImages.slice(0, Math.min(filteredImages.length, 10)).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setMobileIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        mobileIndex === index
                          ? 'bg-logo-green w-6'
                          : 'bg-logo-green/30 w-2'
                      }`}
                    />
                  ))}
                  {filteredImages.length > 10 && (
                    <span className="text-xs text-gray-500 ml-2">+{filteredImages.length - 10}</span>
                  )}
                </div>

                {/* Image counter */}
                <p className="text-center text-sm text-gray-500 mt-2">
                  {mobileIndex + 1} / {filteredImages.length}
                </p>
              </div>
            )}

            {/* Desktop Grid */}
            <div className="hidden md:block relative">
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
              <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${!isExpanded ? 'mx-8' : ''}`}>
                {displayedImages.map((image, index) => (
                  <div
                    key={`${currentPage}-${index}`}
                    onClick={() => setSelectedImage(images.indexOf(image))}
                    className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer group"
                  >
                    <AdaptiveImage
                      src={image.src}
                      alt={image.title || 'Galeriebild'}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                      sizes="(max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination indicator and Expand Button (Desktop only) */}
            {!isMobile && filteredImages.length > imagesPerPage && (
              <div className="hidden md:flex items-center justify-between mt-6">
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
                <p className="text-sm text-gray-400">
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
