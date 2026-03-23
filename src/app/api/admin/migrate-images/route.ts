import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { uploadImage, buildImageDeliveryUrl, getCredentialsWithDb } from '@/lib/cloudflareMedia';

const CF_IMAGES_ACCOUNT_HASH = 'VR8seCaTFFzHRDFZQKPkeQ';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2Object {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
}

interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_STREAM_SUBDOMAIN?: string;
}

interface MediaRecord {
  id: string;
  file_key: string;
  url: string;
  category: string;
  media_type: string;
  title: string;
  alt_text: string;
}

/**
 * GET - Check migration status (how many images need migrating)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as CloudflareEnv;

    // Count images that need migration (R2-based URLs)
    const r2Images = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM media WHERE media_type = 'image' AND url LIKE '/api/%'"
    ).first<{ count: number }>();

    const cfImages = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM media WHERE media_type = 'image' AND url LIKE 'https://imagedelivery.net/%'"
    ).first<{ count: number }>();

    const totalImages = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM media WHERE media_type = 'image'"
    ).first<{ count: number }>();

    // Check if credentials are available
    const creds = await getCredentialsWithDb(env);

    return NextResponse.json({
      success: true,
      needsMigration: r2Images?.count || 0,
      alreadyMigrated: cfImages?.count || 0,
      totalImages: totalImages?.count || 0,
      hasCredentials: !!creds,
    });
  } catch (error) {
    console.error('Migration status error:', error);
    return NextResponse.json({ error: 'Failed to check migration status' }, { status: 500 });
  }
}

/**
 * POST - Run the migration: R2 images → Cloudflare Images
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as CloudflareEnv;

    // Get Cloudflare credentials
    const creds = await getCredentialsWithDb(env);
    if (!creds) {
      return NextResponse.json({
        error: 'Cloudflare API credentials not configured. Set the API token in System → Cloudflare Settings first.',
      }, { status: 400 });
    }

    // Ensure cf_image_id column exists
    try {
      await env.DB.prepare("ALTER TABLE media ADD COLUMN cf_image_id TEXT DEFAULT NULL").run();
    } catch { /* column already exists */ }

    // Find all R2-hosted images
    const result = await env.DB.prepare(
      "SELECT * FROM media WHERE media_type = 'image' AND url LIKE '/api/%' ORDER BY created_at ASC"
    ).all<MediaRecord>();

    const images = result.results || [];

    if (images.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No images need migration. All images already on Cloudflare Images.',
        migrated: 0,
        failed: 0,
        results: [],
      });
    }

    const results: { id: string; title: string; status: 'migrated' | 'failed'; error?: string }[] = [];

    for (const img of images) {
      try {
        // Extract the R2 key from the URL: /api/admin/media/file/{key}
        const r2Key = img.url.replace('/api/admin/media/file/', '');

        // Read the image from R2
        const r2Object = await env.R2.get(r2Key);
        if (!r2Object) {
          // Try with file_key as fallback
          const fallbackObject = await env.R2.get(img.file_key);
          if (!fallbackObject) {
            results.push({ id: img.id, title: img.title || r2Key, status: 'failed', error: 'Not found in R2' });
            continue;
          }
          // Use fallback object
          const arrayBuffer = await streamToArrayBuffer(fallbackObject.body);
          const filename = img.file_key.split('/').pop() || 'image.jpg';
          const cfResult = await uploadImage(creds, new Uint8Array(arrayBuffer), filename, {
            category: img.category,
            originalName: img.title || filename,
            mediaId: img.id,
          });

          const newUrl = buildImageDeliveryUrl(CF_IMAGES_ACCOUNT_HASH, cfResult.id, 'public');
          await env.DB.prepare(
            "UPDATE media SET url = ?, cf_image_id = ? WHERE id = ?"
          ).bind(newUrl, cfResult.id, img.id).run();

          results.push({ id: img.id, title: img.title || filename, status: 'migrated' });
          continue;
        }

        // Convert ReadableStream to ArrayBuffer
        const arrayBuffer = await streamToArrayBuffer(r2Object.body);
        const filename = r2Key.split('/').pop() || 'image.jpg';

        // Upload to Cloudflare Images
        const cfResult = await uploadImage(creds, new Uint8Array(arrayBuffer), filename, {
          category: img.category,
          originalName: img.title || filename,
          mediaId: img.id,
        });

        // Update D1 with new Cloudflare Images URL
        const newUrl = buildImageDeliveryUrl(CF_IMAGES_ACCOUNT_HASH, cfResult.id, 'public');
        await env.DB.prepare(
          "UPDATE media SET url = ?, cf_image_id = ? WHERE id = ?"
        ).bind(newUrl, cfResult.id, img.id).run();

        results.push({ id: img.id, title: img.title || filename, status: 'migrated' });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: img.id, title: img.title || img.id, status: 'failed', error: errMsg });
      }
    }

    const migrated = results.filter(r => r.status === 'migrated').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Migration complete: ${migrated} migrated, ${failed} failed out of ${images.length} images.`,
      migrated,
      failed,
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}

async function streamToArrayBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}
