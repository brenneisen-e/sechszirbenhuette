import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface PositionCategoryRecord {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

async function tableExists(db: D1Database): Promise<boolean> {
  const result = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='position_categories'"
  ).first();
  return !!result;
}

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const exists = await tableExists(env.DB);
    if (!exists) {
      return NextResponse.json({ categories: [], tableExists: false });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM position_categories ORDER BY sort_order ASC, id ASC'
    ).all<PositionCategoryRecord>();

    return NextResponse.json({ categories: results || [], tableExists: true });
  } catch (error) {
    console.error('GET /api/admin/position-categories error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword || adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as Partial<PositionCategoryRecord>;

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name.toLowerCase()
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await env.DB.prepare(
      `INSERT INTO position_categories (name, slug, icon, color, sort_order)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      body.name,
      slug,
      body.icon || null,
      body.color || null,
      body.sort_order || 0
    ).run();

    return NextResponse.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('POST /api/admin/position-categories error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a category
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword || adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const body = await request.json() as Partial<PositionCategoryRecord> & { id: number };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await env.DB.prepare(
      `UPDATE position_categories SET name = ?, icon = ?, color = ?, sort_order = ?
       WHERE id = ?`
    ).bind(
      body.name,
      body.icon || null,
      body.color || null,
      body.sort_order || 0,
      body.id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/position-categories error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword || adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM position_categories WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/position-categories error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
