'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Mountain,
  Globe,
  Dog,
  Baby,
  ArrowLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BlogPostsGrid } from './components/BlogPostsGrid';
import { FeatureCarousel } from './components/FeatureCarousel';
import { DogTripsCarousel } from './components/DogTripsCarousel';
import { KidsTripsSection } from './components/KidsTripsSection';
import { ImageLightbox } from './components/ImageLightbox';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  category?: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel';
  status: 'draft' | 'published';
  author: string;
  published_at: string | null;
  created_at: string;
}

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
  const [dogTripImages, setDogTripImages] = useState<Record<string, MediaItem[]>>({});
  const [activeKaerntenSubTab, setActiveKaerntenSubTab] = useState<KaerntenSubTab>('hunde');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

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

    // Load published blog posts
    fetch('/api/blog?status=published')
      .then((res) => res.json() as Promise<{ posts?: BlogPost[] }>)
      .then((data) => {
        if (data.posts) {
          setBlogPosts(data.posts);
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

          {/* Dynamic Blog Posts */}
          <BlogPostsGrid posts={blogPosts} />

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

              <FeatureCarousel
                features={t.umgebung.features}
                images={images}
                isMobile={isMobile}
                onImageClick={(index) => setSelectedImage(index)}
              />
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

              {/* Dog Trips Content */}
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

                  <DogTripsCarousel
                    trips={dogTrips}
                    dogTripImages={dogTripImages}
                    dogTripCategories={DOG_TRIP_CATEGORIES}
                    isMobile={isMobile}
                    noteLabel={t.ui?.note || 'Tipp'}
                    addImageLabel={t.ui?.addImageInAdmin || 'Bild im Admin hinzufügen'}
                  />
                </motion.div>
              )}

              {/* Kids Trips Content */}
              {activeKaerntenSubTab === 'kinder' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <KidsTripsSection
                    title={t.umgebung.kidsTrips.title}
                    featured={t.umgebung.kidsTrips.featured}
                    trips={kidsTrips}
                  />
                </motion.div>
              )}
            </div>
          </motion.article>
        </div>
      </main>
      <Footer />

      {/* Lightbox */}
      {selectedImage !== null && (
        <ImageLightbox
          images={images}
          selectedIndex={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNavigate={(index) => setSelectedImage(index)}
        />
      )}
    </>
  );
}
