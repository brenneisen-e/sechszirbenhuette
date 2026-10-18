'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { useImageVariants } from '@/contexts/SiteSettingsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { responsiveSource } from '@/lib/imageVariants';

// Galerie als Bento-Raster: je acht Bilder ein großes Leitbild und ein
// breites Bild, „Weitere Bilder“ lädt die nächste Folge. Klick öffnet die
// Lightbox in voller Auflösung (Cloudflare-Varianten bis 2560 px, sobald
// eingerichtet). Filter Innen/Außen/Extras mit Unterkategorien; die
// Ausstattungskarten springen über data-category/data-subcategory hierher.

interface GalleryImage {
  src: string;
  title: string;
  description: string;
  category: string;
  tags?: string[]; // meta-flags like 'innen', 'aussen'
}

interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
  categories?: string[];
}

// Map database categories to gallery categories
const categoryMap: Record<string, string> = {
  exterior: 'aussen',
  aussen: 'aussen',
  living: 'wohnen',
  wohnen: 'wohnen',
  innen: 'wohnen',
  bedrooms: 'schlafen',
  schlafen: 'schlafen',
  kitchen: 'kueche',
  kueche: 'kueche',
  bathroom: 'bad',
  bad: 'bad',
  sauna: 'bad',
  wellness: 'bad',
  surroundings: 'umgebung',
  umgebung: 'umgebung',
  extras: 'extras',
  // Kinderausflüge
  'heidi-alm': 'heidi-alm',
  'turracher-hoehe': 'turracher-hoehe',
  'ossiacher-see': 'ossiacher-see',
  panoramaweg: 'panoramaweg',
  tierpark: 'tierpark',
  gerlitzen: 'gerlitzen',
  nockalm: 'nockalm',
  // Hundewanderungen
  'hund-falkert': 'hund-falkert',
  'hund-rodresnock': 'hund-rodresnock',
  'hund-drei-seen': 'hund-drei-seen',
  'hund-hochrindl': 'hund-hochrindl',
  'hund-millstaetter': 'hund-millstaetter',
};

// Fallback static images from local gallery
const fallbackImages: GalleryImage[] = [
  // Wohnbereich
  {
    src: '/images/innen/Wohnzimmer_01.jpg',
    title: 'Gemütliche Stube',
    description: 'Eckbank mit Holztisch',
    category: 'wohnen',
  },
  {
    src: '/images/innen/Wohnzimmer_02_Galerie.jpg',
    title: 'Wohnzimmer',
    description: 'Blick von der Galerie',
    category: 'wohnen',
  },
  {
    src: '/images/innen/Stube.jpg',
    title: 'Wohnbereich',
    description: 'Bauernschrank und Treppe',
    category: 'wohnen',
  },
  {
    src: '/images/innen/Stube_02.jpg',
    title: 'Stube',
    description: 'Gemütliche Atmosphäre',
    category: 'wohnen',
  },
  {
    src: '/images/innen/Stube_03.jpg',
    title: 'Stube',
    description: 'Rustikales Ambiente',
    category: 'wohnen',
  },
  {
    src: '/images/innen/Kamin.jpg',
    title: 'Kamin',
    description: 'Wohlige Wärme',
    category: 'wohnen',
  },
  {
    src: '/images/innen/Treppenaufgang.jpg',
    title: 'Treppenaufgang',
    description: 'Zum Obergeschoss',
    category: 'wohnen',
  },
  // Küche
  {
    src: '/images/innen/Küche_01.jpg',
    title: 'Küche',
    description: 'Mit Bauernschrank',
    category: 'kueche',
  },
  {
    src: '/images/innen/Küche_02.jpg',
    title: 'Küchenzeile',
    description: 'Voll ausgestattet',
    category: 'kueche',
  },
  {
    src: '/images/innen/Kaffeemaschinen.jpg',
    title: 'Kaffeemaschine',
    description: 'Für den perfekten Kaffee',
    category: 'kueche',
  },
  // Schlafzimmer
  {
    src: '/images/innen/Schlafzimmer_groß.jpg',
    title: 'Großes Schlafzimmer',
    description: 'Doppelbett und Einzelbett',
    category: 'schlafen',
  },
  {
    src: '/images/innen/Schlafzimmer_klein.jpg',
    title: 'Kleines Schlafzimmer',
    description: 'Gemütliches Doppelbett',
    category: 'schlafen',
  },
  // Bad & Sauna
  {
    src: '/images/innen/Sauna.jpg',
    title: 'Finnische Sauna',
    description: 'Eigene Sauna im Haus',
    category: 'bad',
  },
  {
    src: '/images/innen/Badezimmer.jpg',
    title: 'Badezimmer',
    description: 'Mit Dusche',
    category: 'bad',
  },
  { src: '/images/innen/WC.jpg', title: 'WC', description: 'Separates WC', category: 'bad' },
  {
    src: '/images/innen/Ruheraum.jpg',
    title: 'Ruheraum',
    description: 'Entspannung nach der Sauna',
    category: 'bad',
  },
  {
    src: '/images/innen/Ruheraum_02.jpg',
    title: 'Ruheraum',
    description: 'Wellness-Bereich',
    category: 'bad',
  },
  {
    src: '/images/innen/Ruheraum Dusche.jpg',
    title: 'Dusche',
    description: 'Im Ruheraum',
    category: 'bad',
  },
  // Außenbereich
  {
    src: '/images/aussen/Sommerhütte.jpg',
    title: 'Sechszirbenhütte',
    description: 'Im Sommer mit Balkon',
    category: 'aussen',
  },
  {
    src: '/images/aussen/Herbst.jpg',
    title: 'Herbstansicht',
    description: 'Die Hütte im Herbst',
    category: 'aussen',
  },
  {
    src: '/images/aussen/Balkon.jpg',
    title: 'Verschneiter Balkon',
    description: 'Winterstimmung',
    category: 'aussen',
  },
  // Umgebung
  {
    src: '/images/aussen/Nockberge.jpg',
    title: 'Nockberge Panorama',
    description: 'Atemberaubende Berglandschaft',
    category: 'umgebung',
  },
  {
    src: '/images/aussen/Falkertsee_Winter.png',
    title: 'Falkertsee',
    description: 'Mystische Winterstimmung',
    category: 'umgebung',
  },
  {
    src: '/images/aussen/Kühe_Rodresnock.jpg',
    title: 'Almkühe',
    description: 'Am Rodresnock',
    category: 'umgebung',
  },
  // Aktivitäten
  {
    src: '/images/aussen/Snowboard.jpg',
    title: 'Snowboarden',
    description: 'Im Tiefschnee',
    category: 'extras',
  },
  {
    src: '/images/aussen/Skigebiet.jpeg',
    title: 'Skigebiet Falkert',
    description: 'Familiäres Skigebiet',
    category: 'extras',
  },
  {
    src: '/images/aussen/Gravel.jpg',
    title: 'Gravelbiken',
    description: 'In den Lärchenwäldern',
    category: 'extras',
  },
  {
    src: '/images/aussen/Nockiflitzer.jpg',
    title: 'Nocki-Flitzer',
    description: 'Sommerrodelbahn',
    category: 'extras',
  },
  {
    src: '/images/aussen/Pilze.jpg',
    title: 'Pilze sammeln',
    description: 'Im Wald',
    category: 'extras',
  },
  {
    src: '/images/aussen/Angeln.jpg',
    title: 'Angeln',
    description: 'Am Bergsee',
    category: 'extras',
  },
];

// Parse alt_text format "Title - Description" into title and description
function parseAltText(altText: string): { title: string; description: string } {
  const parts = altText.split(' - ');
  if (parts.length >= 2) {
    return { title: parts[0] ?? altText, description: parts.slice(1).join(' - ') };
  }
  return { title: altText, description: '' };
}

// Datenbank-Kategorien, die in die Galerie gehören
const GALLERY_CATEGORIES = new Set(Object.keys(categoryMap));
const INNEN = ['wohnen', 'schlafen', 'kueche', 'bad'];
const AUSSEN = ['aussen', 'umgebung'];

/** Bilder je Schritt („Weitere Bilder“) — eine Bento-Folge */
const PAGE = 8;

// Bento: In jeder Achterfolge ein großes Leitbild (2 × 2) und ein breites
// Bild (2 × 1), der Rest einfach; grid-flow-dense füllt die Lücken.
function tileKind(index: number): 'lead' | 'wide' | 'small' {
  const k = index % PAGE;
  if (k === 0) return 'lead';
  if (k === 5) return 'wide';
  return 'small';
}

const TILE_CLASS = {
  lead: 'col-span-2 row-span-2',
  wide: 'col-span-2',
  small: '',
};

const TILE_SIZES = {
  lead: '(min-width: 1024px) 640px, (min-width: 768px) 66vw, 100vw',
  wide: '(min-width: 1024px) 640px, (min-width: 768px) 66vw, 100vw',
  small: '(min-width: 1024px) 320px, (min-width: 768px) 33vw, 50vw',
};

function isInnen(img: GalleryImage) {
  return INNEN.includes(img.category) || !!img.tags?.includes('innen');
}

function isAussen(img: GalleryImage) {
  return AUSSEN.includes(img.category) || !!img.tags?.includes('aussen');
}

export function Galerie() {
  const { t } = useLanguage();
  const { getText } = useContentTexts();
  const variants = useImageVariants();
  const g = t.galerie;
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/media')
      .then((res) => res.json() as Promise<{ media?: MediaItem[] }>)
      .then((data) => {
        if (cancelled) return;
        const dbImages = (data.media ?? [])
          .filter((img) => GALLERY_CATEGORIES.has(img.category))
          .map((img) => {
            const { title, description } = parseAltText(img.alt_text || img.title || '');
            return {
              src: img.url,
              title,
              description,
              category: categoryMap[img.category] || img.category,
              tags: img.categories || [],
            };
          });
        setImages(dbImages.length > 0 ? dbImages : fallbackImages);
      })
      .catch(() => {
        if (!cancelled) setImages(fallbackImages);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVisible(PAGE);
  }, [selectedCategory, selectedSubCategory]);

  const filteredImages = (() => {
    if (selectedCategory === 'all') return images;
    if (selectedCategory === 'innen') {
      const list = images.filter(isInnen);
      return selectedSubCategory ? list.filter((i) => i.category === selectedSubCategory) : list;
    }
    if (selectedCategory === 'aussen') {
      const list = images.filter(isAussen);
      return selectedSubCategory ? list.filter((i) => i.category === selectedSubCategory) : list;
    }
    return images.filter((img) => img.category === selectedCategory);
  })();

  const topCategories = [
    { id: 'all', label: g.categories.all, count: images.length },
    { id: 'innen', label: g.innen, count: images.filter(isInnen).length },
    { id: 'aussen', label: g.aussen, count: images.filter(isAussen).length },
    {
      id: 'extras',
      label: g.categories.extras,
      count: images.filter((img) => img.category === 'extras').length,
    },
  ].filter((c) => c.id === 'all' || c.count > 0);

  const subCategories = (
    selectedCategory === 'innen' ? INNEN : selectedCategory === 'aussen' ? AUSSEN : []
  ).filter((id) => images.some((img) => img.category === id));

  const categoryLabel = (id: string) =>
    (g.categories as Record<string, string>)[id] ?? id.replace(/-/g, ' ');

  const shown = filteredImages.slice(0, visible);
  const current = lightbox !== null ? filteredImages[lightbox] : undefined;

  const step = useCallback(
    (delta: number) =>
      setLightbox((i) =>
        i === null || filteredImages.length === 0
          ? i
          : (i + delta + filteredImages.length) % filteredImages.length,
      ),
    [filteredImages.length],
  );

  // Lightbox: Tastatur, Seite nicht mitscrollen
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox, step]);

  const filterButton = (active: boolean) =>
    `inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] px-4 text-[0.9375rem] transition-colors ${
      active
        ? 'bg-zirbe text-leinen'
        : 'border border-zirbe/30 text-zirbe hover:border-zirbe hover:bg-zirbe/5'
    }`;

  const lightboxSource = current ? responsiveSource(current.src, variants, 'hero', 'large') : null;

  return (
    <section
      id="galerie"
      ref={sectionRef}
      aria-labelledby="galerie-title"
      className="brand-section bg-leinen"
    >
      <div className="brand-container">
        <SectionHeader
          id="galerie-title"
          label={g.label}
          title={getText('galerie_title') || g.label}
          titleKey="galerie_title"
          intro={getText('galerie_subtitle')}
          introKey="galerie_subtitle"
        />

        <div className="mt-6 flex flex-wrap gap-2">
          {topCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              data-category={category.id}
              aria-pressed={selectedCategory === category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setSelectedSubCategory(null);
              }}
              className={filterButton(selectedCategory === category.id)}
            >
              {category.label}
              {category.count > 0 && <span className="opacity-70">{category.count}</span>}
            </button>
          ))}
        </div>

        {subCategories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!selectedSubCategory}
              onClick={() => setSelectedSubCategory(null)}
              className={filterButton(!selectedSubCategory)}
            >
              {g.categories.all}
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub}
                type="button"
                data-subcategory={sub}
                aria-pressed={selectedSubCategory === sub}
                onClick={() => setSelectedSubCategory(sub)}
                className={filterButton(selectedSubCategory === sub)}
              >
                {categoryLabel(sub)}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="mt-8 flex items-center gap-3 text-rinde">
            <Loader2 size={20} className="animate-spin text-zirbe" aria-hidden />
            {g.loading}
          </p>
        ) : filteredImages.length === 0 ? (
          <p className="mt-8 text-rinde">{g.empty}</p>
        ) : (
          <>
            <ul className="mt-6 grid grid-flow-dense auto-rows-[9.5rem] grid-cols-2 gap-2 sm:auto-rows-[12rem] md:mt-8 md:grid-cols-3 md:gap-3 lg:auto-rows-[clamp(11rem,14vw,16.5rem)] lg:grid-cols-4">
              {shown.map((image, index) => {
                const kind = tileKind(index);
                const source = responsiveSource(
                  image.src,
                  variants,
                  kind === 'small' ? 'medium' : 'large',
                  kind === 'small' ? 'thumb' : 'medium',
                );
                return (
                  <li key={`${image.src}-${index}`} className={TILE_CLASS[kind]}>
                    <button
                      type="button"
                      onClick={() => setLightbox(index)}
                      aria-label={`${g.open}: ${image.title || g.label}`}
                      className="group relative block h-full w-full overflow-hidden rounded-[4px] bg-zirbe/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudflare-Varianten per srcset */}
                      <img
                        src={source.src}
                        srcSet={source.srcSet}
                        sizes={source.srcSet ? TILE_SIZES[kind] : undefined}
                        alt={image.title || g.label}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                      {image.title && (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-rinde/75 to-transparent p-3 pt-10 text-left text-[0.9375rem] text-leinen opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          {image.title}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {filteredImages.length > PAGE && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {visible < filteredImages.length ? (
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE)}
                    className="brand-secondary"
                  >
                    <ChevronDown size={18} aria-hidden />
                    {g.more}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setVisible(PAGE);
                      sectionRef.current?.scrollIntoView({ block: 'start' });
                    }}
                    className="brand-secondary"
                  >
                    <ChevronUp size={18} aria-hidden />
                    {g.less}
                  </button>
                )}
                <span className="text-[0.9375rem] text-rinde">
                  {Math.min(visible, filteredImages.length)} / {filteredImages.length}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {current && lightbox !== null && lightboxSource && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.title || g.label}
          className="fixed inset-0 z-[70] flex flex-col bg-rinde/95 text-leinen"
          onClick={() => setLightbox(null)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0);
            if (Math.abs(diff) > 50) step(diff > 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-[0.9375rem] tabular-nums">
              {lightbox + 1} / {filteredImages.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[4px] hover:bg-leinen/10"
              aria-label={g.close}
            >
              <X size={26} aria-hidden />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
            {/* eslint-disable-next-line @next/next/no-img-element -- volle Auflösung per srcset */}
            <img
              key={current.src}
              src={lightboxSource.src}
              srcSet={lightboxSource.srcSet}
              sizes={lightboxSource.srcSet ? '100vw' : undefined}
              alt={current.title || g.label}
              decoding="async"
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />
            {filteredImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-[4px] bg-rinde/60 hover:bg-rinde sm:inline-flex"
                  aria-label={g.prev}
                >
                  <ChevronLeft size={28} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-[4px] bg-rinde/60 hover:bg-rinde sm:inline-flex"
                  aria-label={g.next}
                >
                  <ChevronRight size={28} aria-hidden />
                </button>
              </>
            )}
          </div>
          <div className="min-h-[4.5rem] px-4 py-3 text-center">
            {current.title && <p className="text-[1.0625rem]">{current.title}</p>}
            {current.description && (
              <p className="text-[0.9375rem] text-leinen/75">{current.description}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
