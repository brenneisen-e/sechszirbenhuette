import { NextRequest, NextResponse } from 'next/server';

// Placeholder media data - in production this would come from Cloudflare D1/R2
const PLACEHOLDER_MEDIA = {
  innen: [
    { id: 1, url: '/images/fallback/innen-1.jpg', alt_text: 'Wohnzimmer Sechszirbenhütte', title: 'Gemütliches Wohnzimmer' },
    { id: 2, url: '/images/fallback/innen-2.jpg', alt_text: 'Küche Sechszirbenhütte', title: 'Voll ausgestattete Küche' },
    { id: 3, url: '/images/fallback/innen-3.jpg', alt_text: 'Schlafzimmer Sechszirbenhütte', title: 'Schlafzimmer mit Doppelbett' },
    { id: 4, url: '/images/fallback/innen-4.jpg', alt_text: 'Sauna Sechszirbenhütte', title: 'Privater Saunabereich' },
  ],
  aussen: [
    { id: 5, url: '/images/fallback/aussen-1.jpg', alt_text: 'Außenansicht Sechszirbenhütte', title: 'Hütte im Winter' },
    { id: 6, url: '/images/fallback/aussen-2.jpg', alt_text: 'Balkon Sechszirbenhütte', title: 'Umlaufender Balkon' },
    { id: 7, url: '/images/fallback/aussen-3.jpg', alt_text: 'Umgebung Sechszirbenhütte', title: 'Blick auf die Nockberge' },
    { id: 8, url: '/images/fallback/aussen-4.jpg', alt_text: 'Falkertsee', title: 'Falkertsee im Sommer' },
  ],
  header: [
    { id: 9, url: '/images/fallback/hero-fallback.jpg', alt_text: 'Sechszirbenhütte Header', title: 'Sechszirbenhütte am Falkert' },
  ],
  hero: [
    // Video would be loaded from R2 in production
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const type = searchParams.get('type');

  let media: typeof PLACEHOLDER_MEDIA[keyof typeof PLACEHOLDER_MEDIA] = [];

  if (category && category in PLACEHOLDER_MEDIA) {
    media = PLACEHOLDER_MEDIA[category as keyof typeof PLACEHOLDER_MEDIA];
  } else {
    // Return all media if no category specified
    media = Object.values(PLACEHOLDER_MEDIA).flat();
  }

  // Filter by type if specified
  if (type === 'video') {
    // In production, filter for video files
    media = [];
  }

  return NextResponse.json({ media });
}
