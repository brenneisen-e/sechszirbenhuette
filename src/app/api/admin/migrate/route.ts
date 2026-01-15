import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cloudflare types
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

// Get Cloudflare environment
async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

// POST - Run migration for text_customizations table
export async function POST() {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    // Create text_customizations table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS text_customizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_key TEXT NOT NULL UNIQUE,
        text_de TEXT,
        text_en TEXT,
        font_size TEXT,
        font_color TEXT,
        font_family TEXT,
        font_weight TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create index
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_text_customizations_section ON text_customizations(section_key)
    `).run();

    // Insert example data (optional)
    await env.DB.prepare(`
      INSERT OR IGNORE INTO text_customizations (section_key, text_de, text_en, font_size, font_color, font_family, font_weight) VALUES
      ('hero.title', 'Herzlich Willkommen in der Sechszirbenhütte', 'Welcome to Sechszirbenhütte', '3rem', '#ffffff', 'RetroSignature, cursive', '400'),
      ('hero.subtitle', 'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen', 'Premium mountain vacation at 1,700m in the Carinthian Nockberge', '1.5rem', '#ffffff', 'RetroSignature, cursive', '400'),
      ('hero.description', 'Erleben Sie unvergessliche Urlaubstage in unserer über 250 Jahre alten Berghütte – liebevoll restauriert, mit Sauna-Anbau und in absoluter Alleinlage inmitten von Zirben- und Lärchenwäldern am Falkert.', 'Experience unforgettable vacation days in our over 250-year-old mountain hut – lovingly restored, with sauna annex and in absolute seclusion amidst stone pine and larch forests at Falkert.', '1rem', '#ffffff', 'Inter', '400')
    `).run();

    // Verify table exists
    const result = await env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='text_customizations'
    `).first<{ name: string }>();

    if (!result) {
      return NextResponse.json({
        error: 'Migration failed - table not created',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Migration erfolgreich ausgeführt! Die Tabelle text_customizations wurde erstellt.'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unknown error'),
        success: false
      },
      { status: 500 }
    );
  }
}
