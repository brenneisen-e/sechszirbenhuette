'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlogPostsGrid } from './components/BlogPostsGrid';

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
  layout: 'standard' | 'carousel' | 'tabs';
  status: 'draft' | 'published';
  author: string;
  published_at: string | null;
  created_at: string;
}

export default function BlogPage() {
  const { t } = useLanguage();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch('/api/media?category=aussen&type=image')
      .then((res) => res.json() as Promise<{ media?: MediaItem[] }>)
      .then((data) => {
        if (data.media) {
          setImages(data.media);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-28 pb-20">
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
        <BlogPostsGrid posts={blogPosts} fallbackImages={images} />
      </div>
    </div>
  );
}
