import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cloudflare types
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

// Get Cloudflare environment
async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

export interface TextCustomization {
  id: number;
  section_key: string;
  text_de: string | null;
  text_en: string | null;
  font_size: string | null;
  font_color: string | null;
  font_family: string | null;
  font_weight: string | null;
  created_at: string;
  updated_at: string;
}

// GET - List all text customizations
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const section_key = searchParams.get('section_key');

    let query = 'SELECT * FROM text_customizations';
    const params: string[] = [];

    if (section_key) {
      query += ' WHERE section_key = ?';
      params.push(section_key);
    }

    query += ' ORDER BY section_key ASC';

    const stmt = env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<TextCustomization>();

    return NextResponse.json({
      customizations: result.results || [],
      success: true
    });
  } catch (error) {
    console.error('Error fetching text customizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch text customizations', success: false },
      { status: 500 }
    );
  }
}

// POST - Create or update text customization (upsert)
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const body = await request.json();
    const { section_key, text_de, text_en, font_size, font_color, font_family, font_weight } = body;

    if (!section_key) {
      return NextResponse.json(
        { error: 'section_key is required', success: false },
        { status: 400 }
      );
    }

    // Use INSERT OR REPLACE (SQLite upsert) for section_key
    await env.DB.prepare(`
      INSERT INTO text_customizations (section_key, text_de, text_en, font_size, font_color, font_family, font_weight, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(section_key) DO UPDATE SET
        text_de = excluded.text_de,
        text_en = excluded.text_en,
        font_size = excluded.font_size,
        font_color = excluded.font_color,
        font_family = excluded.font_family,
        font_weight = excluded.font_weight,
        updated_at = datetime('now')
    `).bind(section_key, text_de, text_en, font_size, font_color, font_family, font_weight).run();

    // Fetch the updated/created record
    const customization = await env.DB.prepare(
      'SELECT * FROM text_customizations WHERE section_key = ?'
    ).bind(section_key).first<TextCustomization>();

    return NextResponse.json({
      customization,
      success: true,
      message: 'Text customization saved successfully'
    });
  } catch (error) {
    console.error('Error saving text customization:', error);
    return NextResponse.json(
      { error: 'Failed to save text customization', success: false },
      { status: 500 }
    );
  }
}

// PUT - Update existing text customization
export async function PUT(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const body = await request.json();
    const { id, section_key, text_de, text_en, font_size, font_color, font_family, font_weight } = body;

    if (!id && !section_key) {
      return NextResponse.json(
        { error: 'id or section_key is required', success: false },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (text_de !== undefined) {
      updates.push('text_de = ?');
      params.push(text_de);
    }
    if (text_en !== undefined) {
      updates.push('text_en = ?');
      params.push(text_en);
    }
    if (font_size !== undefined) {
      updates.push('font_size = ?');
      params.push(font_size);
    }
    if (font_color !== undefined) {
      updates.push('font_color = ?');
      params.push(font_color);
    }
    if (font_family !== undefined) {
      updates.push('font_family = ?');
      params.push(font_family);
    }
    if (font_weight !== undefined) {
      updates.push('font_weight = ?');
      params.push(font_weight);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided', success: false },
        { status: 400 }
      );
    }

    updates.push('updated_at = datetime(\'now\')');

    const whereClause = id ? 'id = ?' : 'section_key = ?';
    params.push(id || section_key);

    await env.DB.prepare(
      `UPDATE text_customizations SET ${updates.join(', ')} WHERE ${whereClause}`
    ).bind(...params).run();

    return NextResponse.json({
      success: true,
      message: 'Text customization updated successfully'
    });
  } catch (error) {
    console.error('Error updating text customization:', error);
    return NextResponse.json(
      { error: 'Failed to update text customization', success: false },
      { status: 500 }
    );
  }
}

// DELETE - Delete text customization
export async function DELETE(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const section_key = searchParams.get('section_key');

    if (!id && !section_key) {
      return NextResponse.json(
        { error: 'id or section_key is required', success: false },
        { status: 400 }
      );
    }

    const whereClause = id ? 'id = ?' : 'section_key = ?';
    await env.DB.prepare(
      `DELETE FROM text_customizations WHERE ${whereClause}`
    ).bind(id || section_key).run();

    return NextResponse.json({
      success: true,
      message: 'Text customization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting text customization:', error);
    return NextResponse.json(
      { error: 'Failed to delete text customization', success: false },
      { status: 500 }
    );
  }
}
