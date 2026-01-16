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

interface SiteSetting {
  setting_key: string;
  setting_value: string;
}

// Default settings when database is not available
const defaultSettings: Record<string, string> = {
  primaryColor: '#1e5631',
  accentColor: '#8B7355',
  headingFont: 'RetroSignature',
  bodyFont: 'system-ui',
  headingSize: 'normal',
  bodySize: 'normal',
  sectionSpacing: 'normal',
};

// GET - Get all site settings (public endpoint)
export async function GET() {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ settings: defaultSettings, success: true });
    }

    const result = await env.DB.prepare(
      'SELECT setting_key, setting_value FROM site_settings'
    ).all<SiteSetting>();

    const settings: Record<string, string> = { ...defaultSettings };
    for (const row of result.results || []) {
      settings[row.setting_key] = row.setting_value;
    }

    return NextResponse.json({ settings, success: true });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json({ settings: defaultSettings, success: true });
  }
}

// POST - Update site settings (requires authentication)
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

    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string' && key in defaultSettings) {
        await env.DB.prepare(
          `INSERT INTO site_settings (setting_key, setting_value, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(setting_key) DO UPDATE SET
           setting_value = excluded.setting_value,
           updated_at = datetime('now')`
        ).bind(key, value).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
