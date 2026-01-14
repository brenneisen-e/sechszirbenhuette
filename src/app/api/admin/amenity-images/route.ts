import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface CloudflareEnv {
  DB: D1Database;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

// Auto-create table if it doesn't exist
async function ensureTableExists(db: D1Database): Promise<void> {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS amenity_card_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_key TEXT NOT NULL,
        media_id TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(card_key, media_id)
      )
    `).run();

    // Create index if not exists
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_amenity_card_images_key ON amenity_card_images(card_key)
    `).run();
  } catch (error) {
    console.log('Table might already exist or error creating:', error);
  }
}

interface AmenityCardImage {
  id: number;
  card_key: string;
  media_id: string;
  display_order: number;
  created_at: string;
  // Joined from media table
  url?: string;
  title?: string;
  alt_text?: string;
}

// GET - Get all amenity card image assignments
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    // Ensure table exists
    await ensureTableExists(env.DB);

    const { searchParams } = new URL(request.url);
    const cardKey = searchParams.get('card_key');

    let query = `
      SELECT
        aci.id, aci.card_key, aci.media_id, aci.display_order, aci.created_at,
        m.url, m.title, m.alt_text
      FROM amenity_card_images aci
      LEFT JOIN media m ON aci.media_id = m.id
    `;

    if (cardKey) {
      query += ` WHERE aci.card_key = ?`;
      query += ` ORDER BY aci.display_order ASC`;
      const result = await env.DB.prepare(query).bind(cardKey).all<AmenityCardImage>();
      return NextResponse.json({ images: result.results || [], success: true });
    }

    query += ` ORDER BY aci.card_key, aci.display_order ASC`;
    const result = await env.DB.prepare(query).all<AmenityCardImage>();

    // Group by card_key
    const grouped: Record<string, AmenityCardImage[]> = {};
    for (const img of result.results || []) {
      if (!grouped[img.card_key]) {
        grouped[img.card_key] = [];
      }
      grouped[img.card_key].push(img);
    }

    return NextResponse.json({
      images: result.results || [],
      byCard: grouped,
      success: true
    });
  } catch (error) {
    console.error('Error fetching amenity card images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenity card images', success: false },
      { status: 500 }
    );
  }
}

// POST - Add image to amenity card
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    // Ensure table exists
    await ensureTableExists(env.DB);

    const body = await request.json();
    const { card_key, media_id } = body;

    if (!card_key || !media_id) {
      return NextResponse.json(
        { error: 'card_key and media_id are required', success: false },
        { status: 400 }
      );
    }

    // Get next display order
    const orderResult = await env.DB.prepare(
      'SELECT MAX(display_order) as max_order FROM amenity_card_images WHERE card_key = ?'
    ).bind(card_key).first<{ max_order: number | null }>();
    const nextOrder = (orderResult?.max_order ?? -1) + 1;

    // Insert new assignment
    await env.DB.prepare(`
      INSERT INTO amenity_card_images (card_key, media_id, display_order, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(card_key, media_id, nextOrder).run();

    return NextResponse.json({
      success: true,
      message: 'Image added to card'
    });
  } catch (error) {
    console.error('Error adding amenity card image:', error);
    return NextResponse.json(
      { error: 'Failed to add image to card', success: false },
      { status: 500 }
    );
  }
}

// PUT - Update display order
export async function PUT(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const body = await request.json();
    const { id, display_order } = body;

    if (!id || display_order === undefined) {
      return NextResponse.json(
        { error: 'id and display_order are required', success: false },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      'UPDATE amenity_card_images SET display_order = ? WHERE id = ?'
    ).bind(display_order, id).run();

    return NextResponse.json({
      success: true,
      message: 'Display order updated'
    });
  } catch (error) {
    console.error('Error updating amenity card image:', error);
    return NextResponse.json(
      { error: 'Failed to update display order', success: false },
      { status: 500 }
    );
  }
}

// DELETE - Remove image from card
export async function DELETE(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required', success: false },
        { status: 400 }
      );
    }

    await env.DB.prepare('DELETE FROM amenity_card_images WHERE id = ?').bind(id).run();

    return NextResponse.json({
      success: true,
      message: 'Image removed from card'
    });
  } catch (error) {
    console.error('Error deleting amenity card image:', error);
    return NextResponse.json(
      { error: 'Failed to remove image from card', success: false },
      { status: 500 }
    );
  }
}
