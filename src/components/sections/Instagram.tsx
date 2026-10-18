'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Instagram as InstagramIcon, Layers, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Instagram-Kanal @sechszirbenhuette: die neuesten Beiträge als Raster
// (Handy 4, Tablet 6, Desktop 8), jeweils mit Link auf den Beitrag. Die
// Daten kommen zwischengespeichert von /api/instagram (src/lib/server/
// instagram.ts); verbunden wird der Kanal im Admin Center, Tab Instagram.
// Ohne Verbindung bleibt nur der Link zum Kanal.

const INSTAGRAM_URL = 'https://www.instagram.com/sechszirbenhuette/';

interface Post {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  image: string;
  permalink: string;
  caption: string;
}

interface Feed {
  connected: boolean;
  profile: { username: string } | null;
  posts: Post[];
}

// Wie viele Beiträge je Breite zu sehen sind
function visibility(index: number): string {
  if (index >= 6) return 'hidden lg:block';
  if (index >= 4) return 'hidden sm:block';
  return '';
}

function shortCaption(caption: string, fallback: string): string {
  const text = caption.replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

export function Instagram() {
  const { t } = useLanguage();
  const [feed, setFeed] = useState<Feed | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/instagram')
      .then((res) => (res.ok ? (res.json() as Promise<Feed>) : null))
      .then((data) => {
        if (!cancelled && data) setFeed(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handle = `@${feed?.profile?.username ?? 'sechszirbenhuette'}`;
  const profileUrl = feed?.profile?.username
    ? `https://www.instagram.com/${feed.profile.username}/`
    : INSTAGRAM_URL;
  const posts = (feed?.posts ?? []).slice(0, 8);

  if (posts.length === 0) {
    return (
      <section aria-label={t.instagram.label} className="bg-leinen py-8 md:py-10">
        <div className="brand-container">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="on-zirbe group flex flex-col items-start gap-4 rounded-[4px] bg-zirbe p-6 text-leinen sm:flex-row sm:items-center sm:justify-between md:p-8"
          >
            <span className="flex items-center gap-4">
              <InstagramIcon size={36} strokeWidth={1.5} aria-hidden />
              <span>
                <span className="block text-[1.375rem] leading-tight">{t.instagram.follow}</span>
                <span className="mt-1 block text-[0.9375rem] text-leinen/85">
                  {t.instagram.text}
                </span>
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-leinen underline underline-offset-4 group-hover:decoration-2">
              {handle}
              <ExternalLink size={16} aria-hidden />
            </span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section
      id="instagram"
      aria-labelledby="instagram-title"
      className="bg-leinen py-12 md:py-14 lg:py-16"
    >
      <div className="brand-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="brand-label text-zirbe">{t.instagram.label}</p>
            <h2 id="instagram-title" className="brand-h2 mt-2 text-zirbe">
              {t.instagram.title}
            </h2>
            <p className="mt-2 max-w-xl text-rinde">{t.instagram.text}</p>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-secondary"
          >
            <InstagramIcon size={18} aria-hidden />
            {handle}
          </a>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-8 md:gap-3 lg:grid-cols-4">
          {posts.map((post, index) => {
            const alt = shortCaption(post.caption, t.instagram.post);
            return (
              <li key={post.id} className={visibility(index)}>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-[4px] bg-zirbe/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Bilder liegen bei Instagram, Adressen wechseln */}
                  <img
                    src={post.image}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  {post.type !== 'IMAGE' && (
                    <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-zirbe/80 text-leinen">
                      {post.type === 'VIDEO' ? (
                        <Play size={16} aria-label={t.instagram.video} />
                      ) : (
                        <Layers size={16} aria-label={t.instagram.album} />
                      )}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
