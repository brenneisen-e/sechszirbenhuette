import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2Object {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
  };
  size: number;
  range?: { offset: number; length: number };
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

interface R2Bucket {
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2ObjectBody | null>;
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>;
}

interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'hero';

  try {
    const env = await getCloudflareEnv();

    if (!env?.DB || !env?.R2) {
      return NextResponse.json({ error: 'Not available' }, { status: 503 });
    }

    // Get video file_key from database
    const media = await env.DB.prepare(
      "SELECT file_key FROM media WHERE category = ? AND media_type = 'video' ORDER BY display_order ASC LIMIT 1"
    ).bind(category).first<{ file_key: string }>();

    if (!media?.file_key) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const fileKey = media.file_key;

    // Get file metadata first
    const head = await env.R2.head(fileKey);
    if (!head) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    const fileSize = head.size;
    const contentType = head.httpMetadata?.contentType || 'video/mp4';

    // Handle Range request for Safari compatibility
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      // Parse range header: "bytes=0-" or "bytes=0-1023"
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const length = end - start + 1;

        // Get partial content from R2
        const object = await env.R2.get(fileKey, {
          range: { offset: start, length }
        });

        if (!object) {
          return NextResponse.json({ error: 'Failed to stream' }, { status: 500 });
        }

        // Return 206 Partial Content
        return new NextResponse(object.body, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': length.toString(),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // No range request - return full file with Accept-Ranges header
    const object = await env.R2.get(fileKey);

    if (!object) {
      return NextResponse.json({ error: 'Failed to get video' }, { status: 500 });
    }

    return new NextResponse(object.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Video stream error:', error);
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
