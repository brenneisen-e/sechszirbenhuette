import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import Anthropic from '@anthropic-ai/sdk';

interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): { all<T>(): Promise<{ results?: T[] }>; run(): Promise<unknown> };
    all<T>(): Promise<{ results?: T[] }>;
  };
}

interface CloudflareEnv {
  DB: D1Database;
  ANTHROPIC_API_KEY?: string;
}

interface MediaRecord {
  id: string;
  url: string;
  alt_text: string;
  title: string;
  category: string;
  media_type: string;
}

// Valid main categories the AI can assign
const VALID_CATEGORIES = [
  'wohnen',     // Wohnzimmer, Stube, Essbereich
  'schlafen',   // Schlafzimmer, Betten
  'kueche',     // Küche, Küchengeräte
  'bad',        // Bad, Sauna, Wellness, Dusche, WC, Ruheraum
  'aussen',     // Außenansicht der Hütte, Balkon, Terrasse
  'umgebung',   // Berge, Natur, See, Landschaft, Wanderwege
  'extras',     // Aktivitäten, Skifahren, Tiere, Sonstiges
  'gastgeber',  // Personen, Gastgeber-Portraits
];

// Meta-flags auto-applied
const INNEN_CATEGORIES = ['wohnen', 'schlafen', 'kueche', 'bad'];
const AUSSEN_CATEGORIES = ['aussen', 'umgebung'];

const SYSTEM_PROMPT = `Du bist ein Bildkategorisierungs-Assistent für eine Ferienhütten-Website (Sechszirbenhütte am Falkert, Kärnten).

Analysiere das Bild und gib GENAU eine Hauptkategorie zurück. Die möglichen Kategorien sind:

- wohnen: Wohnzimmer, Stube, Essbereich, Kamin/Ofen, Treppenhaus, Galerie
- schlafen: Schlafzimmer, Betten, Bettwäsche
- kueche: Küche, Küchenzeile, Küchengeräte, Kaffeemaschine
- bad: Badezimmer, Dusche, WC, Sauna, Ruheraum, Wellness
- aussen: Außenansicht der Hütte, Balkon, Terrasse, Gebäude von außen
- umgebung: Berge, Natur, See, Landschaft, Wanderwege, Tiere in der Natur
- extras: Aktivitäten (Skifahren, Radfahren, Rodeln), Spielplatz, Sonstiges
- gastgeber: Personen, Portraits der Gastgeber

Gib auch einen kurzen deutschen Alt-Text (max 80 Zeichen) für SEO.

Antworte AUSSCHLIESSLICH im JSON-Format:
{"category": "kategorie_id", "alt_text": "Beschreibung des Bildes"}`;

// POST: Categorize a single image or batch
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as CloudflareEnv;

    if (!env?.DB) {
      return NextResponse.json({ error: 'DB not available' }, { status: 503 });
    }

    const body = await request.json() as {
      media_ids?: string[];
      api_key?: string;
    };

    // Get API key: from request body, env var, or admin settings
    let apiKey = body.api_key || env.ANTHROPIC_API_KEY || '';

    if (!apiKey) {
      // Try settings table (used by /api/admin/settings)
      for (const table of ['settings', 'admin_settings']) {
        try {
          const col = table === 'settings' ? 'key' : 'setting_key';
          const valCol = table === 'settings' ? 'value' : 'setting_value';
          const setting = await env.DB.prepare(
            `SELECT ${valCol} as val FROM ${table} WHERE ${col} = 'anthropic_api_key'`
          ).bind().all<{ val: string }>();
          if (setting.results?.[0]?.val) {
            apiKey = setting.results[0].val;
            break;
          }
        } catch { /* table might not exist */ }
      }
    }

    if (!apiKey) {
      return NextResponse.json({
        error: 'Kein Anthropic API-Key konfiguriert. Bitte unter Zugang → API-Key eintragen.',
        success: false,
      }, { status: 400 });
    }

    // Fetch media to categorize
    let mediaItems: MediaRecord[];

    if (body.media_ids && body.media_ids.length > 0) {
      const placeholders = body.media_ids.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `SELECT id, url, alt_text, title, category, media_type FROM media WHERE id IN (${placeholders}) AND media_type = 'image'`
      ).bind(...body.media_ids).all<MediaRecord>();
      mediaItems = result.results || [];
    } else {
      // All images (skip videos)
      const result = await env.DB.prepare(
        "SELECT id, url, alt_text, title, category, media_type FROM media WHERE media_type = 'image'"
      ).all<MediaRecord>();
      mediaItems = result.results || [];
    }

    if (mediaItems.length === 0) {
      return NextResponse.json({ error: 'Keine Bilder zum Kategorisieren gefunden', success: false }, { status: 404 });
    }

    const client = new Anthropic({ apiKey });

    const results: { id: string; old_category: string; new_category: string; alt_text: string; success: boolean; error?: string }[] = [];

    for (const item of mediaItems) {
      try {
        // Skip hero images — don't re-categorize those
        if (item.category.startsWith('hero')) {
          results.push({ id: item.id, old_category: item.category, new_category: item.category, alt_text: item.alt_text, success: true });
          continue;
        }

        // Fetch image as base64
        let imageBase64: string;
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';

        const imageUrl = item.url.startsWith('http') ? item.url : `https://sechszirbenhuette.pages.dev${item.url}`;

        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          results.push({ id: item.id, old_category: item.category, new_category: item.category, alt_text: item.alt_text, success: false, error: `HTTP ${imgResponse.status}` });
          continue;
        }

        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
        if (contentType.includes('png')) mediaType = 'image/png';
        else if (contentType.includes('webp')) mediaType = 'image/webp';
        else if (contentType.includes('gif')) mediaType = 'image/gif';

        const arrayBuffer = await imgResponse.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString('base64');

        // Call Claude Vision
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: `Kategorisiere dieses Bild. Aktueller Dateiname: "${item.title || item.alt_text}". ${SYSTEM_PROMPT}`,
                },
              ],
            },
          ],
        });

        // Parse response
        const textContent = response.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          results.push({ id: item.id, old_category: item.category, new_category: item.category, alt_text: item.alt_text, success: false, error: 'Keine Antwort' });
          continue;
        }

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = textContent.text.trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr) as { category: string; alt_text: string };

        if (!VALID_CATEGORIES.includes(parsed.category)) {
          results.push({ id: item.id, old_category: item.category, new_category: item.category, alt_text: item.alt_text, success: false, error: `Ungültige Kategorie: ${parsed.category}` });
          continue;
        }

        // Update media record
        await env.DB.prepare(
          'UPDATE media SET category = ?, alt_text = ? WHERE id = ?'
        ).bind(parsed.category, parsed.alt_text || item.alt_text, item.id).run();

        // Update meta-flags in junction table
        const metaFlags: string[] = [];
        if (INNEN_CATEGORIES.includes(parsed.category)) metaFlags.push('innen');
        if (AUSSEN_CATEGORIES.includes(parsed.category)) metaFlags.push('aussen');

        if (metaFlags.length > 0) {
          // Delete existing meta-flags for this media
          await env.DB.prepare(
            "DELETE FROM media_categories WHERE media_id = ? AND category IN ('innen', 'aussen')"
          ).bind(item.id).run();

          // Insert new meta-flags
          for (const flag of metaFlags) {
            try {
              await env.DB.prepare(
                'INSERT OR IGNORE INTO media_categories (media_id, category) VALUES (?, ?)'
              ).bind(item.id, flag).run();
            } catch { /* ignore duplicate */ }
          }
        }

        results.push({
          id: item.id,
          old_category: item.category,
          new_category: parsed.category,
          alt_text: parsed.alt_text || item.alt_text,
          success: true,
        });
      } catch (err) {
        results.push({
          id: item.id,
          old_category: item.category,
          new_category: item.category,
          alt_text: item.alt_text,
          success: false,
          error: err instanceof Error ? err.message : 'Unbekannter Fehler',
        });
      }
    }

    const successCount = results.filter(r => r.success && r.old_category !== r.new_category).length;
    const skippedCount = results.filter(r => r.success && r.old_category === r.new_category).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        categorized: successCount,
        unchanged: skippedCount,
        errors: errorCount,
      },
      message: `${successCount} Bilder neu kategorisiert, ${skippedCount} unverändert, ${errorCount} Fehler`,
    });
  } catch (error) {
    console.error('Auto-categorize error:', error);
    return NextResponse.json(
      { error: 'Kategorisierung fehlgeschlagen', details: String(error), success: false },
      { status: 500 }
    );
  }
}
