import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  getCredentialsWithDb,
  uploadImage,
  deleteImage,
  parseImageUrl,
  buildImageDeliveryUrl,
} from '@/lib/cloudflareMedia';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ADMIN_PASSWORD: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_STREAM_SUBDOMAIN?: string;
}

interface ImageRecord {
  id: number;
  image_key: string;
  alt_text: string;
  category: string;
  display_order: number;
  is_hero: number;
  created_at: string;
  cf_image_id: string | null;
}

// Valid categories - matching Gallery component structure
const VALID_CATEGORIES = [
  'hero',           // Hero slider images
  'exterior',       // Auenansichten (aussen)
  'living',         // Wohnbereich (wohnen)
  'bedrooms',       // Schlafzimmer (schlafen)
  'kitchen',        // Kueche (kueche)
  'bathroom',       // Badezimmer (bad)
  'wellness',       // Sauna & Wellness (bad)
  'surroundings',   // Umgebung (umgebung)
  'extras',         // Extras
  'summer',         // Summer activity backgrounds
  'winter',         // Winter activity backgrounds
  'hosts',          // Gastgeber Bild
];

/** Ensure cf_image_id column exists on the images table */
async function ensureCfImageIdColumn(db: D1Database): Promise<void> {
  try {
    await db.prepare("SELECT cf_image_id FROM images LIMIT 1").first();
  } catch {
    // Column doesn't exist - add it
    await db.prepare(
      "ALTER TABLE images ADD COLUMN cf_image_id TEXT DEFAULT NULL"
    ).run();
  }
}

/** Build the public URL for an image record */
function imageUrl(img: ImageRecord, accountHash: string | null): string {
  if (img.cf_image_id && accountHash) {
    return buildImageDeliveryUrl(accountHash, img.cf_image_id, 'public');
  }
  // Legacy fallback: proxy through API route
  return `/api/admin/images/file/${img.image_key}`;
}

/** Try to extract the account hash from any existing CF Images URL in the DB */
async function discoverAccountHash(db: D1Database): Promise<string | null> {
  try {
    const row = await db.prepare(
      "SELECT image_key FROM images WHERE cf_image_id IS NOT NULL LIMIT 1"
    ).first<{ image_key: string }>();
    if (row) {
      const parsed = parseImageUrl(row.image_key);
      if (parsed) return parsed.accountHash;
    }
  } catch {
    // ignore
  }
  return null;
}

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

      const env = (ctx as { env: Env }).env;

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

      const creds = await getCredentialsWithDb(env);

      return NextResponse.json({
        status: 'ok',
        hasImagesBucket: !!env.IMAGES_BUCKET,
        hasD1Database: !!env.DB,
        hasAdminPassword: !!env.ADMIN_PASSWORD,
        hasCfImagesCredentials: !!creds,
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
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured. Check wrangler.toml and Cloudflare Pages settings.',
        images: []
      }, { status: 500 });
    }

    await ensureCfImageIdColumn(env.DB);

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

    // Determine account hash for CF Images delivery URLs
    const creds = await getCredentialsWithDb(env);
    // The account hash for delivery URLs is obtained from existing variant URLs
    // or we can try the account ID (not always the same as hash)
    let accountHash: string | null = null;
    if (creds) {
      accountHash = await discoverAccountHash(env.DB);
    }

    // Generate URLs for each image
    const images = (results || []).map(img => ({
      ...img,
      image_url: imageUrl(img, accountHash)
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
    const { env } = await getCloudflareContext() as { env: Env };


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

    await ensureCfImageIdColumn(env.DB);

    const fileBuffer = await file.arrayBuffer();
    const creds = await getCredentialsWithDb(env);

    let imageKey: string;
    let cfImageId: string | null = null;
    let deliveryUrl: string | null = null;

    if (creds) {
      // Upload to Cloudflare Images
      const fileExt = file.name.split('.').pop();
      const uniqueName = `${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const cfResult = await uploadImage(creds, fileBuffer, uniqueName, {
        category,
        alt: altText || 'Bild',
      });

      cfImageId = cfResult.id;
      // Use the first variant URL as image_key for reference; extract account hash
      const firstVariant = cfResult.variants[0];
      if (firstVariant) {
        const parsed = parseImageUrl(firstVariant);
        if (parsed) {
          deliveryUrl = buildImageDeliveryUrl(parsed.accountHash, cfImageId, 'public');
        }
      }
      // Store a meaningful image_key (the original name, not used for serving)
      imageKey = uniqueName;
    } else {
      // Fallback to R2 if CF Images credentials are not configured
      const fileExt = file.name.split('.').pop();
      imageKey = `${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      await env.IMAGES_BUCKET.put(imageKey, fileBuffer, {
        httpMetadata: {
          contentType: file.type
        }
      });
    }

    // Save metadata to D1 (including is_hero and cf_image_id)
    const result = await env.DB.prepare(
      'INSERT INTO images (image_key, alt_text, category, display_order, is_hero, cf_image_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
    ).bind(imageKey, altText || 'Bild', category, displayOrder, isHero, cfImageId).first<ImageRecord>();

    if (!result) {
      // Rollback: delete uploaded file
      if (cfImageId && creds) {
        await deleteImage(creds, cfImageId);
      } else {
        await env.IMAGES_BUCKET.delete(imageKey);
      }
      return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 });
    }

    const resultUrl = deliveryUrl || `/api/admin/images/file/${result.image_key}`;

    return NextResponse.json({
      image: {
        ...result,
        image_url: resultUrl
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
    const { env } = await getCloudflareContext() as { env: Env };


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

    await ensureCfImageIdColumn(env.DB);

    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE images SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<ImageRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Determine account hash for delivery URL
    const creds = await getCredentialsWithDb(env);
    let accountHash: string | null = null;
    if (creds && result.cf_image_id) {
      accountHash = await discoverAccountHash(env.DB);
    }

    return NextResponse.json({
      image: {
        ...result,
        image_url: imageUrl(result, accountHash)
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
    const { env } = await getCloudflareContext() as { env: Env };


    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    await ensureCfImageIdColumn(env.DB);

    // Get image details first
    const image = await env.DB.prepare(
      'SELECT * FROM images WHERE id = ?'
    ).bind(imageId).first<ImageRecord>();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const creds = await getCredentialsWithDb(env);

    if (image.cf_image_id && creds) {
      // Delete from Cloudflare Images
      try {
        await deleteImage(creds, image.cf_image_id);
      } catch (e) {
        console.error('Failed to delete from CF Images, continuing with DB cleanup:', e);
      }
    } else {
      // Legacy: delete from R2
      try {
        await env.IMAGES_BUCKET.delete(image.image_key);
      } catch (e) {
        console.error('Failed to delete from R2, continuing with DB cleanup:', e);
      }
    }

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
