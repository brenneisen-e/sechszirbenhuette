import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { env } = await getCloudflareContext();
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
