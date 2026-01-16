import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cloudflare types
interface R2Object {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
  };
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: { httpMetadata?: { contentType?: string } }): Promise<R2Object>;
  delete(key: string): Promise<void>;
}

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
  R2: R2Bucket;
}

// Get Cloudflare environment
async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as unknown as CloudflareEnv;
  } catch {
    return null;
  }
}

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

// GET - List all media or filter by category/type
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // 'image' | 'video' | null

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

    return NextResponse.json({
      media: result.results || [],
      success: true
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media', success: false },
      { status: 500 }
    );
  }
}

// POST - Upload new media files
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const category = formData.get('category') as string || 'aussen';
    const altText = formData.get('alt_text') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided', success: false },
        { status: 400 }
      );
    }

    const uploadedMedia: MediaRecord[] = [];

    for (const file of files) {
      // Determine media type
      const isVideo = file.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      // Generate unique key
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const fileKey = `${category}/${timestamp}-${randomStr}.${extension}`;

      // Upload to R2
      const arrayBuffer = await file.arrayBuffer();
      await env.R2.put(fileKey, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });

      // Get current max display_order for this category
      const orderResult = await env.DB.prepare(
        'SELECT MAX(display_order) as max_order FROM media WHERE category = ?'
      ).bind(category).first<{ max_order: number | null }>();
      const nextOrder = (orderResult?.max_order ?? -1) + 1;

      // Insert into D1
      const id = `${timestamp}-${randomStr}`;
      const url = `/api/admin/media/file/${fileKey}`;

      await env.DB.prepare(`
        INSERT INTO media (id, file_key, url, alt_text, title, category, media_type, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, fileKey, url, altText || file.name, file.name, category, mediaType, nextOrder).run();

      uploadedMedia.push({
        id,
        file_key: fileKey,
        url,
        alt_text: altText || file.name,
        title: file.name,
        category,
        media_type: mediaType,
        display_order: nextOrder,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      media: uploadedMedia,
      success: true,
      message: `${uploadedMedia.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media', success: false },
      { status: 500 }
    );
  }
}

// PUT - Update media metadata
export async function PUT(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }
    const body = await request.json() as {
      id?: number;
      alt_text?: string;
      title?: string;
      category?: string;
      display_order?: number;
    };
    const { id, alt_text, title, category, display_order } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required', success: false },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (alt_text !== undefined) {
      updates.push('alt_text = ?');
      params.push(alt_text);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided', success: false },
        { status: 400 }
      );
    }

    params.push(id);
    await env.DB.prepare(
      `UPDATE media SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return NextResponse.json({
      success: true,
      message: 'Media updated successfully'
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { error: 'Failed to update media', success: false },
      { status: 500 }
    );
  }
}

// DELETE - Delete media
export async function DELETE(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required', success: false },
        { status: 400 }
      );
    }

    // Get file key before deleting
    const media = await env.DB.prepare(
      'SELECT file_key FROM media WHERE id = ?'
    ).bind(id).first<{ file_key: string }>();

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found', success: false },
        { status: 404 }
      );
    }

    // Delete from R2
    await env.R2.delete(media.file_key);

    // Delete from D1
    await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media', success: false },
      { status: 500 }
    );
  }
}
