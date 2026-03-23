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
// Uses actual existing images to avoid 404 errors
const PLACEHOLDER_MEDIA = {
  innen: [
    { id: '1', url: '/images/innen/Wohnzimmer_01.jpg', alt_text: 'Wohnzimmer Sechszirbenhütte', title: 'Gemütliches Wohnzimmer', media_type: 'image' as const },
    { id: '2', url: '/images/innen/Küche_01.jpg', alt_text: 'Küche Sechszirbenhütte', title: 'Voll ausgestattete Küche', media_type: 'image' as const },
    { id: '3', url: '/images/innen/Schlafzimmer_groß.jpg', alt_text: 'Schlafzimmer Sechszirbenhütte', title: 'Schlafzimmer mit Doppelbett', media_type: 'image' as const },
    { id: '4', url: '/images/innen/Sauna.jpg', alt_text: 'Sauna Sechszirbenhütte', title: 'Privater Saunabereich', media_type: 'image' as const },
  ],
  aussen: [
    { id: '5', url: '/images/aussen/Aussen-Sommer.jpg', alt_text: 'Außenansicht Sechszirbenhütte', title: 'Hütte im Sommer', media_type: 'image' as const },
    { id: '6', url: '/images/aussen/Balkon.jpg', alt_text: 'Balkon Sechszirbenhütte', title: 'Umlaufender Balkon', media_type: 'image' as const },
    { id: '7', url: '/images/aussen/Nockberge.jpg', alt_text: 'Umgebung Sechszirbenhütte', title: 'Blick auf die Nockberge', media_type: 'image' as const },
    { id: '8', url: '/images/aussen/Herbst.jpg', alt_text: 'Herbstansicht', title: 'Die Hütte im Herbst', media_type: 'image' as const },
  ],
  header: [
    { id: '9', url: '/images/aussen/Sommerhütte.jpg', alt_text: 'Sechszirbenhütte Header', title: 'Sechszirbenhütte am Falkert', media_type: 'image' as const },
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

  // Cache headers to reduce worker load
  // Hero videos and images can be cached longer since they rarely change
  const cacheMaxAge = category === 'hero' ? 3600 : 300; // 1 hour for hero, 5 minutes for others

  try {
    // Try to get data from D1
    const env = await getCloudflareEnv();

    if (!env || !env.DB) {
      // Not in Cloudflare environment, use placeholders
      return getPlaceholderResponse(category, type, cacheMaxAge);
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

    // If we have data from D1, return it with cache headers
    if (result.results && result.results.length > 0) {
      return NextResponse.json(
        { media: result.results },
        {
          headers: {
            'Cache-Control': `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}, stale-while-revalidate=86400`,
          },
        }
      );
    }

    // No results - return empty with short cache so new uploads appear quickly
    return NextResponse.json(
      { media: [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=10, s-maxage=10',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching from D1, using placeholders:', error);
    // Error fallback - short cache
    return NextResponse.json(
      { media: [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=10, s-maxage=10',
        },
      }
    );
  }
}

// Update media record (category, alt_text, title, display_order)
export async function PATCH(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();

    if (!env || !env.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check authentication
    const sessionToken = request.cookies.get('admin_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session
    const session = await env.DB.prepare(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > datetime(\'now\')'
    ).bind(sessionToken).first();

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json() as {
      id: string;
      category?: string;
      alt_text?: string;
      title?: string;
      display_order?: number;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (body.category !== undefined) {
      updates.push('category = ?');
      params.push(body.category);
    }
    if (body.alt_text !== undefined) {
      updates.push('alt_text = ?');
      params.push(body.alt_text);
    }
    if (body.title !== undefined) {
      updates.push('title = ?');
      params.push(body.title);
    }
    if (body.display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(body.display_order);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(body.id);
    const query = `UPDATE media SET ${updates.join(', ')} WHERE id = ?`;

    await env.DB.prepare(query).bind(...params).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

function getPlaceholderResponse(category: string | null, type: string | null, cacheMaxAge: number = 300) {
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

  return NextResponse.json(
    { media },
    {
      headers: {
        'Cache-Control': `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}, stale-while-revalidate=86400`,
      },
    }
  );
}
