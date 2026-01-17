import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface R2Object {
  key: string;
  size: number;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
  };
}

interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2Bucket {
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
  }>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

// Categories for organizing images
const VALID_CATEGORIES = [
  'hero', 'header', 'innen', 'aussen', 'umgebung',
  'winter', 'sommer', 'summer', 'living', 'kitchen',
  'rooms', 'sauna', 'bathroom', 'outdoor', 'equipment', 'location'
];

interface ImageInfo {
  key: string;
  category: string;
  filename: string;
  size: number;
  contentType?: string;
}

// GET - List all images in R2 bucket with categories
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env || !env.R2) {
      return NextResponse.json(
        { error: 'R2 bucket not available' },
        { status: 500 }
      );
    }

    // Check for admin session
    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await env.DB.prepare(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > datetime("now")'
    ).bind(sessionId).first();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List all objects in R2 bucket
    const images: ImageInfo[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const listResult = await env.R2.list({ cursor });

      for (const obj of listResult.objects) {
        const parts = obj.key.split('/');
        const category = parts.length > 1 ? parts[0] : 'other';
        const filename = parts[parts.length - 1];

        images.push({
          key: obj.key,
          category: VALID_CATEGORIES.includes(category) ? category : 'other',
          filename,
          size: obj.size,
          contentType: obj.httpMetadata?.contentType,
        });
      }

      hasMore = listResult.truncated;
      cursor = listResult.cursor;
    }

    // Group by category for summary
    const byCategory: Record<string, number> = {};
    for (const img of images) {
      byCategory[img.category] = (byCategory[img.category] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      totalCount: images.length,
      byCategory,
      images,
    });
  } catch (error) {
    console.error('R2 list error:', error);
    return NextResponse.json(
      { error: 'Failed to list R2 objects' },
      { status: 500 }
    );
  }
}

// POST - Download a single image from R2
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env || !env.R2) {
      return NextResponse.json(
        { error: 'R2 bucket not available' },
        { status: 500 }
      );
    }

    // Check for admin session
    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await env.DB.prepare(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > datetime("now")'
    ).bind(sessionId).first();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { key?: string };
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Get object from R2
    const object = await env.R2.get(key);
    if (!object) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    const arrayBuffer = await object.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      key,
      contentType: object.httpMetadata?.contentType || 'image/jpeg',
      size: object.size,
      data: base64,
    });
  } catch (error) {
    console.error('R2 get error:', error);
    return NextResponse.json(
      { error: 'Failed to get R2 object' },
      { status: 500 }
    );
  }
}
