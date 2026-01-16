import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
}

interface DocumentRecord {
  id: number;
  guest_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  r2_key: string;
}

// GET - Download a document
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as unknown as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    if (!env.IMAGES_BUCKET) {
      return NextResponse.json({ error: 'R2 IMAGES_BUCKET not configured.' }, { status: 500 });
    }

    const id = searchParams.get('id');
    const key = searchParams.get('key');

    if (!id && !key) {
      return NextResponse.json({ error: 'id or key is required' }, { status: 400 });
    }

    let doc: DocumentRecord | null = null;
    let r2Key: string;

    if (key) {
      // Direct R2 key access (for documents stored in booking additional_costs)
      r2Key = key;
      // Try to find document in database for metadata
      doc = await env.DB.prepare(
        'SELECT * FROM guest_documents WHERE r2_key = ?'
      ).bind(key).first<DocumentRecord>();
    } else {
      // Get document metadata from database by ID
      doc = await env.DB.prepare(
        'SELECT * FROM guest_documents WHERE id = ?'
      ).bind(id).first<DocumentRecord>();

      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      r2Key = doc.r2_key;
    }

    // Get file from R2
    const object = await env.IMAGES_BUCKET.get(r2Key);

    if (!object) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Return the file with appropriate headers
    const headers = new Headers();
    // Use metadata from database if available, otherwise infer from key
    const fileType = doc?.file_type || (r2Key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const filename = doc?.original_filename || r2Key.split('/').pop() || 'document';
    headers.set('Content-Type', fileType);
    headers.set('Content-Disposition', `inline; filename="${filename}"`);

    if (object.size) {
      headers.set('Content-Length', object.size.toString());
    }

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error('GET /api/admin/guest-documents/download error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
