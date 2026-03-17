import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  IMAGES_BUCKET: R2Bucket;
}

// GET - Serve image from R2
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.IMAGES_BUCKET) {
      return NextResponse.json({ error: 'R2 bucket not configured' }, { status: 500 });
    }

    // Catch-all route gives us an array of path segments
    // Join them back together to get the full key (e.g., ["hero", "123-abc.jpg"] -> "hero/123-abc.jpg")
    const fullKey = key.join('/');

    const object = await env.IMAGES_BUCKET.get(fullKey);

    if (!object) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Add ETag for caching
    if (object.etag) {
      headers.set('ETag', object.etag);
    }

    return new NextResponse(object.body, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error serving image:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
