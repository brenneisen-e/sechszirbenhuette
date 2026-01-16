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
  exec(query: string): Promise<unknown>;
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

// POST - Run database migrations
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Check for admin session
    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await env.DB.prepare(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > datetime("now")'
    ).bind(sessionId).first();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run migrations
    const migrations: string[] = [];

    // Migration 1: Site settings table
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT NOT NULL UNIQUE,
          setting_value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      migrations.push('site_settings table created/verified');
    } catch (err) {
      console.error('Migration site_settings error:', err);
    }

    // Migration 2: Insert default settings if not exist
    const defaultSettings = [
      ['primaryColor', '#1e5631'],
      ['accentColor', '#8B7355'],
      ['headingFont', 'FeelingPassionate'],
      ['bodyFont', 'system-ui'],
      ['headingSize', '64'],
      ['bodySize', '16'],
      ['sectionSpacing', 'normal'],
    ];

    for (const [key, value] of defaultSettings) {
      try {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
          VALUES (?, ?)
        `).bind(key, value).run();
      } catch (err) {
        console.error(`Migration insert ${key} error:`, err);
      }
    }
    migrations.push('Default settings inserted');

    // Migration 3: Index for site_settings
    try {
      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key)
      `).run();
      migrations.push('site_settings index created');
    } catch (err) {
      console.error('Migration index error:', err);
    }

    // Migration 4: Content texts table
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS content_texts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text_key TEXT NOT NULL UNIQUE,
          content TEXT NOT NULL,
          font_family TEXT,
          font_size TEXT,
          color TEXT,
          section TEXT NOT NULL,
          text_type TEXT DEFAULT 'body',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      migrations.push('content_texts table created/verified');
    } catch (err) {
      console.error('Migration content_texts error:', err);
    }

    // Migration 5: Indexes for content_texts
    try {
      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_content_texts_key ON content_texts(text_key)
      `).run();
      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_content_texts_section ON content_texts(section)
      `).run();
      migrations.push('content_texts indexes created');
    } catch (err) {
      console.error('Migration content_texts index error:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Migration erfolgreich: ${migrations.length} Schritte ausgeführt`,
      migrations,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration fehlgeschlagen' },
      { status: 500 }
    );
  }
}
