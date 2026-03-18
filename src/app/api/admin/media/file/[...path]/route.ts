import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface R2Object {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
  };
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
}

interface CloudflareEnv {
  R2: R2Bucket;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as unknown as CloudflareEnv;
  } catch {
    return null;
  }
}

// Content type mapping for common image/video extensions
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fileKey = path.join('/');

  const env = await getCloudflareEnv();
  if (!env || !env.R2) {
    return NextResponse.json({ error: 'Storage not available' }, { status: 503 });
  }

  const object = await env.R2.get(fileKey);
  if (!object) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Determine content type from R2 metadata or file extension
  const ext = fileKey.split('.').pop()?.toLowerCase() || '';
  const contentType = object.httpMetadata?.contentType || CONTENT_TYPES[ext] || 'application/octet-stream';

  return new NextResponse(object.body as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
