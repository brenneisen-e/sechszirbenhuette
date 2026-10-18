// Bildgrößen in Cloudflare Images einrichten (siehe src/lib/imageVariants.ts).
// Läuft beim Laden des Admin Centers über /api/admin/auto-migrate, bis alle
// Varianten da sind; danach steht site_settings.imageVariants = '1' und die
// Website nutzt srcset. Braucht denselben Cloudflare-Zugang wie der Upload.

import { getCredentialsWithDb } from '@/lib/cloudflareMedia';
import { IMAGE_VARIANTS } from '@/lib/imageVariants';

const CF_API = 'https://api.cloudflare.com/client/v4/accounts';
export const IMAGE_VARIANTS_FLAG = 'imageVariants';

interface Env {
  DB: D1Database;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

async function setFlag(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS site_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO site_settings (setting_key, setting_value, updated_at)
       VALUES (?, '1', datetime('now'))
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1', updated_at = datetime('now')`,
    )
    .bind(IMAGE_VARIANTS_FLAG)
    .run();
}

async function flagIsSet(db: D1Database): Promise<boolean> {
  try {
    const row = await db
      .prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?')
      .bind(IMAGE_VARIANTS_FLAG)
      .first<{ setting_value: string }>();
    return row?.setting_value === '1';
  } catch {
    return false;
  }
}

export async function ensureImageVariants(
  env: Env,
): Promise<{ ready: boolean; created: string[]; error?: string }> {
  if (await flagIsSet(env.DB)) return { ready: true, created: [] };
  const creds = await getCredentialsWithDb(env);
  if (!creds) return { ready: false, created: [], error: 'Cloudflare-Zugang fehlt' };
  const headers = {
    Authorization: `Bearer ${creds.apiToken}`,
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(`${CF_API}/${creds.accountId}/images/v1/variants`, { headers });
  const list = (await listRes.json().catch(() => ({}))) as {
    success?: boolean;
    result?: { variants?: Record<string, unknown> };
    errors?: { message?: string }[];
  };
  if (!listRes.ok || !list.success) {
    return {
      ready: false,
      created: [],
      error: `Varianten lesen: ${list.errors?.[0]?.message ?? listRes.status}`,
    };
  }
  const existing = new Set(Object.keys(list.result?.variants ?? {}));

  const created: string[] = [];
  for (const v of IMAGE_VARIANTS) {
    if (existing.has(v.name)) continue;
    const res = await fetch(`${CF_API}/${creds.accountId}/images/v1/variants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: v.name,
        options: { fit: 'scale-down', width: v.width, height: v.width, metadata: 'none' },
        neverRequireSignedURLs: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      errors?: { message?: string }[];
    };
    if (!res.ok || !data.success) {
      return {
        ready: false,
        created,
        error: `Variante ${v.name}: ${data.errors?.[0]?.message ?? res.status}`,
      };
    }
    created.push(v.name);
  }
  await setFlag(env.DB);
  return { ready: true, created };
}
