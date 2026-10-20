'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImageVariants } from '@/contexts/SiteSettingsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { responsiveSource } from '@/lib/imageVariants';

// Blog auf der Startseite: die drei neuesten veröffentlichten Beiträge mit
// Titelbild, Anriss und Datum, Link auf den Beitrag und auf alle Beiträge.
// Daten von /api/blog (nur veröffentlichte). Ohne Beiträge bleibt der Bereich
// leer. Handy Wischreihe, ab Tablet drei Spalten.

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  created_at: string;
}

const COUNT = 3;

// Bildzeichen am Anfang eines Titels (z. B. Emojis) für die Kachel weglassen
function cleanTitle(title: string): string {
  return title.replace(/^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+/u, '').trim() || title;
}

export function BlogTeaser() {
  const { t, language } = useLanguage();
  const variants = useImageVariants();
  const b = t.blogTeaser;
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/blog?status=published')
      .then((res) => (res.ok ? (res.json() as Promise<{ posts?: Post[] }>) : null))
      .then((data) => {
        if (!cancelled && data?.posts) setPosts(data.posts.slice(0, COUNT));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (posts.length === 0) return null;

  const formatDate = (iso: string | null, fallback: string) => {
    const d = new Date(iso ?? fallback.replace(' ', 'T'));
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const card = (post: Post) => {
    const title = cleanTitle(post.title);
    const source = post.cover_image_url
      ? responsiveSource(post.cover_image_url, variants, 'medium', 'thumb')
      : null;
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-zirbe/15 bg-white transition-colors hover:border-zirbe/40"
      >
        <span className="relative block aspect-[3/2] overflow-hidden bg-zirbe/10">
          {source && (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudflare-Varianten per srcset
            <img
              {...source}
              sizes="(min-width: 768px) 33vw, 80vw"
              alt={post.cover_image_alt || title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          )}
        </span>
        <span className="flex flex-1 flex-col p-5">
          <span className="text-[0.875rem] text-rinde/70">
            {formatDate(post.published_at, post.created_at)}
          </span>
          <span className="mt-1 text-[1.1875rem] leading-snug text-zirbe">{title}</span>
          {post.excerpt && (
            <span className="mt-2 line-clamp-3 text-[0.9375rem] text-rinde">{post.excerpt}</span>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.9375rem] text-zirbe underline underline-offset-4">
            {b.read}
            <ArrowRight size={16} aria-hidden />
          </span>
        </span>
      </Link>
    );
  };

  return (
    <section id="blog" aria-labelledby="blog-title" className="brand-section bg-leinen">
      <div className="brand-container">
        <SectionHeader
          id="blog-title"
          label={b.label}
          title={b.title}
          intro={b.intro}
          action={
            <Link href="/blog" className="brand-secondary">
              {b.all}
              <ArrowRight size={18} aria-hidden />
            </Link>
          }
        />
        {/* Handy: Wischreihe */}
        <ul className="brand-snap-row mt-6 grid md:hidden">
          {posts.map((post) => (
            <li key={post.id}>{card(post)}</li>
          ))}
        </ul>
        {/* ab Tablet: drei Spalten */}
        <ul className="mt-8 hidden gap-4 md:grid md:grid-cols-3 lg:gap-6">
          {posts.map((post) => (
            <li key={post.id}>{card(post)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
