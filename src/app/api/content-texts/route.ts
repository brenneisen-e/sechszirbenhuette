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

interface ContentText {
  id: number;
  text_key: string;
  content: string;
  font_family: string | null;
  font_size: string | null;
  color: string | null;
  padding: string | null;
  section: string;
  text_type: string;
  updated_at: string;
}

// Default texts for the website
const defaultTexts: Record<string, { content: string; section: string; text_type: string }> = {
  // Hero Section
  hero_title: { content: 'Herzlich Willkommen in der Sechszirbenhütte', section: 'hero', text_type: 'heading' },
  hero_subtitle: { content: 'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen', section: 'hero', text_type: 'heading' },
  hero_description: { content: 'Erleben Sie unvergessliche Urlaubstage in unserer über 250 Jahre alten Berghütte – liebevoll restauriert, mit Sauna-Anbau und in absoluter Alleinlage inmitten von Zirben- und Lärchenwäldern am Falkert.', section: 'hero', text_type: 'body' },

  // IntroText Section
  introtext_main_heading: { content: 'Uriges Ferienhaus am Falkert - mit Sauna und Ruheraum', section: 'introtext', text_type: 'heading' },
  introtext_heading_1: { content: 'Wandern, Skifahren & Erholung in den Nockbergen, Kärnten', section: 'introtext', text_type: 'heading' },
  introtext_text_1: { content: 'Entdecken Sie die Sechszirbenhütte, Ihre traumhafte Unterkunft auf 1.700 m Höhe im Herzen der Nockberge in Kärnten, Österreich. Gelegen an der malerischen Alpensüdseite in Falkertsee, bietet unsere Hütte ein ganzjähriges Urlaubsparadies für Familien und Naturliebhaber', section: 'introtext', text_type: 'body' },
  introtext_heading_2: { content: 'Heidi Alm Bergresort: Dem Himmel nahe, dem Alltag fern', section: 'introtext', text_type: 'heading' },
  introtext_text_2: { content: 'Erleben Sie einen unvergesslichen Urlaub im Heidi Alm Bergresort, umgeben von gesunder Luft, kristallklarem Gebirgswasser und einer farbenfrohen Natur. Genießen Sie die alpine Flora wie Enzian, Almrausch und Edelweiß und beobachten Sie mit etwas Glück Murmeltiere in ihrer natürlichen Umgebung.', section: 'introtext', text_type: 'body' },
  introtext_heading_3: { content: 'Winterurlaub in der Heidi-Alm: Familiäres Skigebiet & vielfältige Aktivitäten', section: 'introtext', text_type: 'heading' },
  introtext_text_3: { content: 'Das familiäre Skigebiet der Heidi-Alm bietet drei Lifte, einen Zauberteppich und abwechslungsreiche Pisten für Anfänger bis Fortgeschrittene. Freuen Sie sich auf entspanntes Skifahren ohne Warteschlangen an den Liften, Langlaufen, Eislaufen auf dem See oder geführte Schneeschuhwanderungen. In Peters Skischule werden Kinder und Erwachsene geduldig und spielerisch im Skifahren und Snowboarden unterrichtet. Zudem runden Ski-Touren und Fackelwanderungen das Winterprogramm ab. Erleben Sie die Sechszirbenhütte: Wandern, Skifahren & Erholung in Kärntens Nockbergen. Buchen Sie jetzt Ihren unvergesslichen Urlaub inmitten der atemberaubenden Naturkulisse.', section: 'introtext', text_type: 'body' },

  // Ferienhaus Section
  ferienhaus_title: { content: 'Ausstattung & Komfort', section: 'ferienhaus', text_type: 'heading' },
  ferienhaus_subtitle: { content: 'Unsere Hütte bietet alles, was Sie für einen unvergesslichen Urlaub in den Bergen benötigen.', section: 'ferienhaus', text_type: 'body' },

  // Umgebung Section
  umgebung_title: { content: 'Umgebung & Aktivitäten', section: 'umgebung', text_type: 'heading' },
  umgebung_subtitle: { content: 'Erleben Sie die Vielfalt der Nockberge', section: 'umgebung', text_type: 'body' },

  // Buchung Section
  buchung_title: { content: 'Buchung & Preise', section: 'buchung', text_type: 'heading' },
  buchung_subtitle: { content: 'Buchen Sie Ihren Traumurlaub in der Sechszirbenhütte', section: 'buchung', text_type: 'body' },

  // Bewertungen Section
  bewertungen_title: { content: 'Das sagen unsere Gäste', section: 'bewertungen', text_type: 'heading' },
  bewertungen_subtitle: { content: 'Erfahrungen und Bewertungen von Urlaubern', section: 'bewertungen', text_type: 'body' },
};

// GET - Get all content texts (public endpoint)
export async function GET() {
  try {
    const env = await getCloudflareEnv();

    // Start with default texts
    const texts: Record<string, ContentText> = {};
    for (const [key, value] of Object.entries(defaultTexts)) {
      texts[key] = {
        id: 0,
        text_key: key,
        content: value.content,
        font_family: null,
        font_size: null,
        color: null,
        padding: null,
        section: value.section,
        text_type: value.text_type,
        updated_at: '',
      };
    }

    if (env) {
      // Override with database values
      const result = await env.DB.prepare(
        'SELECT * FROM content_texts'
      ).all<ContentText>();

      for (const row of result.results || []) {
        texts[row.text_key] = row;
      }
    }

    // Group by section for easier admin UI
    const bySection: Record<string, ContentText[]> = {};
    for (const text of Object.values(texts)) {
      if (!bySection[text.section]) {
        bySection[text.section] = [];
      }
      bySection[text.section].push(text);
    }

    return NextResponse.json({
      texts,
      bySection,
      success: true
    });
  } catch (error) {
    console.error('Error fetching content texts:', error);
    // Return defaults on error
    const texts: Record<string, ContentText> = {};
    for (const [key, value] of Object.entries(defaultTexts)) {
      texts[key] = {
        id: 0,
        text_key: key,
        content: value.content,
        font_family: null,
        font_size: null,
        color: null,
        padding: null,
        section: value.section,
        text_type: value.text_type,
        updated_at: '',
      };
    }

    // Group by section even on error
    const bySection: Record<string, ContentText[]> = {};
    for (const text of Object.values(texts)) {
      if (!bySection[text.section]) {
        bySection[text.section] = [];
      }
      bySection[text.section].push(text);
    }

    return NextResponse.json({ texts, bySection, success: true });
  }
}

// POST - Update content text (requires authentication)
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
    const { text_key, content, font_family, font_size, color, padding, section, text_type } = body;

    if (!text_key || !content) {
      return NextResponse.json(
        { error: 'text_key and content are required' },
        { status: 400 }
      );
    }

    // Use INSERT OR REPLACE to handle both new and existing entries
    await env.DB.prepare(`
      INSERT INTO content_texts (text_key, content, font_family, font_size, color, padding, section, text_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(text_key) DO UPDATE SET
        content = excluded.content,
        font_family = excluded.font_family,
        font_size = excluded.font_size,
        color = excluded.color,
        padding = excluded.padding,
        section = excluded.section,
        text_type = excluded.text_type,
        updated_at = datetime('now')
    `).bind(
      text_key,
      content,
      font_family || null,
      font_size || null,
      color || null,
      padding || null,
      section || defaultTexts[text_key]?.section || 'other',
      text_type || defaultTexts[text_key]?.text_type || 'body'
    ).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating content text:', error);
    return NextResponse.json(
      { error: 'Failed to update text' },
      { status: 500 }
    );
  }
}
