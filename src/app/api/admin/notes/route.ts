import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

interface GuestNote {
  id: number;
  guest_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

function getAdminPassword(env: Env): string {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD || '';
}

// GET - List notes for a guest
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id');

    if (!guestId) {
      return NextResponse.json({ error: 'guest_id ist erforderlich' }, { status: 400 });
    }

    const result = await db.prepare(`
      SELECT * FROM guest_notes
      WHERE guest_id = ?
      ORDER BY created_at DESC
    `).bind(guestId).all<GuestNote>();

    return NextResponse.json({ notes: result.results || [] });
  } catch (error) {
    console.error('Error fetching notes:', error);
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Notizen';
    // If table doesn't exist, return empty array
    if (message.includes('no such table')) {
      return NextResponse.json({ notes: [], tableNotFound: true });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await request.json() as { guest_id: number; content: string };

    if (!data.guest_id || !data.content) {
      return NextResponse.json({ error: 'guest_id und content sind erforderlich' }, { status: 400 });
    }

    const result = await db.prepare(`
      INSERT INTO guest_notes (guest_id, content)
      VALUES (?, ?)
    `).bind(data.guest_id, data.content).run();

    // Fetch the created note
    const note = await db.prepare(
      'SELECT * FROM guest_notes WHERE id = ?'
    ).bind(result.meta.last_row_id).first<GuestNote>();

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Notiz' }, { status: 500 });
  }
}

// PUT - Update a note
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const data = await request.json() as { id: number; content: string };

    if (!data.id || !data.content) {
      return NextResponse.json({ error: 'id und content sind erforderlich' }, { status: 400 });
    }

    await db.prepare(`
      UPDATE guest_notes
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(data.content, data.id).run();

    // Fetch updated note
    const note = await db.prepare(
      'SELECT * FROM guest_notes WHERE id = ?'
    ).bind(data.id).first<GuestNote>();

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Notiz' }, { status: 500 });
  }
}

// DELETE - Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notiz-ID ist erforderlich' }, { status: 400 });
    }

    await db.prepare('DELETE FROM guest_notes WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Notiz' }, { status: 500 });
  }
}
