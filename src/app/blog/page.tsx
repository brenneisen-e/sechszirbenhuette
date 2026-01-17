'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
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
  Car,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  category?: string;
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

type KaerntenSubTab = 'hunde' | 'kinder';

export default function BlogPage() {
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [expandedKidsTrip, setExpandedKidsTrip] = useState<number | null>(null);
  const [dogTripImages, setDogTripImages] = useState<Record<string, MediaItem[]>>({});
  const [currentDogTrip, setCurrentDogTrip] = useState(0);
  const [currentNockbergeFeature, setCurrentNockbergeFeature] = useState(0);
  const [activeKaerntenSubTab, setActiveKaerntenSubTab] = useState<KaerntenSubTab>('hunde');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size for responsive carousel
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetch('/api/media?category=aussen&type=image')
      .then((res) => res.json() as Promise<{ media?: MediaItem[] }>)
      .then((data) => {
        if (data.media) {
          setImages(data.media);
        }
      })
      .catch(() => {});

    // Load dog trip images
    fetch('/api/media')
      .then((res) => res.json() as Promise<{ media?: (MediaItem & { category: string })[] }>)
      .then((data) => {
        if (data.media) {
          const grouped: Record<string, MediaItem[]> = {};
          DOG_TRIP_CATEGORIES.forEach(cat => {
            grouped[cat] = data.media!.filter((m) => m.category === cat);
          });
          setDogTripImages(grouped);
        }
      })
      .catch(() => {});
  }, []);

  const dogTrips = t.umgebung.dogTrips.trips;
  const kidsTrips = t.umgebung.kidsTrips.trips;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-28 pb-20">
        <div className="container">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-logo-green hover:text-logo-green/80 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>{t.common.back}</span>
          </Link>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-logo-green mb-4"
              style={{ fontFamily: 'FeelingPassionate, cursive' }}
            >
              {t.navigation.blog || 'Blog'}
            </h1>
            <p className="text-lg text-gray-600">
              {t.blog?.intro || 'Entdecken Sie unsere Reisetipps und Geschichten aus den Nockbergen'}
            </p>
          </motion.div>

          {/* Blog Article 1: Ganzjähriges Urlaubsziel */}
          <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-20 bg-white rounded-3xl shadow-lg overflow-hidden"
          >
            <div className="p-8 md:p-12">
              {/* Article Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-logo-green/10 flex items-center justify-center">
                  <Mountain className="w-6 h-6 text-logo-green" />
                </div>
                <span className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                  {t.blog?.articleLabel || 'Blogartikel'}
                </span>
              </div>

              <h2
                data-text-key="umgebung_title"
                className="text-3xl sm:text-4xl md:text-5xl text-logo-green mb-4"
                style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('umgebung_title') }}
              >
                {getText('umgebung_title')}
              </h2>
              <p
                data-text-key="umgebung_subtitle"
                className="text-lg md:text-xl text-logo-green font-medium mb-4"
                style={getTextStyle('umgebung_subtitle')}
              >
                {getText('umgebung_subtitle')}
              </p>
              <p className="text-gray-600 mb-10 max-w-3xl">
                {t.umgebung.intro}
              </p>

              {/* Nockberge Carousel - 2 cards on desktop, 1 on mobile */}
              {(() => {
                const maxIndex = isMobile ? featureKeys.length - 1 : Math.ceil(featureKeys.length / 2) - 1;
                const translateValue = isMobile ? currentNockbergeFeature * 100 : currentNockbergeFeature * 50;
                const totalDots = isMobile ? featureKeys.length : Math.ceil(featureKeys.length / 2);

                return (
                  <div className="relative">
                    {/* Navigation Buttons */}
                    <button
                      onClick={() => setCurrentNockbergeFeature(prev => Math.max(0, prev - 1))}
                      className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition -translate-x-1/2 ${currentNockbergeFeature === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      disabled={currentNockbergeFeature === 0}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => setCurrentNockbergeFeature(prev => Math.min(maxIndex, prev + 1))}
                      className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${currentNockbergeFeature >= maxIndex ? 'opacity-30 cursor-not-allowed' : ''}`}
                      disabled={currentNockbergeFeature >= maxIndex}
                    >
                      <ChevronRight size={24} />
                    </button>

                    {/* Carousel Track */}
                    <div className="overflow-hidden mx-4 md:mx-8">
                      <div
                        className="flex transition-transform duration-300 ease-out"
                        style={{ transform: `translateX(-${translateValue}%)` }}
                      >
                        {featureKeys.map((key, index) => {
                          const Icon = featureIcons[key];
                          const feature = t.umgebung.features[key];
                          const featureImage = images[index] || null;

                          return (
                            <div key={key} className="w-full md:w-1/2 flex-shrink-0 px-2">
                              <div className="bg-gray-50 rounded-2xl shadow-md overflow-hidden">
                                {/* Portrait Image or Icon Placeholder */}
                                <div className="relative aspect-[3/4] bg-gray-100">
                                  {featureImage ? (
                                    <button
                                      onClick={() => setSelectedImage(index)}
                                      className="w-full h-full"
                                    >
                                      <Image
                                        src={featureImage.url}
                                        alt={featureImage.alt_text || feature.title}
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                      />
                                    </button>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-logo-green/10 to-logo-green/20">
                                      <Icon size={80} className="text-logo-green/40" />
                                    </div>
                                  )}
                                  {/* Number Badge */}
                                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-logo-green flex items-center justify-center text-white font-bold shadow-lg">
                                    {index + 1}
                                  </div>
                                  {/* Icon Badge */}
                                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-logo-green shadow-lg">
                                    <Icon size={20} />
                                  </div>
                                </div>

                                {/* Text Content */}
                                <div className="p-5">
                                  <h4 className="text-lg font-bold text-logo-green mb-3">{feature.title}</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                                  {key === 'kaerntenCard' && (
                                    <div className="mt-4 flex flex-wrap gap-3">
                                      <a
                                        href="https://www.kaerntencard.at"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-wood-600 hover:text-logo-green flex items-center gap-1"
                                      >
                                        Kärnten Card <ExternalLink size={14} />
                                      </a>
                                      <a
                                        href="https://www.heidialm.at"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-wood-600 hover:text-logo-green flex items-center gap-1"
                                      >
                                        Heidialm <ExternalLink size={14} />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dots Indicator */}
                    <div className="flex justify-center gap-2 mt-6">
                      {Array.from({ length: totalDots }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentNockbergeFeature(index)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            currentNockbergeFeature === index
                              ? 'bg-logo-green w-6'
                              : 'bg-logo-green/30 hover:bg-logo-green/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.article>

          {/* Blog Article 2: Kärnten - Ausflüge mit Hunden & Kindern */}
          <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-lg overflow-hidden"
          >
            <div className="p-8 md:p-12">
              {/* Article Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-logo-green/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-logo-green" />
                </div>
                <span className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                  {t.blog?.articleLabel || 'Blogartikel'}
                </span>
              </div>

              <h2
                className="text-3xl sm:text-4xl md:text-5xl text-logo-green mb-4"
                style={{ fontFamily: 'FeelingPassionate, cursive' }}
              >
                {t.blog?.kaerntenTitle || 'Ausflüge in Kärnten'}
              </h2>
              <p className="text-lg md:text-xl text-logo-green font-medium mb-4">
                {t.blog?.kaerntenSubtitle || 'Die schönsten Ausflugsziele mit Hunden und Kindern'}
              </p>
              <p className="text-gray-600 mb-10 max-w-3xl">
                {t.blog?.kaerntenIntro || 'Entdecken Sie die besten Ausflugsziele in Kärnten für die ganze Familie - perfekt für Urlaub mit Hunden und Kindern.'}
              </p>

              {/* Sub-Tabs for Kärnten */}
              <div className="flex justify-center mb-10">
                <div className="inline-flex bg-gray-100 rounded-xl p-1.5">
                  <button
                    onClick={() => setActiveKaerntenSubTab('hunde')}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      activeKaerntenSubTab === 'hunde'
                        ? 'bg-logo-green text-white shadow-md'
                        : 'text-gray-500 hover:text-logo-green'
                    }`}
                  >
                    <Dog size={18} />
                    {t.ui?.withDogs || 'Mit Hunden'}
                  </button>
                  <button
                    onClick={() => setActiveKaerntenSubTab('kinder')}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      activeKaerntenSubTab === 'kinder'
                        ? 'bg-logo-green text-white shadow-md'
                        : 'text-gray-500 hover:text-logo-green'
                    }`}
                  >
                    <Baby size={18} />
                    {t.ui?.withKids || 'Mit Kindern'}
                  </button>
                </div>
              </div>

              {/* Dog Trips Content - 2 cards on desktop, 1 on mobile */}
              {activeKaerntenSubTab === 'hunde' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col items-center text-center mb-8">
                    <h3
                      className="text-2xl sm:text-3xl md:text-4xl text-logo-green"
                      style={{ fontFamily: 'FeelingPassionate, cursive' }}
                    >
                      {t.umgebung.dogTrips.title}
                    </h3>
                  </div>

                  {/* Carousel Container */}
                  {(() => {
                    const maxDogIndex = isMobile ? dogTrips.length - 1 : Math.ceil(dogTrips.length / 2) - 1;
                    const dogTranslateValue = isMobile ? currentDogTrip * 100 : currentDogTrip * 50;
                    const totalDogDots = isMobile ? dogTrips.length : Math.ceil(dogTrips.length / 2);

                    return (
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
                          onClick={() => setCurrentDogTrip(prev => Math.min(maxDogIndex, prev + 1))}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${currentDogTrip >= maxDogIndex ? 'opacity-30 cursor-not-allowed' : ''}`}
                          disabled={currentDogTrip >= maxDogIndex}
                        >
                          <ChevronRight size={24} />
                        </button>

                        {/* Carousel Track */}
                        <div className="overflow-hidden mx-4 md:mx-8">
                          <div
                            className="flex transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(-${dogTranslateValue}%)` }}
                          >
                            {dogTrips.map((trip, index) => {
                              const categoryKey = DOG_TRIP_CATEGORIES[index];
                              const tripImages = dogTripImages[categoryKey] || [];
                              const firstImage = tripImages[0];

                              return (
                                <div key={index} className="w-full md:w-1/2 flex-shrink-0 px-2">
                                  <div className="bg-gray-50 rounded-2xl shadow-md overflow-hidden">
                                    {/* Portrait Image */}
                                    <div className="relative aspect-[3/4] bg-gray-100">
                                      {firstImage ? (
                                        <Image
                                          src={firstImage.url}
                                          alt={firstImage.alt_text || trip.title}
                                          fill
                                          className="object-cover"
                                          sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-wood-100 to-wood-200">
                                          <div className="text-center text-wood-600">
                                            <Dog size={48} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">{t.ui?.addImageInAdmin || 'Bild im Admin hinzufügen'}</p>
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
                                      <h4 className="text-lg font-bold text-logo-green mb-1">{trip.title}</h4>
                                      <p className="text-sm text-logo-green/70 font-medium mb-3">{trip.difficulty}</p>
                                      <p className="text-gray-600 text-sm leading-relaxed mb-3">{trip.description}</p>
                                      <div className="flex flex-wrap gap-3 text-sm">
                                        {trip.duration && (
                                          <span className="flex items-center gap-1 text-gray-500">
                                            <Clock size={14} /> {trip.duration}
                                          </span>
                                        )}
                                        {trip.tip && (
                                          <span className="text-wood-600 font-medium">
                                            {t.ui?.note || 'Tipp'}: {trip.tip}
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
                          {Array.from({ length: totalDogDots }).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentDogTrip(index)}
                              className={`w-2.5 h-2.5 rounded-full transition-all ${
                                currentDogTrip === index
                                  ? 'bg-logo-green w-6'
                                  : 'bg-logo-green/30 hover:bg-logo-green/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* Kids Trips Content */}
              {activeKaerntenSubTab === 'kinder' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col items-center text-center mb-8">
                    <h3
                      className="text-2xl sm:text-3xl md:text-4xl text-logo-green"
                      style={{ fontFamily: 'FeelingPassionate, cursive' }}
                    >
                      {t.umgebung.kidsTrips.title}
                    </h3>
                  </div>

                  {/* Featured: Heidi-Alm */}
                  {t.umgebung.kidsTrips.featured && (
                    <div className="mb-8">
                      <div className="bg-logo-green/15 rounded-2xl p-6 md:p-8 shadow-md border-2 border-logo-green/30">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="w-10 h-10 rounded-full bg-logo-green/20 flex items-center justify-center text-logo-green font-bold">
                            1
                          </span>
                          <div>
                            <h4 className="text-xl md:text-2xl font-bold text-logo-green">
                              {t.umgebung.kidsTrips.featured.title}
                            </h4>
                            <p className="text-sm text-gray-500 font-medium">
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

                  {/* Grid: weitere Ausflugsziele */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kidsTrips.map((trip, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-logo-green/20"
                      >
                        <button
                          onClick={() => setExpandedKidsTrip(expandedKidsTrip === index ? null : index)}
                          className="w-full p-4 md:p-5 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-logo-green/20 flex items-center justify-center text-logo-green font-bold text-sm flex-shrink-0">
                              {index + 2}
                            </span>
                            <div>
                              <h4 className="font-bold text-logo-green text-sm md:text-base">{trip.title}</h4>
                              <p className="text-xs text-gray-500">
                                <Car className="inline w-3 h-3 mr-1" />
                                {trip.distance} | {trip.age}
                              </p>
                            </div>
                          </div>
                          {expandedKidsTrip === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        {expandedKidsTrip === index && (
                          <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-logo-green/20">
                            <p className="text-gray-600 text-sm leading-relaxed pt-4">{trip.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.article>
        </div>
      </main>
      <Footer />

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
            <ChevronLeft size={32} className="rotate-45" />
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
    </>
  );
}
