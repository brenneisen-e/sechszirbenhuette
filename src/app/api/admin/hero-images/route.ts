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

interface HeroImageRecord {
  id: number;
  side: string;
  aspect_ratio: string;
  image_key: string;
  alt_text: string;
  created_at: string;
  cf_image_id: string | null;
}

const VALID_SIDES = ['nord', 'sued'];
const VALID_RATIOS = ['21:9', '16:9', '4:5'];

/** Ensure cf_image_id column exists on the hero_images table */
async function ensureCfImageIdColumn(db: D1Database): Promise<void> {
  try {
    await db.prepare("SELECT cf_image_id FROM hero_images LIMIT 1").first();
  } catch {
    // Column doesn't exist - add it
    await db.prepare(
      "ALTER TABLE hero_images ADD COLUMN cf_image_id TEXT DEFAULT NULL"
    ).run();
  }
}

/** Try to extract the account hash from any existing CF Images variant URL in hero_images */
async function discoverAccountHash(db: D1Database): Promise<string | null> {
  // Check hero_images first, then images table as fallback
  for (const table of ['hero_images', 'images']) {
    try {
      const row = await db.prepare(
        `SELECT image_key FROM ${table} WHERE cf_image_id IS NOT NULL LIMIT 1`
      ).first<{ image_key: string }>();
      if (row) {
        const parsed = parseImageUrl(row.image_key);
        if (parsed) return parsed.accountHash;
      }
    } catch {
      // table might not exist
    }
  }
  return null;
}

/** Build the public URL for a hero image record */
function heroImageUrl(img: HeroImageRecord, accountHash: string | null): string {
  if (img.cf_image_id && accountHash) {
    return buildImageDeliveryUrl(accountHash, img.cf_image_id, 'public');
  }
  // Legacy fallback: proxy through API route
  return `/api/admin/images/file/${img.image_key}`;
}

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

    await ensureCfImageIdColumn(env.DB);

    const { results } = await env.DB.prepare(
      'SELECT * FROM hero_images ORDER BY side ASC, aspect_ratio ASC'
    ).all<HeroImageRecord>();

    // Determine account hash for CF Images delivery URLs
    const creds = await getCredentialsWithDb(env);
    let accountHash: string | null = null;
    if (creds) {
      accountHash = await discoverAccountHash(env.DB);
    }

    const heroImages = (results || []).map((img: HeroImageRecord) => ({
      ...img,
      image_url: heroImageUrl(img, accountHash)
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

    // Ensure table exists (with cf_image_id column)
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS hero_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        side TEXT NOT NULL CHECK(side IN ('nord', 'sued')),
        aspect_ratio TEXT NOT NULL CHECK(aspect_ratio IN ('21:9', '16:9', '4:5')),
        image_key TEXT NOT NULL,
        alt_text TEXT DEFAULT 'Hero Bild',
        cf_image_id TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(side, aspect_ratio)
      )
    `).run();

    await ensureCfImageIdColumn(env.DB);

    // Check if there's an existing image for this slot
    const existing = await env.DB.prepare(
      'SELECT * FROM hero_images WHERE side = ? AND aspect_ratio = ?'
    ).bind(side, aspectRatio).first<HeroImageRecord>();

    // Delete old image if exists
    if (existing) {
      const creds = await getCredentialsWithDb(env);
      if (existing.cf_image_id && creds) {
        try {
          await deleteImage(creds, existing.cf_image_id);
        } catch (e) {
          console.error('Failed to delete old CF Image:', e);
        }
      } else {
        try {
          await env.IMAGES_BUCKET.delete(existing.image_key);
        } catch (e) {
          console.error('Failed to delete old R2 image:', e);
        }
      }
      await env.DB.prepare('DELETE FROM hero_images WHERE id = ?').bind(existing.id).run();
    }

    const fileBuffer = await file.arrayBuffer();
    const creds = await getCredentialsWithDb(env);

    let imageKey: string;
    let cfImageId: string | null = null;
    let deliveryUrl: string | null = null;

    const ratioSlug = aspectRatio.replace(':', 'x');
    const fileExt = file.name.split('.').pop() || 'jpg';
    const uniqueName = `hero/${side}-${ratioSlug}-${Date.now()}.${fileExt}`;

    if (creds) {
      // Upload to Cloudflare Images
      const cfResult = await uploadImage(creds, fileBuffer, uniqueName, {
        side,
        aspectRatio,
        alt: altText,
        type: 'hero',
      });

      cfImageId = cfResult.id;
      const firstVariant = cfResult.variants[0];
      if (firstVariant) {
        const parsed = parseImageUrl(firstVariant);
        if (parsed) {
          deliveryUrl = buildImageDeliveryUrl(parsed.accountHash, cfImageId, 'public');
        }
      }
      imageKey = uniqueName;
    } else {
      // Fallback to R2
      imageKey = uniqueName;
      await env.IMAGES_BUCKET.put(imageKey, fileBuffer, {
        httpMetadata: { contentType: file.type }
      });
    }

    // Save metadata
    const result = await env.DB.prepare(
      'INSERT INTO hero_images (side, aspect_ratio, image_key, alt_text, cf_image_id) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).bind(side, aspectRatio, imageKey, altText, cfImageId).first<HeroImageRecord>();

    if (!result) {
      if (cfImageId && creds) {
        await deleteImage(creds, cfImageId);
      } else {
        await env.IMAGES_BUCKET.delete(imageKey);
      }
      return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
    }

    const resultUrl = deliveryUrl || `/api/admin/images/file/${result.image_key}`;

    return NextResponse.json({
      heroImage: { ...result, image_url: resultUrl }
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


    const { searchParams } = new URL(request.url);
    const side = searchParams.get('side');
    const aspectRatio = searchParams.get('ratio');

    if (!side || !aspectRatio) {
      return NextResponse.json({ error: 'side and ratio parameters required' }, { status: 400 });
    }

    await ensureCfImageIdColumn(env.DB);

    const existing = await env.DB.prepare(
      'SELECT * FROM hero_images WHERE side = ? AND aspect_ratio = ?'
    ).bind(side, aspectRatio).first<HeroImageRecord>();

    if (!existing) {
      return NextResponse.json({ error: 'Hero image not found' }, { status: 404 });
    }

    const creds = await getCredentialsWithDb(env);

    if (existing.cf_image_id && creds) {
      // Delete from Cloudflare Images
      try {
        await deleteImage(creds, existing.cf_image_id);
      } catch (e) {
        console.error('Failed to delete from CF Images, continuing with DB cleanup:', e);
      }
    } else {
      // Legacy: delete from R2
      try {
        await env.IMAGES_BUCKET.delete(existing.image_key);
      } catch (e) {
        console.error('Failed to delete from R2, continuing with DB cleanup:', e);
      }
    }

    await env.DB.prepare('DELETE FROM hero_images WHERE id = ?').bind(existing.id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/hero-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
