import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

// Auth handled by Cloudflare Zero Trust
async function isAuthenticated(_request: NextRequest, _env: Env): Promise<boolean> {
  return true;
}

interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// Korrekte Kurtaxe-Staffelung:
// 2,70 € bis 31.10.2026, ab 01.11.2026 dann 4,50 € pro Person/Nacht
const CORRECT_KURTAXE_RATES = [
  { from: '2024-01-01', to: '2024-12-31', rate: 2.70 },
  { from: '2025-01-01', to: '2025-12-31', rate: 2.70 },
  { from: '2026-01-01', to: '2026-10-31', rate: 2.70 },
  { from: '2026-11-01', to: '2099-12-31', rate: 4.50 },
];

// Default settings - all pricing values
const DEFAULT_SETTINGS: Record<string, string> = {
  // Pricing rates
  kurtaxe_rate: '2.70',           // € per day per adult (current fallback rate)
  // Kurtaxe rates by date periods (JSON array)
  // Format: [{"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "rate": number}, ...]
  kurtaxe_rates: JSON.stringify(CORRECT_KURTAXE_RATES),
  holz_rate: '9.00',              // € per Sack (Pellets)
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

  // Fix: Migrate any wrong kurtaxe_rates that contain 4.00 EUR entries
  try {
    const existing = await db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).bind('kurtaxe_rates').first<{ value: string }>();
    if (existing?.value) {
      const parsed = JSON.parse(existing.value);
      if (Array.isArray(parsed)) {
        const hasWrongRate = parsed.some(
          (r: { rate: number }) => r.rate === 4.00
        );
        if (hasWrongRate) {
          await db.prepare(
            'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
          ).bind(JSON.stringify(CORRECT_KURTAXE_RATES), 'kurtaxe_rates').run();
          await db.prepare(
            'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
          ).bind('2.70', 'kurtaxe_rate').run();
        }
      }
    }
  } catch { /* ignore migration errors */ }
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
    const action = searchParams.get('action');

    // Test Cloudflare API connection
    if (action === 'test-cloudflare') {
      try {
        // Read token from DB
        const tokenSetting = await env.DB.prepare(
          "SELECT value FROM settings WHERE key = 'cloudflare_api_token'"
        ).first<{ value: string }>();

        const token = env.CLOUDFLARE_API_TOKEN || tokenSetting?.value;
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;

        if (!token || !accountId) {
          return NextResponse.json({ success: false, error: 'API Token oder Account ID fehlt' });
        }

        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json() as { result?: { count?: { current?: number } } };
          const imageCount = data.result?.count?.current || 0;
          return NextResponse.json({
            success: true,
            message: `Verbindung OK! ${imageCount} Bilder gespeichert.`,
          });
        } else {
          return NextResponse.json({ success: false, error: `API Fehler: ${res.status} ${res.statusText}` });
        }
      } catch (err) {
        return NextResponse.json({ success: false, error: `Verbindungsfehler: ${err instanceof Error ? err.message : 'Unbekannt'}` });
      }
    }

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
