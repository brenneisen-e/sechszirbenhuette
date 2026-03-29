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

async function ensureGuestTables(db: D1Database): Promise<void> {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS guest_access_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL,
      access_code TEXT NOT NULL UNIQUE, guest_name TEXT, valid_from TEXT,
      valid_until TEXT, is_active INTEGER DEFAULT 1, last_login TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS guest_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL UNIQUE,
      token_id INTEGER NOT NULL, expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (token_id) REFERENCES guest_access_tokens(id) ON DELETE CASCADE
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS guest_app_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      icon TEXT DEFAULT 'info', group_name TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    try { await db.prepare('ALTER TABLE guest_app_categories ADD COLUMN group_name TEXT DEFAULT ""').run(); } catch { /* exists */ }
    await db.prepare(`CREATE TABLE IF NOT EXISTS guest_app_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL,
      title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', image_url TEXT,
      image_alt TEXT, display_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES guest_app_categories(id) ON DELETE CASCADE
    )`).run();
  } catch { /* tables may already exist */ }
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
    await ensureGuestTables(db);

    const body = await request.json() as { action?: string; access_code?: string };

    if (body.action === 'logout') {
      const sessionId = request.cookies.get('guest_session')?.value;
      if (sessionId) {
        await db.prepare('DELETE FROM guest_sessions WHERE session_id = ?').bind(sessionId).run();
      }
      const response = NextResponse.json({ success: true });
      response.cookies.delete('guest_session');
      response.cookies.delete('guest_demo');
      return response;
    }

    if (body.action === 'demo') {
      const response = NextResponse.json({ success: true });
      response.cookies.set('guest_demo', '1', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
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
    await ensureGuestTables(db);

    const isDemo = request.cookies.get('guest_demo')?.value === '1';
    const session = await getGuestSession(request, db);
    if (!session && !isDemo) {
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

    const guestInfo = isDemo ? {
      name: 'Demo Gast',
      arrival_date: new Date().toISOString().split('T')[0],
      departure_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      adults: 2,
      children: 2,
      pets: '1 Hund',
    } : {
      name: session!.guest_name || session!.full_guest_name,
      arrival_date: session!.arrival_date,
      departure_date: session!.departure_date,
      adults: session!.adults,
      children: session!.children,
      pets: session!.pets,
    };

    return NextResponse.json({
      authenticated: true,
      demo: isDemo,
      guest: guestInfo,
      content,
    });
  } catch (error) {
    console.error('Guest GET error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
