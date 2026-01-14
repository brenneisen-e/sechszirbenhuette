import { NextRequest, NextResponse } from 'next/server';

// Dynamic import for Cloudflare context (only works in Cloudflare environment)
async function getCloudflareEnv(): Promise<{ DB: unknown; R2: unknown } | null> {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return null;
  }
  try {
    // Use Function constructor to avoid webpack bundling
    const importFn = new Function('specifier', 'return import(specifier)');
    const mod = await importFn('@opennextjs/cloudflare');
    return (await mod.getCloudflareContext()).env;
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
