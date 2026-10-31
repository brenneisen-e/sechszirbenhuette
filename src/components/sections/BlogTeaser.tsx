'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImageVariants } from '@/contexts/SiteSettingsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { responsiveSource } from '@/lib/imageVariants';

// Blog auf der Startseite als Modul mit drei Teasern (Wunsch 31.10.2026):
// die drei für Gäste relevantesten Beiträge, festgelegt in FEATURED_SLUGS.
// Desktop: Leitbeitrag groß links (7 Spalten), zwei Beiträge rechts
// untereinander (Bild links, Text rechts). Tablet: Leitbeitrag oben, zwei
// Karten nebeneinander darunter. Handy: untereinander.
// Fehlt ein festgelegter Beitrag (umbenannt, nicht veröffentlicht), füllen die
// neuesten veröffentlichten Beiträge auf. Daten von /api/blog (nur
// veröffentlichte); ohne Beiträge bleibt der Bereich leer.

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

const TEASER_COUNT = 3;

// Reihenfolge = Anzeige; der erste ist der Leitbeitrag
const FEATURED_SLUGS = [
  'die-schoensten-wanderungen-vor-der-tuer',
  'urlaub-mit-hund-in-kaernten-5-gruende-fuer-die-sechszirbenhuette',
  'ausfluege-in-kaernten',
];

// Bildzeichen am Anfang eines Titels (z. B. Emojis) für die Kachel weglassen
function cleanTitle(title: string): string {
  return title.replace(/^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+/u, '').trim() || title;
}

function pickTeasers(posts: Post[]): Post[] {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const featured = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (p): p is Post => p !== undefined,
  );
  const rest = posts.filter((p) => !featured.includes(p));
  return [...featured, ...rest].slice(0, TEASER_COUNT);
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
        if (!cancelled && data?.posts) setPosts(pickTeasers(data.posts));
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

  const [lead, ...others] = posts;

  const renderImage = (post: Post, title: string, sizes: string, priority: 'large' | 'medium') => {
    const source = post.cover_image_url
      ? responsiveSource(post.cover_image_url, variants, priority, 'thumb')
      : null;
    if (!source) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudflare-Varianten per srcset
      <img
        {...source}
        sizes={sizes}
        alt={post.cover_image_alt || title}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    );
  };

  const cardClass =
    'group flex h-full overflow-hidden rounded-[4px] border border-zirbe/15 bg-white transition-colors hover:border-zirbe/40';

  const readMore = (
    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.9375rem] text-zirbe underline underline-offset-4">
      {b.read}
      <ArrowRight size={16} aria-hidden />
    </span>
  );

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

        <ul
          aria-label={b.list}
          className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 md:gap-6 lg:grid-cols-12"
        >
          {lead && (
            <li className="min-w-0 md:col-span-2 lg:col-span-7 lg:row-span-2">
              <Link href={`/blog/${lead.slug}`} className={`${cardClass} flex-col`}>
                <span className="relative block aspect-[3/2] overflow-hidden bg-zirbe/10 md:aspect-[16/9] lg:aspect-auto lg:min-h-[20rem] lg:flex-1">
                  {renderImage(
                    lead,
                    cleanTitle(lead.title),
                    '(min-width: 1024px) 720px, 100vw',
                    'large',
                  )}
                </span>
                <span className="flex flex-col p-5 md:p-7">
                  <span className="text-[0.875rem] text-rinde/70">
                    {formatDate(lead.published_at, lead.created_at)}
                  </span>
                  <span className="mt-1 text-[1.375rem] leading-snug text-zirbe md:text-[1.625rem]">
                    {cleanTitle(lead.title)}
                  </span>
                  {lead.excerpt && (
                    <span className="mt-2 line-clamp-3 text-[1rem] text-rinde">{lead.excerpt}</span>
                  )}
                  {readMore}
                </span>
              </Link>
            </li>
          )}

          {others.map((post) => {
            const title = cleanTitle(post.title);
            return (
              <li key={post.id} className="min-w-0 lg:col-span-5">
                <Link href={`/blog/${post.slug}`} className={`${cardClass} flex-col lg:flex-row`}>
                  <span className="relative block aspect-[3/2] shrink-0 overflow-hidden bg-zirbe/10 lg:aspect-auto lg:w-[42%]">
                    {renderImage(
                      post,
                      title,
                      '(min-width: 1024px) 240px, (min-width: 768px) 45vw, 100vw',
                      'medium',
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-[0.875rem] text-rinde/70">
                      {formatDate(post.published_at, post.created_at)}
                    </span>
                    <span className="mt-1 text-[1.1875rem] leading-snug text-zirbe">{title}</span>
                    {post.excerpt && (
                      <span className="mt-2 line-clamp-3 text-[0.9375rem] text-rinde">
                        {post.excerpt}
                      </span>
                    )}
                    {readMore}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
