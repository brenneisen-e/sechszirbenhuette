'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Map,
  Compass,
  Mountain,
  Globe,
  Calendar,
  Palmtree,
  CreditCard,
  Dog,
  Baby,
  MapPin,
  Car,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
}

const featureIcons = {
  central: Compass,
  nationalpark: Mountain,
  dreilaendereck: Globe,
  activities: Calendar,
  heidiAlm: Palmtree,
  kaerntenCard: CreditCard,
};

const featureKeys = ['central', 'nationalpark', 'dreilaendereck', 'activities', 'heidiAlm', 'kaerntenCard'] as const;

// Dog trip category keys mapping to database categories
const DOG_TRIP_CATEGORIES = [
  'hund-falkert',
  'hund-rodresnock',
  'hund-drei-seen',
  'hund-hochrindl',
  'hund-millstaetter',
];

export function Umgebung() {
  const { t } = useLanguage();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [expandedKidsTrip, setExpandedKidsTrip] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [dogTripImages, setDogTripImages] = useState<Record<string, MediaItem[]>>({});
  const [currentDogTrip, setCurrentDogTrip] = useState(0);

  useEffect(() => {
    fetch('/api/media?category=aussen&type=image')
      .then((res) => res.json())
      .then((data) => {
        if (data.media) {
          setImages(data.media);
        }
      })
      .catch(() => {});

    // Load dog trip images
    fetch('/api/media')
      .then((res) => res.json())
      .then((data) => {
        if (data.media) {
          const grouped: Record<string, MediaItem[]> = {};
          DOG_TRIP_CATEGORIES.forEach(cat => {
            grouped[cat] = data.media.filter((m: MediaItem & { category: string }) => m.category === cat);
          });
          setDogTripImages(grouped);
        }
      })
      .catch(() => {});
  }, []);

  const dogTrips = t.umgebung.dogTrips.trips;
  const kidsTrips = t.umgebung.kidsTrips.trips;

  return (
    <section id="umgebung" className="py-20 bg-gray-50">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-wood-100 text-wood-700 mb-6">
            <Map size={32} strokeWidth={1.5} />
          </div>
          <h2
            className="text-4xl md:text-5xl text-wood-700 mb-4"
            style={{ fontFamily: 'RetroSignature, cursive' }}
          >
            {t.umgebung.title}
          </h2>
          <p className="text-xl text-wood-600 font-medium mb-4">
            {t.umgebung.subtitle}
          </p>
          <p className="text-lg text-gray-600">
            {t.umgebung.intro}
          </p>
        </motion.div>

        {/* Outdoor Images Gallery */}
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.slice(0, 4).map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(index)}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl hover:opacity-90 transition group"
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text || 'Umgebung Sechszirbenhütte'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {featureKeys.map((key, index) => {
            const Icon = featureIcons[key];
            const feature = t.umgebung.features[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
                {key === 'kaerntenCard' && (
                  <div className="mt-4 flex gap-3">
                    <a
                      href="https://www.kaerntencard.at"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-wood-600 hover:text-wood-700 flex items-center gap-1"
                    >
                      Kärnten Card <ExternalLink size={14} />
                    </a>
                    <a
                      href="https://www.heidialm.at"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-wood-600 hover:text-wood-700 flex items-center gap-1"
                    >
                      Heidialm <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Dog Trips - Swipeable Carousel */}
        <motion.div
          id="dog-trips"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 scroll-mt-24"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
              <Dog size={24} />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t.umgebung.dogTrips.title}
            </h3>
          </div>

          {/* Carousel Container */}
          <div className="relative">
            {/* Navigation Buttons */}
            <button
              onClick={() => setCurrentDogTrip(prev => Math.max(0, prev - 1))}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition -translate-x-1/2 ${currentDogTrip === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={currentDogTrip === 0}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => setCurrentDogTrip(prev => Math.min(dogTrips.length - 1, prev + 1))}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${currentDogTrip === dogTrips.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={currentDogTrip === dogTrips.length - 1}
            >
              <ChevronRight size={24} />
            </button>

            {/* Carousel Track */}
            <div className="overflow-hidden mx-4 md:mx-8">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${currentDogTrip * 100}%)` }}
              >
                {dogTrips.map((trip, index) => {
                  const categoryKey = DOG_TRIP_CATEGORIES[index];
                  const tripImages = dogTripImages[categoryKey] || [];
                  const firstImage = tripImages[0];

                  return (
                    <div
                      key={index}
                      className="w-full flex-shrink-0 px-2"
                    >
                      <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-md mx-auto">
                        {/* Portrait Image */}
                        <div className="relative aspect-[3/4] bg-gray-100">
                          {firstImage ? (
                            <Image
                              src={firstImage.url}
                              alt={firstImage.alt_text || trip.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 400px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-wood-100 to-wood-200">
                              <div className="text-center text-wood-600">
                                <Dog size={48} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Bild im Admin hinzufügen</p>
                              </div>
                            </div>
                          )}
                          {/* Number Badge */}
                          <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-wood-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {index + 1}
                          </div>
                        </div>

                        {/* Text Content */}
                        <div className="p-5">
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{trip.title}</h4>
                          <p className="text-sm text-wood-600 font-medium mb-3">{trip.difficulty}</p>
                          <p className="text-gray-600 text-sm leading-relaxed mb-3">{trip.description}</p>
                          <div className="flex flex-wrap gap-3 text-sm">
                            {trip.duration && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock size={14} /> {trip.duration}
                              </span>
                            )}
                            {trip.tip && (
                              <span className="text-wood-600 font-medium">
                                Tipp: {trip.tip}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {dogTrips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentDogTrip(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentDogTrip === index
                      ? 'bg-wood-600 w-6'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Kids Trips */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
              <Baby size={24} />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t.umgebung.kidsTrips.title}
            </h3>
          </div>

          {/* Featured: Heidi-Alm */}
          {t.umgebung.kidsTrips.featured && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-wood-50 to-green-50 rounded-2xl p-6 md:p-8 shadow-md border-2 border-wood-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-wood-600 flex items-center justify-center text-white font-bold">
                    1
                  </span>
                  <div>
                    <h4 className="text-xl md:text-2xl font-bold text-gray-900">
                      {t.umgebung.kidsTrips.featured.title}
                    </h4>
                    <p className="text-sm text-wood-600 font-medium">
                      <Car className="inline w-4 h-4 mr-1" />
                      {t.umgebung.kidsTrips.featured.distance} | {t.umgebung.kidsTrips.featured.age}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {t.umgebung.kidsTrips.featured.description}
                </p>
              </div>
            </div>
          )}

          {/* Grid: 6 weitere Ausflugsziele (2x3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kidsTrips.map((trip, index) => (
              <div
                key={index}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedKidsTrip(expandedKidsTrip === index ? null : index)}
                  className="w-full p-4 md:p-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {index + 2}
                    </span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm md:text-base">{trip.title}</h4>
                      <p className="text-xs text-gray-500">
                        <Car className="inline w-3 h-3 mr-1" />
                        {trip.distance} | {trip.age}
                      </p>
                    </div>
                  </div>
                  {expandedKidsTrip === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedKidsTrip === index && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-gray-100">
                    <p className="text-gray-600 text-sm leading-relaxed pt-4">{trip.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Directions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 md:p-12 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
              <MapPin size={24} />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t.umgebung.directions.title}
            </h3>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {t.umgebung.directions.description}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-amber-800 font-medium">
              {t.umgebung.directions.note}
            </p>
          </div>
          <div className="rounded-xl overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2734.1234567890!2d13.8461029!3d46.8567077!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSechszirbenh%C3%BCtte!5e0!3m2!1sde!2sat!4v1234567890"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && images[selectedImage] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X size={32} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage - 1 + images.length) % images.length); }}
            className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={40} />
          </button>
          <Image
            src={images[selectedImage].url}
            alt={images[selectedImage].alt_text || 'Umgebung'}
            width={1200}
            height={800}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage + 1) % images.length); }}
            className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={40} />
          </button>
        </div>
      )}
    </section>
  );
}
