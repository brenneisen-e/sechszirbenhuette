'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Home,
  Bed,
  UtensilsCrossed,
  Bath,
  Flame,
  Sofa,
  TreePine,
  Wifi,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  title: string;
}

interface AmenityCard {
  key: string;
  icon: React.ComponentType<{ size?: number }>;
  galleryCategory: string | null;
  items: string[];
  hint?: string;
}

// Card configuration with gallery category mapping
const amenityCards: AmenityCard[] = [
  {
    key: 'living',
    icon: Sofa,
    galleryCategory: 'wohnen',
    items: ['Schwedenofen', 'Essecke für 8-10 Personen', 'Satellit-TV & DVD', 'Stereoanlage']
  },
  {
    key: 'kitchen',
    icon: UtensilsCrossed,
    galleryCategory: 'kueche',
    items: ['Voll ausgestattet', 'Spülmaschine', 'Ceranherd & Backofen', 'Mikrowelle mit Grill']
  },
  {
    key: 'rooms',
    icon: Bed,
    galleryCategory: 'schlafen',
    items: ['1 Galeriezimmer (2 Einzelbetten)', '1 Doppelbettzimmer', '1 Zimmer mit 2 Stockbetten', 'Platz für 8 Personen'],
    hint: 'Bettwäsche selbst mitbringen oder Komfort-Paket buchen'
  },
  {
    key: 'sauna',
    icon: Flame,
    galleryCategory: 'bad',
    items: ['Sauna mit Sanarium', 'Ruheraum mit Liegen', 'Extra Dusche mit Kneipp-Schlauch', 'Fußbodenheizung']
  },
  {
    key: 'bathroom',
    icon: Bath,
    galleryCategory: 'bad',
    items: ['Dusche & WC', 'Doppelwaschbecken', 'Fußbodenheizung', 'Modern ausgestattet'],
    hint: 'Handtücher selbst mitbringen oder Komfort-Paket buchen'
  },
  {
    key: 'outdoor',
    icon: TreePine,
    galleryCategory: 'aussen',
    items: ['15m² Balkon mit Außentreppe', '650m² Grundstück', '2 Parkplätze', 'Grill & Gartenmöbel']
  },
  {
    key: 'equipment',
    icon: Wifi,
    galleryCategory: null,
    items: ['WLAN / ADSL', 'Satelliten-TV', 'Grill', 'Haustiere willkommen']
  },
  {
    key: 'location',
    icon: MapPin,
    galleryCategory: 'umgebung',
    items: ['Skigebiet Falkert vor Ort', 'Turracher Höhe (20 Min.)', 'Bad Kleinkirchheim (25 Min.)', 'Viele Wanderwege']
  },
];

// German titles for the cards
const cardTitles: Record<string, { de: string; en: string }> = {
  living: { de: 'Wohnbereich', en: 'Living Area' },
  kitchen: { de: 'Küche', en: 'Kitchen' },
  rooms: { de: 'Schlafzimmer', en: 'Bedrooms' },
  sauna: { de: 'Sauna & Wellness', en: 'Sauna & Wellness' },
  bathroom: { de: 'Badezimmer', en: 'Bathroom' },
  outdoor: { de: 'Außenbereich', en: 'Outdoor' },
  equipment: { de: 'Ausstattung', en: 'Amenities' },
  location: { de: 'Lage', en: 'Location' },
};

interface CardImage {
  url: string;
  title?: string;
  alt_text?: string;
}

export function Ferienhaus() {
  const { t, language } = useLanguage();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [cardImages, setCardImages] = useState<Record<string, CardImage>>({});

  useEffect(() => {
    // Fetch gallery images
    fetch('/api/media?category=innen&type=image')
      .then((res) => res.json())
      .then((data) => {
        if (data.media) {
          setImages(data.media);
        }
      })
      .catch(() => {});

    // Fetch amenity card images
    fetch('/api/amenity-images')
      .then((res) => res.json())
      .then((data) => {
        if (data.byCard) {
          setCardImages(data.byCard);
        }
      })
      .catch(() => {});
  }, []);

  const openLightbox = (index: number) => {
    setSelectedImage(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = '';
  };

  const nextImage = () => {
    if (selectedImage !== null && images.length > 0) {
      setSelectedImage((selectedImage + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null && images.length > 0) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length);
    }
  };

  const scrollToGalleryCategory = (category: string | null) => {
    const galerie = document.querySelector('#galerie');
    if (galerie) {
      galerie.scrollIntoView({ behavior: 'smooth' });
      if (category) {
        setTimeout(() => {
          const categoryButton = document.querySelector(`#galerie button[data-category="${category}"]`) as HTMLButtonElement;
          if (categoryButton) {
            categoryButton.click();
          }
        }, 500);
      }
    }
  };

  return (
    <section id="ferienhaus" className="py-20 bg-transparent">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-6">
            <Home size={32} strokeWidth={1.5} />
          </div>
          <h2
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-logo-green mb-4"
            style={{ fontFamily: 'FeelingPassionate, cursive' }}
          >
            Ausstattung & Komfort
          </h2>
          <p className="text-lg text-gray-600">
            Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.
          </p>
        </motion.div>

        {/* Amenity Cards - 4x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {amenityCards.map((card, index) => {
            const Icon = card.icon;
            const title = cardTitles[card.key][language as 'de' | 'en'];
            const cardImage = cardImages[card.key];

            return (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                onClick={() => scrollToGalleryCategory(card.galleryCategory)}
                className="bg-gray-50 rounded-xl overflow-hidden text-left group cursor-pointer
                  border-2 border-transparent
                  hover:border-wood-300 hover:shadow-lg hover:bg-white
                  transition-all duration-300 ease-out
                  hover:-translate-y-1"
              >
                {/* Card Image (if assigned) */}
                {cardImage?.url && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
                    <Image
                      src={cardImage.url}
                      alt={cardImage.alt_text || title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-logo-green/10 flex items-center justify-center text-logo-green mb-4
                    group-hover:bg-wood-200 group-hover:scale-110 transition-all duration-300">
                    <Icon size={24} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-logo-green transition-colors">
                    {title}
                  </h3>

                  {/* Items */}
                  <ul className="space-y-1.5">
                    {card.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-logo-green mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Hint if exists */}
                  {card.hint && (
                    <div className="mt-4 p-3 bg-wood-50 rounded-lg border border-wood-100">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-logo-green">Hinweis:</span> {card.hint}
                      </p>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && images[selectedImage] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X size={32} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={40} />
          </button>

          <Image
            src={images[selectedImage].url}
            alt={images[selectedImage].alt_text || 'Sechszirbenhütte'}
            width={1200}
            height={800}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={40} />
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}
    </section>
  );
}
