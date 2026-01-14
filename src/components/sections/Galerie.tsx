'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { X, Images } from 'lucide-react';

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

  // Fetch images from API on mount
  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/media');
        const data = await response.json() as { media?: MediaItem[] };

        if (data.media && data.media.length > 0) {
          const galleryCategories = ['exterior', 'aussen', 'living', 'wohnen', 'innen', 'bedrooms', 'schlafen', 'kitchen', 'kueche', 'bathroom', 'bad', 'sauna', 'wellness', 'surroundings', 'umgebung', 'extras'];
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
  };

  const categories = [
    { id: 'all', label: categoryLabels.all[language as 'de' | 'en'], count: images.length },
    { id: 'aussen', label: categoryLabels.aussen[language as 'de' | 'en'], count: images.filter(img => img.category === 'aussen').length },
    { id: 'wohnen', label: categoryLabels.wohnen[language as 'de' | 'en'], count: images.filter(img => img.category === 'wohnen').length },
    { id: 'schlafen', label: categoryLabels.schlafen[language as 'de' | 'en'], count: images.filter(img => img.category === 'schlafen').length },
    { id: 'kueche', label: categoryLabels.kueche[language as 'de' | 'en'], count: images.filter(img => img.category === 'kueche').length },
    { id: 'bad', label: categoryLabels.bad[language as 'de' | 'en'], count: images.filter(img => img.category === 'bad').length },
    { id: 'umgebung', label: categoryLabels.umgebung[language as 'de' | 'en'], count: images.filter(img => img.category === 'umgebung').length },
    { id: 'extras', label: categoryLabels.extras[language as 'de' | 'en'], count: images.filter(img => img.category === 'extras').length },
  ];

  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter(img => img.category === selectedCategory);

  return (
    <section id="galerie" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-wood-100 rounded-full mb-4">
            <Images className="w-8 h-8 text-wood-700" strokeWidth={1.5} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {language === 'de' ? 'Galerie' : 'Gallery'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
                  ? 'bg-wood-600 text-white shadow-md'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredImages.map((image, index) => (
              <div
                key={index}
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
            <div className="relative max-w-6xl w-full">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
