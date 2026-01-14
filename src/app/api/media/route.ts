import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface MediaRecord {
  id: string;
  file_key: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
}

// Cloudflare types
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface CloudflareEnv {
  DB: D1Database;
  R2: unknown;
}

// Get Cloudflare environment
async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

// Fallback placeholder data for development/when no R2 data exists
const PLACEHOLDER_MEDIA = {
  innen: [
    { id: '1', url: '/images/fallback/innen-1.jpg', alt_text: 'Wohnzimmer Sechszirbenhütte', title: 'Gemütliches Wohnzimmer', media_type: 'image' as const },
    { id: '2', url: '/images/fallback/innen-2.jpg', alt_text: 'Küche Sechszirbenhütte', title: 'Voll ausgestattete Küche', media_type: 'image' as const },
    { id: '3', url: '/images/fallback/innen-3.jpg', alt_text: 'Schlafzimmer Sechszirbenhütte', title: 'Schlafzimmer mit Doppelbett', media_type: 'image' as const },
    { id: '4', url: '/images/fallback/innen-4.jpg', alt_text: 'Sauna Sechszirbenhütte', title: 'Privater Saunabereich', media_type: 'image' as const },
  ],
  aussen: [
    { id: '5', url: '/images/fallback/aussen-1.jpg', alt_text: 'Außenansicht Sechszirbenhütte', title: 'Hütte im Winter', media_type: 'image' as const },
    { id: '6', url: '/images/fallback/aussen-2.jpg', alt_text: 'Balkon Sechszirbenhütte', title: 'Umlaufender Balkon', media_type: 'image' as const },
    { id: '7', url: '/images/fallback/aussen-3.jpg', alt_text: 'Umgebung Sechszirbenhütte', title: 'Blick auf die Nockberge', media_type: 'image' as const },
    { id: '8', url: '/images/fallback/aussen-4.jpg', alt_text: 'Falkertsee', title: 'Falkertsee im Sommer', media_type: 'image' as const },
  ],
  header: [
    { id: '9', url: '/images/fallback/hero-fallback.jpg', alt_text: 'Sechszirbenhütte Header', title: 'Sechszirbenhütte am Falkert', media_type: 'image' as const },
  ],
  hero: [],
  umgebung: [],
  winter: [],
  sommer: [],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const type = searchParams.get('type'); // 'image' | 'video' | null

  try {
    // Try to get data from D1
    const env = await getCloudflareEnv();

    if (!env || !env.DB) {
      // Not in Cloudflare environment, use placeholders
      return getPlaceholderResponse(category, type);
    }

    let query = 'SELECT * FROM media';
    const params: string[] = [];
    const conditions: string[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (type) {
      conditions.push('media_type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY display_order ASC, created_at DESC';

    const stmt = env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<MediaRecord>();

    // If we have data from D1, return it
    if (result.results && result.results.length > 0) {
      return NextResponse.json({ media: result.results });
    }

    // Otherwise fall back to placeholder data
    return getPlaceholderResponse(category, type);
  } catch (error) {
    console.error('Error fetching from D1, using placeholders:', error);
    // Fall back to placeholder data
    return getPlaceholderResponse(category, type);
  }
}

function getPlaceholderResponse(category: string | null, type: string | null) {
  let media: Array<{
    id: string;
    url: string;
    alt_text: string;
    title: string;
    media_type: 'image' | 'video';
  }> = [];

  if (category && category in PLACEHOLDER_MEDIA) {
    media = PLACEHOLDER_MEDIA[category as keyof typeof PLACEHOLDER_MEDIA];
  } else {
    media = Object.values(PLACEHOLDER_MEDIA).flat();
  }

  // Filter by type if specified
  if (type) {
    media = media.filter(m => m.media_type === type);
  }

  return NextResponse.json({ media });
}
