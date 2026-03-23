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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as CloudflareEnv;
    const { path } = await params;
    const fileKey = path.join('/');

    const object = await env.R2.get(fileKey);

    if (!object) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

    return new NextResponse(object.body as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file from R2:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
