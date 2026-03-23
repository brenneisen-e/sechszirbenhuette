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

async function getDb(): Promise<D1Database | null> {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as CloudflareEnv;
    return env?.DB || null;
  } catch {
    return null;
  }
}

interface ReviewRecord {
  id: number;
  gast_name: string;
  bewertung: number;
  titel: string | null;
  text: string | null;
  aufenthalt_von: string | null;
  aufenthalt_bis: string | null;
  quelle: string | null;
  sichtbar: number;
  created_at: string;
}

// GET - List all reviews (including hidden ones for admin)
export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available', success: false }, { status: 503 });
    }

    const result = await db.prepare(
      'SELECT * FROM reviews ORDER BY created_at DESC'
    ).all<ReviewRecord>();

    return NextResponse.json({
      reviews: result.results || [],
      success: true,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews', success: false }, { status: 500 });
  }
}

// POST - Create a new review
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available', success: false }, { status: 503 });
    }

    const body = await request.json() as {
      gast_name: string;
      bewertung: number;
      titel?: string;
      text?: string;
      aufenthalt_von?: string;
      aufenthalt_bis?: string;
      quelle?: string;
      sichtbar?: boolean;
    };

    if (!body.gast_name || !body.bewertung) {
      return NextResponse.json({ error: 'gast_name and bewertung are required', success: false }, { status: 400 });
    }

    if (body.bewertung < 1 || body.bewertung > 5) {
      return NextResponse.json({ error: 'bewertung must be between 1 and 5', success: false }, { status: 400 });
    }

    const result = await db.prepare(`
      INSERT INTO reviews (gast_name, bewertung, titel, text, aufenthalt_von, aufenthalt_bis, quelle, sichtbar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      body.gast_name,
      body.bewertung,
      body.titel || null,
      body.text || null,
      body.aufenthalt_von || null,
      body.aufenthalt_bis || null,
      body.quelle || null,
      body.sichtbar !== false ? 1 : 0
    ).first<ReviewRecord>();

    return NextResponse.json({ review: result, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review', success: false }, { status: 500 });
  }
}

// PUT - Update an existing review
export async function PUT(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available', success: false }, { status: 503 });
    }

    const body = await request.json() as {
      id: number;
      gast_name?: string;
      bewertung?: number;
      titel?: string;
      text?: string;
      aufenthalt_von?: string;
      aufenthalt_bis?: string;
      quelle?: string;
      sichtbar?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required', success: false }, { status: 400 });
    }

    if (body.bewertung !== undefined && (body.bewertung < 1 || body.bewertung > 5)) {
      return NextResponse.json({ error: 'bewertung must be between 1 and 5', success: false }, { status: 400 });
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (body.gast_name !== undefined) { updates.push('gast_name = ?'); params.push(body.gast_name); }
    if (body.bewertung !== undefined) { updates.push('bewertung = ?'); params.push(body.bewertung); }
    if (body.titel !== undefined) { updates.push('titel = ?'); params.push(body.titel || null); }
    if (body.text !== undefined) { updates.push('text = ?'); params.push(body.text || null); }
    if (body.aufenthalt_von !== undefined) { updates.push('aufenthalt_von = ?'); params.push(body.aufenthalt_von || null); }
    if (body.aufenthalt_bis !== undefined) { updates.push('aufenthalt_bis = ?'); params.push(body.aufenthalt_bis || null); }
    if (body.quelle !== undefined) { updates.push('quelle = ?'); params.push(body.quelle || null); }
    if (body.sichtbar !== undefined) { updates.push('sichtbar = ?'); params.push(body.sichtbar ? 1 : 0); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update', success: false }, { status: 400 });
    }

    params.push(body.id);
    const result = await db.prepare(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...params).first<ReviewRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Review not found', success: false }, { status: 404 });
    }

    return NextResponse.json({ review: result, success: true });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review', success: false }, { status: 500 });
  }
}

// DELETE - Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available', success: false }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required', success: false }, { status: 400 });
    }

    await db.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review', success: false }, { status: 500 });
  }
}
