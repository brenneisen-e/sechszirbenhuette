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

async function getGuestSession(request: NextRequest, db: D1Database): Promise<Record<string, unknown> | null> {
  const sessionId = request.cookies.get('guest_session')?.value;
  if (!sessionId) return null;

  const session = await db.prepare(`
    SELECT gs.*, gat.booking_id, gat.guest_name, gat.access_code,
           b.arrival_date, b.departure_date, b.adults, b.children, b.pets,
           g.guest_name as full_guest_name, g.email
    FROM guest_sessions gs
    JOIN guest_access_tokens gat ON gs.token_id = gat.id
    LEFT JOIN bookings b ON gat.booking_id = b.id
    LEFT JOIN guests g ON b.guest_id = g.id
    WHERE gs.session_id = ? AND gs.expires_at > datetime('now') AND gat.is_active = 1
  `).bind(sessionId).first<Record<string, unknown>>();

  return session;
}

// POST — login with access code
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const body = await request.json() as { action?: string; access_code?: string };

    if (body.action === 'logout') {
      const sessionId = request.cookies.get('guest_session')?.value;
      if (sessionId) {
        await db.prepare('DELETE FROM guest_sessions WHERE session_id = ?').bind(sessionId).run();
      }
      const response = NextResponse.json({ success: true });
      response.cookies.delete('guest_session');
      return response;
    }

    // Login
    const code = (body.access_code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Zugangscode erforderlich' }, { status: 400 });
    }

    const token = await db.prepare(
      'SELECT * FROM guest_access_tokens WHERE access_code = ? AND is_active = 1'
    ).bind(code).first<Record<string, unknown>>();

    if (!token) {
      return NextResponse.json({ error: 'Ungültiger Zugangscode' }, { status: 401 });
    }

    // Check validity period
    const now = new Date().toISOString();
    if (token.valid_from && now < (token.valid_from as string)) {
      return NextResponse.json({ error: 'Zugang noch nicht aktiv' }, { status: 401 });
    }
    if (token.valid_until && now > (token.valid_until as string)) {
      return NextResponse.json({ error: 'Zugang abgelaufen' }, { status: 401 });
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.prepare(
      'INSERT INTO guest_sessions (session_id, token_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, token.id, expiresAt.toISOString()).run();

    // Update last login
    await db.prepare(
      'UPDATE guest_access_tokens SET last_login = ? WHERE id = ?'
    ).bind(now, token.id).run();

    const response = NextResponse.json({ success: true, guest_name: token.guest_name });
    response.cookies.set('guest_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Guest login error:', error);
    return NextResponse.json({ error: 'Login fehlgeschlagen' }, { status: 500 });
  }
}

// GET — get guest data (session check + content)
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    const session = await getGuestSession(request, db);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Load categories and cards (only active ones)
    const categories = await db.prepare(
      'SELECT * FROM guest_app_categories WHERE is_active = 1 ORDER BY display_order ASC, id ASC'
    ).all<Record<string, unknown>>();

    const cards = await db.prepare(
      'SELECT * FROM guest_app_cards WHERE is_active = 1 ORDER BY display_order ASC, id ASC'
    ).all<Record<string, unknown>>();

    const cardsByCategory: Record<number, Record<string, unknown>[]> = {};
    for (const card of (cards.results || [])) {
      const catId = card.category_id as number;
      if (!cardsByCategory[catId]) cardsByCategory[catId] = [];
      cardsByCategory[catId].push(card);
    }

    const content = (categories.results || []).map(cat => ({
      ...cat,
      cards: cardsByCategory[cat.id as number] || [],
    }));

    return NextResponse.json({
      authenticated: true,
      guest: {
        name: session.guest_name || session.full_guest_name,
        arrival_date: session.arrival_date,
        departure_date: session.departure_date,
        adults: session.adults,
        children: session.children,
        pets: session.pets,
      },
      content,
    });
  } catch (error) {
    console.error('Guest GET error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
