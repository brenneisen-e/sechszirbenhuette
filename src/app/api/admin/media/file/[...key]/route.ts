import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// R2 types for Cloudflare
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

interface CloudflareEnv {
  DB: unknown;
  R2: R2Bucket;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const env = await getCloudflareEnv();
    if (!env || !env.R2) {
      return NextResponse.json(
        { error: 'Cloudflare environment not available' },
        { status: 503 }
      );
    }

    const params = await context.params;
    const fileKey = params.key.join('/');

    const object = await env.R2.get(fileKey);

    if (!object) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');

    // Set content disposition for downloads if requested
    const { searchParams } = new URL(request.url);
    if (searchParams.get('download') === 'true') {
      const filename = fileKey.split('/').pop() || 'file';
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return new NextResponse(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
