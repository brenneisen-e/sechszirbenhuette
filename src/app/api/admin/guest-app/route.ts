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
    return (ctx.env as CloudflareEnv).DB;
  } catch {
    return null;
  }
}

// GET — list categories with their cards
export async function GET() {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const categories = await db.prepare(
      'SELECT * FROM guest_app_categories ORDER BY display_order ASC, id ASC'
    ).all<Record<string, unknown>>();

    const cards = await db.prepare(
      'SELECT * FROM guest_app_cards ORDER BY display_order ASC, id ASC'
    ).all<Record<string, unknown>>();

    // Group cards by category
    const cardsByCategory: Record<number, Record<string, unknown>[]> = {};
    for (const card of (cards.results || [])) {
      const catId = card.category_id as number;
      if (!cardsByCategory[catId]) cardsByCategory[catId] = [];
      cardsByCategory[catId].push(card);
    }

    const result = (categories.results || []).map(cat => ({
      ...cat,
      cards: cardsByCategory[cat.id as number] || [],
    }));

    return NextResponse.json({ categories: result });
  } catch (error) {
    console.error('Guest app GET error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// POST — create or update category/card
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const body = await request.json() as Record<string, unknown>;
    const { action } = body;
    const now = new Date().toISOString();

    if (action === 'create_category') {
      const { title, icon } = body as { title: string; icon?: string };
      const maxOrder = await db.prepare(
        'SELECT MAX(display_order) as max_order FROM guest_app_categories'
      ).first<{ max_order: number | null }>();
      const order = (maxOrder?.max_order ?? -1) + 1;
      await db.prepare(
        'INSERT INTO guest_app_categories (title, icon, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(title, icon || 'info', order, now, now).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'update_category') {
      const { id, title, icon, is_active, display_order } = body as {
        id: number; title?: string; icon?: string; is_active?: number; display_order?: number;
      };
      const updates: string[] = [];
      const values: unknown[] = [];
      if (title !== undefined) { updates.push('title = ?'); values.push(title); }
      if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
      if (display_order !== undefined) { updates.push('display_order = ?'); values.push(display_order); }
      updates.push('updated_at = ?'); values.push(now);
      values.push(id);
      await db.prepare(
        `UPDATE guest_app_categories SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...values).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_category') {
      const { id } = body as { id: number };
      await db.prepare('DELETE FROM guest_app_categories WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'create_card') {
      const { category_id, title, content, image_url, image_alt } = body as {
        category_id: number; title: string; content?: string; image_url?: string; image_alt?: string;
      };
      const maxOrder = await db.prepare(
        'SELECT MAX(display_order) as max_order FROM guest_app_cards WHERE category_id = ?'
      ).bind(category_id).first<{ max_order: number | null }>();
      const order = (maxOrder?.max_order ?? -1) + 1;
      await db.prepare(
        'INSERT INTO guest_app_cards (category_id, title, content, image_url, image_alt, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(category_id, title, content || '', image_url || null, image_alt || null, order, now, now).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'update_card') {
      const { id, title, content, image_url, image_alt, is_active, display_order, category_id } = body as {
        id: number; title?: string; content?: string; image_url?: string | null; image_alt?: string | null;
        is_active?: number; display_order?: number; category_id?: number;
      };
      const updates: string[] = [];
      const values: unknown[] = [];
      if (title !== undefined) { updates.push('title = ?'); values.push(title); }
      if (content !== undefined) { updates.push('content = ?'); values.push(content); }
      if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url); }
      if (image_alt !== undefined) { updates.push('image_alt = ?'); values.push(image_alt); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
      if (display_order !== undefined) { updates.push('display_order = ?'); values.push(display_order); }
      if (category_id !== undefined) { updates.push('category_id = ?'); values.push(category_id); }
      updates.push('updated_at = ?'); values.push(now);
      values.push(id);
      await db.prepare(
        `UPDATE guest_app_cards SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...values).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_card') {
      const { id } = body as { id: number };
      await db.prepare('DELETE FROM guest_app_cards WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder_categories') {
      const { order } = body as { order: number[] };
      for (let i = 0; i < order.length; i++) {
        await db.prepare(
          'UPDATE guest_app_categories SET display_order = ?, updated_at = ? WHERE id = ?'
        ).bind(i, now, order[i]).run();
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder_cards') {
      const { category_id, order } = body as { category_id: number; order: number[] };
      for (let i = 0; i < order.length; i++) {
        await db.prepare(
          'UPDATE guest_app_cards SET display_order = ?, updated_at = ? WHERE id = ? AND category_id = ?'
        ).bind(i, now, order[i], category_id).run();
      }
      return NextResponse.json({ success: true });
    }

    // === Access Token Management ===
    if (action === 'create_token') {
      const { booking_id, guest_name, valid_from, valid_until } = body as {
        booking_id: number; guest_name?: string; valid_from?: string; valid_until?: string;
      };
      // Generate a 6-char alphanumeric code
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 6).toUpperCase();
      await db.prepare(
        'INSERT INTO guest_access_tokens (booking_id, access_code, guest_name, valid_from, valid_until, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(booking_id, code, guest_name || null, valid_from || null, valid_until || null, now).run();
      return NextResponse.json({ success: true, access_code: code });
    }

    if (action === 'list_tokens') {
      const tokens = await db.prepare(`
        SELECT t.*, b.arrival_date, b.departure_date, g.guest_name as booking_guest_name
        FROM guest_access_tokens t
        LEFT JOIN bookings b ON t.booking_id = b.id
        LEFT JOIN guests g ON b.guest_id = g.id
        ORDER BY t.created_at DESC
      `).all<Record<string, unknown>>();
      return NextResponse.json({ tokens: tokens.results || [] });
    }

    if (action === 'delete_token') {
      const { id } = body as { id: number };
      await db.prepare('DELETE FROM guest_sessions WHERE token_id = ?').bind(id).run();
      await db.prepare('DELETE FROM guest_access_tokens WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_token') {
      const { id, is_active } = body as { id: number; is_active: number };
      await db.prepare(
        'UPDATE guest_access_tokens SET is_active = ? WHERE id = ?'
      ).bind(is_active, id).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Guest app POST error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
