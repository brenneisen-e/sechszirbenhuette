import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// Fallback wenn R2 nicht verfügbar
const PLACEHOLDER_MEDIA = {
  innen: [
    { id: 1, url: '/images/fallback/innen-1.jpg', alt_text: 'Wohnzimmer Sechszirbenhütte', title: 'Gemütliches Wohnzimmer' },
    { id: 2, url: '/images/fallback/innen-2.jpg', alt_text: 'Küche Sechszirbenhütte', title: 'Voll ausgestattete Küche' },
  ],
  aussen: [
    { id: 3, url: '/images/fallback/aussen-1.jpg', alt_text: 'Außenansicht Sechszirbenhütte', title: 'Hütte im Winter' },
    { id: 4, url: '/images/fallback/aussen-2.jpg', alt_text: 'Umgebung Sechszirbenhütte', title: 'Blick auf die Nockberge' },
  ],
  header: [
    { id: 5, url: '/images/fallback/hero-fallback.jpg', alt_text: 'Sechszirbenhütte Header', title: 'Sechszirbenhütte am Falkert' },
  ],
  hero: [],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const type = searchParams.get('type');

  try {
    const { env } = getRequestContext();
    const r2 = env.R2;
    const publicUrl = env.PUBLIC_R2_URL || 'https://media.sechszirbenhuette.com';

    if (!r2) {
      // Fallback zu Platzhaltern
      return returnPlaceholders(category, type);
    }

    // R2 Objekte auflisten
    const prefix = category ? `${category}/` : '';
    const listed = await r2.list({ prefix });

    const media = listed.objects
      .filter((obj) => {
        // Nach Typ filtern
        if (type === 'video') {
          return obj.key.match(/\.(mp4|webm|mov)$/i);
        }
        if (type === 'image') {
          return obj.key.match(/\.(jpg|jpeg|png|webp|gif)$/i);
        }
        return true;
      })
      .map((obj, index) => {
        const isVideo = obj.key.match(/\.(mp4|webm|mov)$/i);
        const objCategory = obj.key.split('/')[0];

        return {
          id: index + 1,
          url: `${publicUrl}/${obj.key}`,
          filename: obj.key,
          category: objCategory,
          type: isVideo ? 'video' : 'image',
          alt_text: obj.customMetadata?.altText || `${objCategory} Sechszirbenhütte`,
          size: obj.size,
          uploaded: obj.uploaded,
        };
      });

    // Falls keine Bilder in R2, Platzhalter zurückgeben
    if (media.length === 0) {
      return returnPlaceholders(category, type);
    }

    return NextResponse.json({ media });

  } catch (error) {
    console.error('Media API error:', error);
    // Bei Fehler Platzhalter zurückgeben
    return returnPlaceholders(category, type);
  }
}

function returnPlaceholders(category: string | null, type: string | null) {
  let media: Array<{ id: number; url: string; alt_text: string; title: string }> = [];

  if (category && category in PLACEHOLDER_MEDIA) {
    media = PLACEHOLDER_MEDIA[category as keyof typeof PLACEHOLDER_MEDIA];
  } else {
    media = Object.values(PLACEHOLDER_MEDIA).flat();
  }

  if (type === 'video') {
    media = [];
  }

  return NextResponse.json({ media });
}
