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

    // Migration 6: Insert default content texts
    const defaultTexts = [
      // Hero Section
      { key: 'hero_title', content: 'Herzlich Willkommen in der Sechszirbenhütte', section: 'hero', type: 'heading' },
      { key: 'hero_subtitle', content: 'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen', section: 'hero', type: 'heading' },
      { key: 'hero_description', content: 'Erleben Sie unvergessliche Urlaubstage in unserer über 250 Jahre alten Berghütte – liebevoll restauriert, mit Sauna-Anbau und in absoluter Alleinlage inmitten von Zirben- und Lärchenwäldern am Falkert.', section: 'hero', type: 'body' },
      // IntroText Section
      { key: 'introtext_main_heading', content: 'Uriges Ferienhaus am Falkert - mit Sauna und Ruheraum', section: 'introtext', type: 'heading' },
      { key: 'introtext_heading_1', content: 'Wandern, Skifahren & Erholung in den Nockbergen, Kärnten', section: 'introtext', type: 'heading' },
      { key: 'introtext_text_1', content: 'Entdecken Sie die Sechszirbenhütte, Ihre traumhafte Unterkunft auf 1.700 m Höhe im Herzen der Nockberge in Kärnten, Österreich. Gelegen an der malerischen Alpensüdseite in Falkertsee, bietet unsere Hütte ein ganzjähriges Urlaubsparadies für Familien und Naturliebhaber', section: 'introtext', type: 'body' },
      { key: 'introtext_heading_2', content: 'Heidi Alm Bergresort: Dem Himmel nahe, dem Alltag fern', section: 'introtext', type: 'heading' },
      { key: 'introtext_text_2', content: 'Erleben Sie einen unvergesslichen Urlaub im Heidi Alm Bergresort, umgeben von gesunder Luft, kristallklarem Gebirgswasser und einer farbenfrohen Natur. Genießen Sie die alpine Flora wie Enzian, Almrausch und Edelweiß und beobachten Sie mit etwas Glück Murmeltiere in ihrer natürlichen Umgebung.', section: 'introtext', type: 'body' },
      { key: 'introtext_heading_3', content: 'Winterurlaub in der Heidi-Alm: Familiäres Skigebiet & vielfältige Aktivitäten', section: 'introtext', type: 'heading' },
      { key: 'introtext_text_3', content: 'Das familiäre Skigebiet der Heidi-Alm bietet drei Lifte, einen Zauberteppich und abwechslungsreiche Pisten für Anfänger bis Fortgeschrittene.', section: 'introtext', type: 'body' },
      // Ferienhaus Section
      { key: 'ferienhaus_title', content: 'Ausstattung & Komfort', section: 'ferienhaus', type: 'heading' },
      { key: 'ferienhaus_subtitle', content: 'Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.', section: 'ferienhaus', type: 'body' },
      // Umgebung Section
      { key: 'umgebung_title', content: 'Umgebung & Aktivitäten', section: 'umgebung', type: 'heading' },
      { key: 'umgebung_subtitle', content: 'Erleben Sie die Vielfalt der Nockberge', section: 'umgebung', type: 'body' },
      // Buchung Section
      { key: 'buchung_title', content: 'Buchung & Preise', section: 'buchung', type: 'heading' },
      { key: 'buchung_subtitle', content: 'Buchen Sie Ihren Traumurlaub in der Sechszirbenhütte', section: 'buchung', type: 'body' },
      // Bewertungen Section
      { key: 'bewertungen_title', content: 'Das sagen unsere Gäste', section: 'bewertungen', type: 'heading' },
      { key: 'bewertungen_subtitle', content: 'Erfahrungen und Bewertungen von Urlaubern', section: 'bewertungen', type: 'body' },
    ];

    let textsInserted = 0;
    for (const text of defaultTexts) {
      try {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO content_texts (text_key, content, section, text_type)
          VALUES (?, ?, ?, ?)
        `).bind(text.key, text.content, text.section, text.type).run();
        textsInserted++;
      } catch (err) {
        console.error(`Migration insert text ${text.key} error:`, err);
      }
    }
    migrations.push(`${textsInserted} default texts inserted/verified`);

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
