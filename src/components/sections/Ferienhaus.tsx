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

const amenityIcons = {
  rooms: Bed,
  kitchen: UtensilsCrossed,
  bathroom: Bath,
  sauna: Flame,
  living: Sofa,
  outdoor: TreePine,
};

const amenityKeys = ['rooms', 'kitchen', 'bathroom', 'sauna', 'living', 'outdoor'] as const;

export function Ferienhaus() {
  const { t } = useLanguage();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/media?category=innen&type=image')
      .then((res) => res.json())
      .then((data) => {
        if (data.media) {
          setImages(data.media);
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

  return (
    <section id="ferienhaus" className="py-20 bg-white">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-wood-100 text-wood-700 mb-6">
            <Home size={32} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t.ferienhaus.title}
          </h2>
          <p className="text-lg text-gray-600">
            {t.ferienhaus.intro}
          </p>
        </motion.div>

        {/* Quick Facts */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {(['grundstueck', 'wohnflaeche', 'hoehe', 'personen'] as const).map((key) => (
            <div key={key} className="bg-wood-50 rounded-lg p-4 text-center">
              <p className="text-wood-700 font-semibold">
                {t.ferienhaus.details[key]}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.slice(0, 8).map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => openLightbox(index)}
                  className="relative aspect-square overflow-hidden rounded-lg hover:opacity-90 transition group"
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text || 'Sechszirbenhütte Innenansicht'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Amenities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {amenityKeys.map((key, index) => {
            const Icon = amenityIcons[key];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t.ferienhaus[key].title}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {key === 'rooms' ? (
                    <>
                      <li className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-wood-400" />
                        {t.ferienhaus.rooms.bedroom1}
                      </li>
                      <li className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-wood-400" />
                        {t.ferienhaus.rooms.bedroom2}
                      </li>
                      <li className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-wood-400" />
                        {t.ferienhaus.rooms.living}
                      </li>
                    </>
                  ) : (
                    t.ferienhaus[key].items.map((item: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-wood-400" />
                        {item}
                      </li>
                    ))
                  )}
                </ul>
              </motion.div>
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
