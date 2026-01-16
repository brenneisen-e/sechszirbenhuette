import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface DocumentRecord {
  id: number;
  guest_id: number;
  booking_id: number | null;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number | null;
  description: string | null;
  document_type: string;
  r2_key: string;
  created_at: string;
}

// Helper function to ensure table exists
async function ensureTableExists(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS guest_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      booking_id INTEGER,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      description TEXT,
      document_type TEXT DEFAULT 'other',
      r2_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    )
  `).run();

  // Try to add booking_id column if it doesn't exist (for existing tables)
  try {
    await db.prepare('ALTER TABLE guest_documents ADD COLUMN booking_id INTEGER').run();
  } catch {
    // Column already exists - ignore error
  }

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_documents_guest_id ON guest_documents(guest_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON guest_documents(booking_id)').run();
}

// GET - Fetch documents for a guest
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as unknown as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured.',
        documents: []
      }, { status: 500 });
    }

    await ensureTableExists(env.DB);

    const guestId = searchParams.get('guestId');
    const bookingId = searchParams.get('bookingId');

    if (!guestId && !bookingId) {
      return NextResponse.json({ error: 'guestId or bookingId is required' }, { status: 400 });
    }

    let results: DocumentRecord[];
    if (bookingId) {
      // Fetch documents for a specific booking
      const query = await env.DB.prepare(
        'SELECT * FROM guest_documents WHERE booking_id = ? ORDER BY created_at DESC'
      ).bind(parseInt(bookingId)).all<DocumentRecord>();
      results = query.results || [];
    } else {
      // Fetch documents for a guest
      const query = await env.DB.prepare(
        'SELECT * FROM guest_documents WHERE guest_id = ? ORDER BY created_at DESC'
      ).bind(parseInt(guestId!)).all<DocumentRecord>();
      results = query.results || [];
    }

    return NextResponse.json({ documents: results });
  } catch (error) {
    console.error('GET /api/admin/guest-documents error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, documents: [] }, { status: 500 });
  }
}

// POST - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as unknown as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    if (!env.IMAGES_BUCKET) {
      return NextResponse.json({ error: 'R2 IMAGES_BUCKET not configured.' }, { status: 500 });
    }

    await ensureTableExists(env.DB);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const guestId = formData.get('guestId') as string | null;
    const bookingId = formData.get('bookingId') as string | null;
    const description = formData.get('description') as string | null;
    const documentType = (formData.get('documentType') as string) || 'booking_pdf';

    if (!file || !guestId) {
      return NextResponse.json({ error: 'file and guestId are required' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `documents/${guestId}/${timestamp}_${safeFilename}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.IMAGES_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Save to database (with optional booking_id)
    const result = await env.DB.prepare(`
      INSERT INTO guest_documents (guest_id, booking_id, filename, original_filename, file_type, file_size, description, document_type, r2_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      parseInt(guestId),
      bookingId ? parseInt(bookingId) : null,
      safeFilename,
      file.name,
      file.type,
      file.size,
      description,
      documentType,
      r2Key
    ).run();

    return NextResponse.json({
      success: true,
      id: result.meta.last_row_id,
      r2_key: r2Key
    });
  } catch (error) {
    console.error('POST /api/admin/guest-documents error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as unknown as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Get the r2_key before deleting
    const doc = await env.DB.prepare(
      'SELECT r2_key FROM guest_documents WHERE id = ?'
    ).bind(id).first<{ r2_key: string }>();

    if (doc && env.IMAGES_BUCKET) {
      // Delete from R2
      try {
        await env.IMAGES_BUCKET.delete(doc.r2_key);
      } catch (r2Error) {
        console.error('Error deleting from R2:', r2Error);
      }
    }

    // Delete from database
    await env.DB.prepare('DELETE FROM guest_documents WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/guest-documents error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
