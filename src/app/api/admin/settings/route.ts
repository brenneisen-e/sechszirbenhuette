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

interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// Default settings - all pricing values
const DEFAULT_SETTINGS: Record<string, string> = {
  // Pricing rates
  kurtaxe_rate: '4.00',           // € per day per adult (fallback)
  // Kurtaxe rates by date periods (JSON array)
  // Format: [{"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "rate": number}, ...]
  kurtaxe_rates: JSON.stringify([
    { from: '2024-01-01', to: '2024-12-31', rate: 2.70 },
    { from: '2025-01-01', to: '2025-12-31', rate: 4.00 },
    { from: '2026-01-01', to: '2099-12-31', rate: 4.00 }
  ]),
  holz_rate: '10.00',             // € per Bündel
  water_rate: '7.00',             // € per person per week
  trash_rate: '11.00',            // € per bag
  electricity_rate: '0.55',       // € per kWh
  commission_rate: '0.10',        // 10% provision
  reinigung_rate: '100.00',       // € per booking for cleaning
};

// Helper function to ensure settings table exists
async function ensureTableExists(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

// Helper function to ensure default settings exist
async function ensureDefaultSettings(db: D1Database) {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
    ).bind(key, value).run();
  }
}

// GET - Fetch all settings or a specific setting
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured.',
        settings: DEFAULT_SETTINGS
      }, { status: 500 });
    }

    await ensureTableExists(env.DB);
    await ensureDefaultSettings(env.DB);

    const key = searchParams.get('key');

    if (key) {
      const setting = await env.DB.prepare(
        'SELECT * FROM settings WHERE key = ?'
      ).bind(key).first<Setting>();

      if (setting) {
        return NextResponse.json({ key: setting.key, value: setting.value });
      } else {
        return NextResponse.json({ key, value: DEFAULT_SETTINGS[key] || null });
      }
    }

    // Fetch all settings
    const { results: settings } = await env.DB.prepare(
      'SELECT * FROM settings'
    ).all<Setting>();

    const settingsMap: Record<string, string> = {};
    for (const setting of settings || []) {
      settingsMap[setting.key] = setting.value;
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, settings: DEFAULT_SETTINGS }, { status: 500 });
  }
}

// POST - Update a setting
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    await ensureTableExists(env.DB);

    const body = await request.json() as { key: string; value: string };
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    // Upsert the setting
    await env.DB.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(key, value, value).run();

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error('POST /api/admin/settings error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
