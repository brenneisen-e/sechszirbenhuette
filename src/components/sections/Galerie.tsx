'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
}

// Bilderstapel Komponente - wie bei Natbergerhütte
function ImageStack({
  images,
  title,
  onImageClick
}: {
  images: MediaItem[];
  title: string;
  onImageClick: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Stack Effect - Hintergrundbilder */}
      <div className="relative w-full aspect-[4/3]">
        {/* Hintere Karten (Stack-Effekt) */}
        {images.length > 2 && (
          <div
            className="absolute -right-3 -bottom-3 w-full h-full rounded-xl overflow-hidden shadow-lg opacity-60"
            style={{ transform: 'rotate(6deg)' }}
          >
            <Image
              src={images[(currentIndex + 2) % images.length]?.url || '/images/fallback/placeholder.jpg'}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
        {images.length > 1 && (
          <div
            className="absolute -right-1.5 -bottom-1.5 w-full h-full rounded-xl overflow-hidden shadow-lg opacity-80"
            style={{ transform: 'rotate(3deg)' }}
          >
            <Image
              src={images[(currentIndex + 1) % images.length]?.url || '/images/fallback/placeholder.jpg'}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}

        {/* Hauptbild */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl cursor-pointer"
            onClick={() => onImageClick(currentIndex)}
          >
            <Image
              src={images[currentIndex]?.url || '/images/fallback/placeholder.jpg'}
              alt={images[currentIndex]?.alt_text || title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* Overlay mit Vergrößern-Icon */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
              <Maximize2 className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-lg text-gray-800 hover:bg-white transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-lg text-gray-800 hover:bg-white transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bildanzahl */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Titel */}
      <h3 className="mt-4 text-xl font-bold text-gray-900">{title}</h3>
    </div>
  );
}

export function Galerie() {
  const { t, language } = useLanguage();
  const [innenImages, setInnenImages] = useState<MediaItem[]>([]);
  const [aussenImages, setAussenImages] = useState<MediaItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<MediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    // Lade Innen-Bilder
    fetch('/api/media?category=innen')
      .then(res => res.json())
      .then(data => setInnenImages(data.media || []))
      .catch(() => {});

    // Lade Außen-Bilder
    fetch('/api/media?category=aussen')
      .then(res => res.json())
      .then(data => setAussenImages(data.media || []))
      .catch(() => {});
  }, []);

  const openLightbox = (images: MediaItem[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  return (
    <section id="galerie" className="py-20 bg-gray-50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {language === 'de' ? 'Galerie' : 'Gallery'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'de'
              ? 'Entdecken Sie die Sechszirbenhütte in Bildern'
              : 'Discover the Sechszirbenhütte in pictures'}
          </p>
        </motion.div>

        {/* Bilderstapel Grid */}
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <ImageStack
              images={innenImages}
              title={language === 'de' ? 'Innenbereich' : 'Interior'}
              onImageClick={(index) => openLightbox(innenImages, index)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ImageStack
              images={aussenImages}
              title={language === 'de' ? 'Außenbereich' : 'Exterior'}
              onImageClick={(index) => openLightbox(aussenImages, index)}
            />
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Navigation */}
            <button
              onClick={(e) => { e.stopPropagation(); prevLightboxImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextLightboxImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full max-w-6xl max-h-[80vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxImages[lightboxIndex]?.url || ''}
                alt={lightboxImages[lightboxIndex]?.alt_text || ''}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </motion.div>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-lg">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
