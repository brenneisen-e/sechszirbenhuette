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

interface PositionTemplate {
  id: number;
  name: string;
  category: string;
  type: string;
  default_amount: number;
  default_paid_by: string;
  affects_mieterlos: number;
  affects_gewinn: number;
  show_separate: number;
  auto_calculate: number;
  calc_rule: string | null;
  applies_to_platforms: string | null;
  is_default: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Check if table exists
async function tableExists(db: D1Database): Promise<boolean> {
  const result = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='position_templates'"
  ).first();
  return !!result;
}

// GET - Fetch all templates
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
      return NextResponse.json({ templates: [], tableExists: false });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM position_templates ORDER BY sort_order ASC, id ASC'
    ).all<PositionTemplate>();

    return NextResponse.json({ templates: results || [], tableExists: true });
  } catch (error) {
    console.error('GET /api/admin/position-templates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new template
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

    const body = await request.json() as Partial<PositionTemplate>;

    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, applies_to_platforms, is_default, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.name,
      body.category || 'custom',
      body.type,
      body.default_amount || 0,
      body.default_paid_by || 'guest_platform',
      body.affects_mieterlos || 0,
      body.affects_gewinn ?? 1,
      body.show_separate || 0,
      body.auto_calculate || 0,
      body.calc_rule || null,
      body.applies_to_platforms || null,
      body.is_default || 0,
      body.sort_order || 0
    ).run();

    return NextResponse.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('POST /api/admin/position-templates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a template
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

    const body = await request.json() as Partial<PositionTemplate> & { id: number };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await env.DB.prepare(
      `UPDATE position_templates SET
       name = ?, category = ?, type = ?, default_amount = ?, default_paid_by = ?,
       affects_mieterlos = ?, affects_gewinn = ?, show_separate = ?, auto_calculate = ?,
       calc_rule = ?, applies_to_platforms = ?, is_default = ?, sort_order = ?,
       updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.name,
      body.category || 'custom',
      body.type,
      body.default_amount || 0,
      body.default_paid_by || 'guest_platform',
      body.affects_mieterlos || 0,
      body.affects_gewinn ?? 1,
      body.show_separate || 0,
      body.auto_calculate || 0,
      body.calc_rule || null,
      body.applies_to_platforms || null,
      body.is_default || 0,
      body.sort_order || 0,
      body.id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/position-templates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a template
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

    await env.DB.prepare('DELETE FROM position_templates WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/position-templates error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
