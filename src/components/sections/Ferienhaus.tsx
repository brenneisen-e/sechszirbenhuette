'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
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
  Maximize2,
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
}

// Karten mit Zuordnung zur Galerie; Titel und Punkte stehen in den
// Sprachdateien unter `amenities`
const amenityCards: AmenityCard[] = [
  { key: 'living', icon: Sofa, galleryCategory: 'wohnen' },
  { key: 'kitchen', icon: UtensilsCrossed, galleryCategory: 'kueche' },
  { key: 'rooms', icon: Bed, galleryCategory: 'schlafen' },
  { key: 'sauna', icon: Flame, galleryCategory: 'bad' },
  { key: 'bathroom', icon: Bath, galleryCategory: 'bad' },
  { key: 'outdoor', icon: TreePine, galleryCategory: 'aussen' },
  { key: 'equipment', icon: Wifi, galleryCategory: null },
  { key: 'location', icon: MapPin, galleryCategory: 'umgebung' },
];

interface AmenityText {
  title: string;
  items: string[];
  hint?: string;
}

interface CardImage {
  url: string;
  title?: string;
  alt_text?: string;
}

export function Ferienhaus() {
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();
  const amenityText = (key: string): AmenityText | undefined =>
    (t.amenities as Record<string, AmenityText>)[key];
  const [isMounted, setIsMounted] = useState(false);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [cardImages, setCardImages] = useState<Record<string, CardImage>>({});
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && mobileCardIndex < amenityCards.length - 1) {
        setMobileCardIndex((prev) => prev + 1);
      } else if (diff < 0 && mobileCardIndex > 0) {
        setMobileCardIndex((prev) => prev - 1);
      }
    }
  }, [mobileCardIndex]);

  // Fetch images only after mount to prevent hydration mismatch
  useEffect(() => {
    if (!isMounted) return;

    // Fetch gallery images
    fetch('/api/media?category=innen&type=image')
      .then((res) => res.json() as Promise<{ media?: MediaItem[] }>)
      .then((data) => {
        if (data.media) {
          setImages(data.media);
        }
      })
      .catch(() => {});

    // Fetch amenity card images
    fetch('/api/amenity-images')
      .then((res) => res.json() as Promise<{ byCard?: Record<string, CardImage> }>)
      .then((data) => {
        if (data.byCard) {
          setCardImages(data.byCard);
        }
      })
      .catch(() => {});
  }, [isMounted]);

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

  // Map detail categories to the top-level gallery filter categories
  const categoryToFilter: Record<string, string> = {
    wohnen: 'innen',
    schlafen: 'innen',
    kueche: 'innen',
    bad: 'innen',
    aussen: 'aussen',
    umgebung: 'aussen',
  };

  const scrollToGalleryCategory = (category: string | null) => {
    const galerie = document.querySelector('#galerie');
    if (galerie) {
      galerie.scrollIntoView({ behavior: 'smooth' });
      if (category) {
        const filterCategory = categoryToFilter[category] || category;
        setTimeout(() => {
          const categoryButton = document.querySelector(
            `#galerie button[data-category="${filterCategory}"]`,
          ) as HTMLButtonElement;
          if (categoryButton) {
            categoryButton.click();
          }
          // If the original category differs from the top-level filter, also click the sub-category
          if (category !== filterCategory) {
            setTimeout(() => {
              const subButton = document.querySelector(
                `#galerie button[data-subcategory="${category}"]`,
              ) as HTMLButtonElement;
              if (subButton) {
                subButton.click();
              }
            }, 300);
          }
        }, 500);
      }
    }
  };

  return (
    <section id="ferienhaus" className="py-20 bg-white">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-logo-green/10 text-logo-green mb-6">
            <Home size={32} strokeWidth={1.5} />
          </div>
          <h2
            data-text-key="ferienhaus_title"
            className="brand-h2 text-logo-green mb-4"
            style={{
              fontFamily: 'var(--font-sans)',
              ...getTextStyle('ferienhaus_title'),
            }}
          >
            {getText('ferienhaus_title')}
          </h2>
          <p
            data-text-key="ferienhaus_subtitle"
            className="text-lg text-gray-600"
            style={getTextStyle('ferienhaus_subtitle')}
          >
            {getText('ferienhaus_subtitle')}
          </p>
        </motion.div>

        {/* Mobile Carousel - Single Card with Swipe */}
        <div className="sm:hidden">
          <div
            className="relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div
              className="flex"
              animate={{ x: `-${mobileCardIndex * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {amenityCards.map((card) => {
                const Icon = card.icon;
                const title = amenityText(card.key)?.title ?? card.key;
                const cardImage = cardImages[card.key];

                return (
                  <div key={card.key} className="w-full flex-shrink-0 px-2">
                    <div
                      onClick={() => scrollToGalleryCategory(card.galleryCategory)}
                      className="bg-white rounded-2xl overflow-hidden text-left group cursor-pointer shadow-sm border border-gray-100 flex flex-col"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-leinen">
                        {cardImage?.url ? (
                          <Image
                            src={cardImage.url}
                            alt={cardImage.alt_text || title}
                            fill
                            className="object-cover"
                            sizes="100vw"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-logo-green/30">
                            <Icon size={48} />
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-logo-green/10 flex items-center justify-center text-logo-green flex-shrink-0">
                            <Icon size={20} />
                          </div>
                          <h3 className="text-base font-bold text-gray-900">{title}</h3>
                        </div>
                        <ul className="space-y-1.5 flex-1">
                          {(amenityText(card.key)?.items ?? []).map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-logo-green mt-1.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {amenityText(card.key)?.hint && (
                          <div className="mt-3 p-2.5 bg-leinen rounded-lg border border-zirbe/20">
                            <p className="text-xs text-rinde">
                              <span className="font-semibold">{t.ui.note}:</span>{' '}
                              {amenityText(card.key)?.hint}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Navigation Arrows */}
            {mobileCardIndex > 0 && (
              <button
                onClick={() => setMobileCardIndex((prev) => prev - 1)}
                className="absolute left-2 top-1/3 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-700 z-10"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {mobileCardIndex < amenityCards.length - 1 && (
              <button
                onClick={() => setMobileCardIndex((prev) => prev + 1)}
                className="absolute right-2 top-1/3 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-700 z-10"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {amenityCards.map((_, index) => (
              <button
                key={index}
                onClick={() => setMobileCardIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  mobileCardIndex === index ? 'bg-logo-green w-6' : 'bg-logo-green/30 w-2'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">← Wischen zum Blättern →</p>
        </div>

        {/* Desktop Grid - 4x2 */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {amenityCards.map((card, index) => {
            const Icon = card.icon;
            const title = amenityText(card.key)?.title ?? card.key;
            const cardImage = cardImages[card.key];

            return (
              <motion.div
                key={card.key}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                onClick={() => scrollToGalleryCategory(card.galleryCategory)}
                className="bg-white rounded-2xl overflow-hidden text-left group cursor-pointer
                  shadow-sm border border-gray-100
                  hover:shadow-xl hover:border-logo-green/30
                  transition-all duration-300 ease-out
                  hover:-translate-y-1
                  flex flex-col"
              >
                {/* Card Image - Always shown, with placeholder if no image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-leinen">
                  {cardImage?.url ? (
                    <Image
                      src={cardImage.url}
                      alt={cardImage.alt_text || title}
                      fill
                      className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-logo-green/20 group-hover:text-logo-green/40 transition-colors duration-300">
                      <Icon size={48} />
                    </div>
                  )}
                  {/* Overlay gradient for better readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Icon and Title Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg bg-logo-green/10 flex items-center justify-center text-logo-green flex-shrink-0
                      group-hover:bg-logo-green group-hover:text-white transition-all duration-300"
                    >
                      <Icon size={20} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-logo-green transition-colors">
                      {title}
                    </h3>
                  </div>

                  {/* Items */}
                  <ul className="space-y-1.5 flex-1">
                    {(amenityText(card.key)?.items ?? []).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-logo-green mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Hint if exists */}
                  {amenityText(card.key)?.hint && (
                    <div className="mt-3 p-2.5 bg-leinen rounded-lg border border-zirbe/20">
                      <p className="text-xs text-rinde">
                        <span className="font-semibold">{t.ui.note}:</span>{' '}
                        {amenityText(card.key)?.hint}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Floor Plan Section */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-16"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
              {/* Text Content */}
              <div className="flex-1 text-center md:text-left">
                <button
                  onClick={() => setShowFloorPlan(true)}
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-logo-green/10 text-logo-green mb-4 hover:bg-logo-green hover:text-white transition-all cursor-pointer"
                >
                  <Maximize2 size={24} strokeWidth={1.5} />
                </button>
                <h3
                  className="brand-h2 text-logo-green mb-4"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {t.ui.floorPlan}
                </h3>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-4">
                  {t.ui.floorPlanDesc}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                  <span className="inline-flex items-center gap-1.5 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-logo-green"></span>
                    {t.ui.livingSpace}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-logo-green"></span>
                    {t.ui.floors}
                  </span>
                </div>
              </div>

              {/* Floor Plan Image */}
              <div className="w-full md:w-1/2 lg:w-2/5">
                <div
                  onClick={() => setShowFloorPlan(true)}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer group"
                >
                  <Image
                    src="/images/grundriss.jpg"
                    alt={`${t.ui.floorPlan} – Sechszirbenhütte`}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 40vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                      <Maximize2 size={24} className="text-logo-green" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
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
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={40} />
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Floor Plan Lightbox */}
      {showFloorPlan && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFloorPlan(false)}
        >
          <button
            onClick={() => setShowFloorPlan(false)}
            className="absolute top-4 right-4 bg-white/90 text-gray-800 p-2 hover:bg-white rounded-full z-10 shadow-lg"
          >
            <X size={28} />
          </button>

          <div
            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src="/images/grundriss.jpg"
              alt={`${t.ui.floorPlan} – Sechszirbenhütte`}
              width={1600}
              height={1200}
              className="w-full h-auto max-h-[85vh] object-contain p-4"
            />
          </div>
        </div>
      )}
    </section>
  );
}
