import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

interface ImageRecord {
  id: number;
  image_key: string;
  alt_text: string;
  category: string;
  display_order: number;
  is_hero: number;
  created_at: string;
}

// Valid categories - matching Gallery component structure
const VALID_CATEGORIES = [
  'hero',           // Hero slider images
  'exterior',       // Außenansichten (aussen)
  'living',         // Wohnbereich (wohnen)
  'bedrooms',       // Schlafzimmer (schlafen)
  'kitchen',        // Küche (kueche)
  'bathroom',       // Badezimmer (bad)
  'wellness',       // Sauna & Wellness (bad)
  'surroundings',   // Umgebung (umgebung)
  'extras',         // Extras
  'summer',         // Summer activity backgrounds
  'winter',         // Winter activity backgrounds
  'hosts',          // Gastgeber Bild
];

// GET - Fetch images (optionally filtered by category)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Simple ping - no bindings needed
  if (searchParams.get('ping') === 'true') {
    return NextResponse.json({ pong: true, timestamp: Date.now() });
  }

  // Health check endpoint
  if (searchParams.get('health') === 'true') {
    try {
      const ctx = await getCloudflareContext();

      if (!ctx) {
        return NextResponse.json({
          status: 'error',
          error: 'getCloudflareContext() returned null/undefined'
        }, { status: 500 });
      }

      const env = (ctx as unknown as { env: Env }).env;

      if (!env) {
        return NextResponse.json({
          status: 'error',
          error: 'No env object in request context'
        }, { status: 500 });
      }

      // Test D1 connection
      let tableExists = false;
      let tableError = '';
      if (env.DB) {
        try {
          await env.DB.prepare('SELECT 1 FROM images LIMIT 1').first();
          tableExists = true;
        } catch (e) {
          tableError = e instanceof Error ? e.message : 'Unknown error';
        }
      }

      return NextResponse.json({
        status: 'ok',
        hasImagesBucket: !!env.IMAGES_BUCKET,
        hasD1Database: !!env.DB,
        hasAdminPassword: !!env.ADMIN_PASSWORD,
        tableExists,
        tableError: tableError || undefined
      });
    } catch (e) {
      return NextResponse.json({
        status: 'error',
        error: e instanceof Error ? e.message : 'Health check failed',
        stack: e instanceof Error ? e.stack : undefined
      }, { status: 500 });
    }
  }

  try {

    const ctx = await getCloudflareContext();
    const env = (ctx as unknown as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured. Check wrangler.toml and Cloudflare Pages settings.',
        images: []
      }, { status: 500 });
    }

    const category = searchParams.get('category');
    const heroOnly = searchParams.get('hero') === 'true';

    let query = 'SELECT * FROM images';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (heroOnly) {
      conditions.push('is_hero = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sort by is_hero first (hero images on top), then by display_order
    query += ' ORDER BY is_hero DESC, display_order ASC, created_at DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const { results } = await stmt.all<ImageRecord>();

    // Generate URLs for each image
    const images = (results || []).map(img => ({
      ...img,
      image_url: `/api/admin/images/file/${img.image_key}`
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('GET /api/admin/images error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    // Return JSON error with images array to prevent client-side parsing errors
    return NextResponse.json({ error: message, images: [] }, { status: 500 });
  }
}

// POST - Upload new image
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = formData.get('altText') as string;
    const category = formData.get('category') as string || 'exterior';
    const displayOrder = parseInt(formData.get('displayOrder') as string || '999');
    const isHeroParam = formData.get('isHero');

    // Auto-determine is_hero: if explicitly set, use that; otherwise based on category
    let isHero = 0;
    if (isHeroParam !== null) {
      isHero = isHeroParam === 'true' || isHeroParam === '1' ? 1 : 0;
    } else {
      // Auto-set hero for exterior and surroundings (good hero candidates)
      isHero = ['exterior', 'surroundings', 'hero'].includes(category) ? 1 : 0;
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 });
    }

    // Generate unique filename with category prefix
    const fileExt = file.name.split('.').pop();
    const imageKey = `${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await env.IMAGES_BUCKET.put(imageKey, fileBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    });

    // Save metadata to D1 (including is_hero)
    const result = await env.DB.prepare(
      'INSERT INTO images (image_key, alt_text, category, display_order, is_hero) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).bind(imageKey, altText || 'Bild', category, displayOrder, isHero).first<ImageRecord>();

    if (!result) {
      // Rollback: delete uploaded file
      await env.IMAGES_BUCKET.delete(imageKey);
      return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 });
    }

    return NextResponse.json({
      image: {
        ...result,
        image_url: `/api/admin/images/file/${result.image_key}`
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update image metadata (category, alt_text, display_order)
export async function PUT(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { id?: string; alt_text?: string; category?: string; display_order?: number; is_hero?: boolean };
    const { id, alt_text, category, display_order, is_hero } = body;

    if (!id) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (alt_text !== undefined) {
      updates.push('alt_text = ?');
      values.push(alt_text);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(display_order);
    }
    if (is_hero !== undefined) {
      updates.push('is_hero = ?');
      values.push(is_hero ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE images SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<ImageRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      image: {
        ...result,
        image_url: `/api/admin/images/file/${result.image_key}`
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete image
export async function DELETE(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Get image details first
    const image = await env.DB.prepare(
      'SELECT * FROM images WHERE id = ?'
    ).bind(imageId).first<ImageRecord>();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from R2
    await env.IMAGES_BUCKET.delete(image.image_key);

    // Delete from D1
    await env.DB.prepare(
      'DELETE FROM images WHERE id = ?'
    ).bind(imageId).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
