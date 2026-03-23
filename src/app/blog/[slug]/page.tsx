'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel';
  status: 'draft' | 'published';
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
}

interface BlogPostImage {
  id: string;
  image_url: string;
  image_alt: string | null;
  caption: string | null;
  display_order: number;
}

// Simple markdown-to-HTML converter for blog content that was saved as markdown
function markdownToHtml(md: string): string {
  // If content already looks like HTML (has tags), return as-is
  if (/<[a-z][\s\S]*>/i.test(md) && !md.startsWith('#')) {
    return md;
  }

  let html = md;

  // Convert markdown links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Split by double newlines for paragraphs, or by ## for headings
  const lines = html.split(/\n/);
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      // Skip h1 since the title is already displayed in the header
      continue;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.slice(2)}</li>`);
    } else if (line.startsWith('> ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<blockquote><p>${line.slice(2)}</p></blockquote>`);
    } else if (line === '---' || line === '***') {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push('<hr />');
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      // Bold and italic
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      result.push(`<p>${line}</p>`);
    }
  }
  if (inList) result.push('</ul>');

  return result.join('\n');
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [images, setImages] = useState<BlogPostImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/blog?slug=${encodeURIComponent(slug)}&images=true`)
      .then((res) => {
        if (!res.ok) throw new Error('Post not found');
        return res.json() as Promise<{ post: BlogPost; images: BlogPostImage[] }>;
      })
      .then((data) => {
        // Only show published posts on the frontend
        if (data.post.status !== 'published') {
          throw new Error('Post not found');
        }
        setPost(data.post);
        setImages(data.images || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Update page title and meta tags
  useEffect(() => {
    if (post) {
      // Update title
      document.title = `${post.meta_title || post.title} | Sechszirbenhütte Blog`;

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', post.meta_description || post.excerpt || '');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = post.meta_description || post.excerpt || '';
        document.head.appendChild(meta);
      }

      // Add JSON-LD structured data
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.meta_description || post.excerpt || '',
        image: post.cover_image_url || 'https://sechszirbenhuette.pages.dev/images/fallback/og-image.jpg',
        author: {
          '@type': 'Organization',
          name: post.author,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Sechszirbenhütte',
          logo: {
            '@type': 'ImageObject',
            url: 'https://sechszirbenhuette.pages.dev/images/logo.svg',
          },
        },
        datePublished: post.published_at || post.created_at,
        dateModified: post.created_at,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://sechszirbenhuette.pages.dev/blog/${post.slug}`,
        },
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);

      // Cleanup
      return () => {
        const scriptToRemove = document.querySelector('script[type="application/ld+json"]');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      };
    }
  }, [post]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-28 pb-20">
          <div className="container flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-logo-green" />
            <span className="ml-3 text-gray-600">Wird geladen...</span>
          </div>
        </div>
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-28 pb-20">
          <div className="container text-center py-20">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Beitrag nicht gefunden</h1>
            <p className="text-gray-600 mb-8">Der gesuchte Blogbeitrag existiert nicht oder wurde entfernt.</p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-logo-green hover:text-logo-green/80 transition-colors"
            >
              <ArrowLeft size={20} />
              Zurück zum Blog
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-28 pb-20">
        <article className="container max-w-4xl">
          {/* Back Link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-logo-green hover:text-logo-green/80 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Zurück zum Blog</span>
          </Link>

          {/* Cover Image */}
          {post.cover_image_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-video rounded-2xl overflow-hidden mb-8 shadow-lg"
            >
              <Image
                src={post.cover_image_url}
                alt={post.cover_image_alt || post.title}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          )}

          {/* Post Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h1
              className="text-3xl sm:text-4xl md:text-5xl text-logo-green mb-4"
              style={{ fontFamily: 'FeelingPassionate, cursive' }}
            >
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="text-xl text-logo-green/80 font-medium mb-4">
                {post.subtitle}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
              <span className="flex items-center gap-1.5">
                <User size={16} />
                {post.author}
              </span>
              {post.published_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  {formatDate(post.published_at)}
                </span>
              )}
            </div>
          </motion.header>

          {/* Image Carousel (if carousel layout) */}
          {post.layout === 'carousel' && images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-10"
            >
              <div className="relative">
                {/* Main Image */}
                <div
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => setLightboxOpen(true)}
                >
                  <Image
                    src={images[currentImageIndex].image_url}
                    alt={images[currentImageIndex].image_alt || ''}
                    fill
                    className="object-cover"
                  />
                  {images[currentImageIndex].caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white text-sm">{images[currentImageIndex].caption}</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Dots */}
                {images.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          currentImageIndex === index
                            ? 'bg-logo-green w-6'
                            : 'bg-logo-green/30 hover:bg-logo-green/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="prose prose-lg prose-green max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
          />

          {/* Standard Layout Images (after content) */}
          {post.layout === 'standard' && images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setCurrentImageIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <Image
                    src={img.image_url}
                    alt={img.image_alt || ''}
                    fill
                    className="object-cover hover:scale-105 transition-transform"
                  />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </article>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X size={32} />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                }}
                className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev + 1) % images.length);
                }}
                className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}
          <Image
            src={images[currentImageIndex].image_url}
            alt={images[currentImageIndex].image_alt || ''}
            width={1200}
            height={800}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Blog content styles matching TipTap editor output */}
      <style jsx global>{`
        .prose img[data-style="default"] { border-radius: 8px; max-width: 100%; height: auto; margin: 1.5rem auto; display: block; }
        .prose img[data-style="rounded"] { border-radius: 16px; max-width: 80%; height: auto; margin: 1.5rem auto; display: block; }
        .prose img[data-style="circle"] { border-radius: 50%; width: 250px; height: 250px; object-fit: cover; margin: 1.5rem auto; display: block; }
        .prose img[data-style="full"] { border-radius: 0; width: 100%; height: auto; margin: 2rem 0; display: block; }
        .prose img:not([data-style]) { border-radius: 8px; max-width: 100%; height: auto; margin: 1.5rem auto; display: block; }
        .prose h2 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.75rem; margin-top: 2rem; color: #1e5631; }
        .prose h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 1.5rem; color: #1e5631; }
        .prose p { margin-bottom: 1rem; line-height: 1.75; }
        .prose ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose li { margin-bottom: 0.25rem; }
        .prose blockquote { border-left: 4px solid #1e5631; padding-left: 1rem; font-style: italic; color: #6b7280; margin: 1.5rem 0; }
        .prose hr { border-top: 1px solid #e5e7eb; margin: 2rem 0; }
        .prose a { color: #1e5631; text-decoration: underline; }
        .prose a:hover { color: #163f24; }
      `}</style>
    </>
  );
}
