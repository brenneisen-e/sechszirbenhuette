import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

interface HeroImageRecord {
  id: number;
  side: string;
  aspect_ratio: string;
  image_key: string;
  alt_text: string;
  created_at: string;
}

const VALID_SIDES = ['nord', 'sued'];
const VALID_RATIOS = ['21:9', '16:9', '4:5'];

// GET - Fetch all hero images (public, used by frontend)
export async function GET() {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured', heroImages: [] }, { status: 500 });
    }

    // Ensure table exists
    try {
      await env.DB.prepare('SELECT 1 FROM hero_images LIMIT 1').first();
    } catch {
      // Table doesn't exist yet - return empty
      return NextResponse.json({ heroImages: [] });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM hero_images ORDER BY side ASC, aspect_ratio ASC'
    ).all<HeroImageRecord>();

    const heroImages = (results || []).map((img: HeroImageRecord) => ({
      ...img,
      image_url: `/api/admin/images/file/${img.image_key}`
    }));

    return NextResponse.json({ heroImages });
  } catch (error) {
    console.error('GET /api/admin/hero-images error:', error);
    return NextResponse.json({ error: 'Internal server error', heroImages: [] }, { status: 500 });
  }
}

// POST - Upload a hero image for a specific side + aspect ratio
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as { env: Env };

    const adminPassword = request.headers.get('x-admin-password');
    if (!env.ADMIN_PASSWORD || adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const side = formData.get('side') as string;
    const aspectRatio = formData.get('aspectRatio') as string;
    const altText = formData.get('altText') as string || 'Hero Bild';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!VALID_SIDES.includes(side)) {
      return NextResponse.json({ error: `Invalid side. Must be one of: ${VALID_SIDES.join(', ')}` }, { status: 400 });
    }
    if (!VALID_RATIOS.includes(aspectRatio)) {
      return NextResponse.json({ error: `Invalid aspect ratio. Must be one of: ${VALID_RATIOS.join(', ')}` }, { status: 400 });
    }

    // Ensure table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS hero_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        side TEXT NOT NULL CHECK(side IN ('nord', 'sued')),
        aspect_ratio TEXT NOT NULL CHECK(aspect_ratio IN ('21:9', '16:9', '4:5')),
        image_key TEXT NOT NULL,
        alt_text TEXT DEFAULT 'Hero Bild',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(side, aspect_ratio)
      )
    `).run();

    // Check if there's an existing image for this slot
    const existing = await env.DB.prepare(
      'SELECT * FROM hero_images WHERE side = ? AND aspect_ratio = ?'
    ).bind(side, aspectRatio).first<HeroImageRecord>();

    // Delete old image from R2 if exists
    if (existing) {
      await env.IMAGES_BUCKET.delete(existing.image_key);
      await env.DB.prepare('DELETE FROM hero_images WHERE id = ?').bind(existing.id).run();
    }

    // Upload new image to R2
    const ratioSlug = aspectRatio.replace(':', 'x');
    const fileExt = file.name.split('.').pop() || 'jpg';
    const imageKey = `hero/${side}-${ratioSlug}-${Date.now()}.${fileExt}`;

    const fileBuffer = await file.arrayBuffer();
    await env.IMAGES_BUCKET.put(imageKey, fileBuffer, {
      httpMetadata: { contentType: file.type }
    });

    // Save metadata
    const result = await env.DB.prepare(
      'INSERT INTO hero_images (side, aspect_ratio, image_key, alt_text) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(side, aspectRatio, imageKey, altText).first<HeroImageRecord>();

    if (!result) {
      await env.IMAGES_BUCKET.delete(imageKey);
      return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
    }

    return NextResponse.json({
      heroImage: { ...result, image_url: `/api/admin/images/file/${result.image_key}` }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/hero-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a hero image for a specific side + aspect ratio
export async function DELETE(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as { env: Env };

    const adminPassword = request.headers.get('x-admin-password');
    if (!env.ADMIN_PASSWORD || adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const side = searchParams.get('side');
    const aspectRatio = searchParams.get('ratio');

    if (!side || !aspectRatio) {
      return NextResponse.json({ error: 'side and ratio parameters required' }, { status: 400 });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM hero_images WHERE side = ? AND aspect_ratio = ?'
    ).bind(side, aspectRatio).first<HeroImageRecord>();

    if (!existing) {
      return NextResponse.json({ error: 'Hero image not found' }, { status: 404 });
    }

    await env.IMAGES_BUCKET.delete(existing.image_key);
    await env.DB.prepare('DELETE FROM hero_images WHERE id = ?').bind(existing.id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/hero-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
