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
  categories?: string[]; // Additional categories from junction table
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
}

interface MediaCategoryRecord {
  media_id: string;
  category: string;
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

    let query: string;
    const params: string[] = [];

    if (category) {
      // When filtering by category, include media that has this category
      // either as primary category or in media_categories junction table
      query = `
        SELECT DISTINCT m.* FROM media m
        LEFT JOIN media_categories mc ON m.id = mc.media_id
        WHERE (m.category = ? OR mc.category = ?)
        ${type ? ' AND m.media_type = ?' : ''}
        ORDER BY m.display_order ASC, m.created_at DESC
      `;
      params.push(category, category);
      if (type) params.push(type);
    } else {
      query = 'SELECT DISTINCT * FROM media';
      if (type) {
        query += ' WHERE media_type = ?';
        params.push(type);
      }
      query += ' ORDER BY display_order ASC, created_at DESC';
    }

    const stmt = env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<MediaRecord>();
    // Deduplicate by ID to prevent any duplicate entries
    const seenIds = new Set<string>();
    const mediaList = (result.results || []).filter(m => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

    // Fetch all additional categories for the media items
    if (mediaList.length > 0) {
      const mediaIds = mediaList.map(m => m.id);
      const placeholders = mediaIds.map(() => '?').join(',');
      const catResult = await env.DB.prepare(
        `SELECT media_id, category FROM media_categories WHERE media_id IN (${placeholders})`
      ).bind(...mediaIds).all<MediaCategoryRecord>();

      // Group categories by media_id
      const categoriesMap: Record<string, string[]> = {};
      (catResult.results || []).forEach(row => {
        if (!categoriesMap[row.media_id]) categoriesMap[row.media_id] = [];
        categoriesMap[row.media_id].push(row.category);
      });

      // Attach categories to each media item
      mediaList.forEach(m => {
        m.categories = categoriesMap[m.id] || [];
      });
    }

    return NextResponse.json({
      media: mediaList,
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
      id?: string;
      alt_text?: string;
      title?: string;
      category?: string;
      categories?: string[]; // Additional categories for the junction table
      display_order?: number;
    };
    const { id, alt_text, title, category, categories, display_order } = body;

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

    // Update main media table if there are changes
    if (updates.length > 0) {
      params.push(id);
      await env.DB.prepare(
        `UPDATE media SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params).run();
    }

    // Handle additional categories (junction table)
    if (categories !== undefined) {
      // Delete existing categories for this media
      await env.DB.prepare('DELETE FROM media_categories WHERE media_id = ?').bind(id).run();

      // Insert new categories
      for (const cat of categories) {
        await env.DB.prepare(
          'INSERT INTO media_categories (media_id, category) VALUES (?, ?)'
        ).bind(id, cat).run();
      }
    }

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
