import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

interface ImageRecord {
  id: number;
  image_key: string;
  alt_text: string;
  category: string;
  display_order: number;
  is_hero: number;
  created_at: string;
}

// Valid categories - matching Gallery component structure
const VALID_CATEGORIES = [
  'hero',           // Hero slider images
  'exterior',       // Außenansichten (aussen)
  'living',         // Wohnbereich (wohnen)
  'bedrooms',       // Schlafzimmer (schlafen)
  'kitchen',        // Küche (kueche)
  'bathroom',       // Badezimmer (bad)
  'wellness',       // Sauna & Wellness (bad)
  'surroundings',   // Umgebung (umgebung)
  'extras',         // Extras
  'summer',         // Summer activity backgrounds
  'winter',         // Winter activity backgrounds
  'hosts',          // Gastgeber Bild
];

// GET - Fetch images (optionally filtered by category)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Simple ping - no bindings needed
  if (searchParams.get('ping') === 'true') {
    return NextResponse.json({ pong: true, timestamp: Date.now() });
  }

  // Health check endpoint
  if (searchParams.get('health') === 'true') {
    try {
      const ctx = await getCloudflareContext();

      if (!ctx) {
        return NextResponse.json({
          status: 'error',
          error: 'getCloudflareContext() returned null/undefined'
        }, { status: 500 });
      }

      const env = (ctx as unknown as { env: Env }).env;

      if (!env) {
        return NextResponse.json({
          status: 'error',
          error: 'No env object in request context'
        }, { status: 500 });
      }

      // Test D1 connection
      let tableExists = false;
      let tableError = '';
      if (env.DB) {
        try {
          await env.DB.prepare('SELECT 1 FROM images LIMIT 1').first();
          tableExists = true;
        } catch (e) {
          tableError = e instanceof Error ? e.message : 'Unknown error';
        }
      }

      return NextResponse.json({
        status: 'ok',
        hasImagesBucket: !!env.IMAGES_BUCKET,
        hasD1Database: !!env.DB,
        hasAdminPassword: !!env.ADMIN_PASSWORD,
        tableExists,
        tableError: tableError || undefined
      });
    } catch (e) {
      return NextResponse.json({
        status: 'error',
        error: e instanceof Error ? e.message : 'Health check failed',
        stack: e instanceof Error ? e.stack : undefined
      }, { status: 500 });
    }
  }

  try {

    const ctx = await getCloudflareContext();
    const env = (ctx as unknown as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured. Check wrangler.toml and Cloudflare Pages settings.',
        images: []
      }, { status: 500 });
    }

    const category = searchParams.get('category');
    const heroOnly = searchParams.get('hero') === 'true';

    let query = 'SELECT * FROM images';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (heroOnly) {
      conditions.push('is_hero = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sort by is_hero first (hero images on top), then by display_order
    query += ' ORDER BY is_hero DESC, display_order ASC, created_at DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const { results } = await stmt.all<ImageRecord>();

    // Generate URLs for each image (static images use /images/, R2 images use API)
    const images = (results || []).map(img => ({
      ...img,
      image_url: img.image_key.startsWith('static/')
        ? `/images/${img.image_key.replace('static/', '')}`
        : `/api/admin/images/file/${img.image_key}`
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('GET /api/admin/images error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    // Return JSON error with images array to prevent client-side parsing errors
    return NextResponse.json({ error: message, images: [] }, { status: 500 });
  }
}

// POST - Upload new image
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = formData.get('altText') as string;
    const category = formData.get('category') as string || 'exterior';
    const displayOrder = parseInt(formData.get('displayOrder') as string || '999');
    const isHeroParam = formData.get('isHero');

    // Auto-determine is_hero: if explicitly set, use that; otherwise based on category
    let isHero = 0;
    if (isHeroParam !== null) {
      isHero = isHeroParam === 'true' || isHeroParam === '1' ? 1 : 0;
    } else {
      // Auto-set hero for exterior and surroundings (good hero candidates)
      isHero = ['exterior', 'surroundings', 'hero'].includes(category) ? 1 : 0;
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 });
    }

    // Generate unique filename with category prefix
    const fileExt = file.name.split('.').pop();
    const imageKey = `${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await env.IMAGES_BUCKET.put(imageKey, fileBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    });

    // Save metadata to D1 (including is_hero)
    const result = await env.DB.prepare(
      'INSERT INTO images (image_key, alt_text, category, display_order, is_hero) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).bind(imageKey, altText || 'Bild', category, displayOrder, isHero).first<ImageRecord>();

    if (!result) {
      // Rollback: delete uploaded file
      await env.IMAGES_BUCKET.delete(imageKey);
      return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 });
    }

    return NextResponse.json({
      image: {
        ...result,
        image_url: `/api/admin/images/file/${result.image_key}`
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update image metadata (category, alt_text, display_order)
export async function PUT(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { id?: string; alt_text?: string; category?: string; display_order?: number; is_hero?: boolean };
    const { id, alt_text, category, display_order, is_hero } = body;

    if (!id) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (alt_text !== undefined) {
      updates.push('alt_text = ?');
      values.push(alt_text);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(display_order);
    }
    if (is_hero !== undefined) {
      updates.push('is_hero = ?');
      values.push(is_hero ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE images SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<ImageRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      image: {
        ...result,
        image_url: `/api/admin/images/file/${result.image_key}`
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Database actions (migrations, imports)
export async function PATCH(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { action?: string };
    const { action } = body;

    const results: string[] = [];

    if (action === 'create_images_table') {
      // Create images table
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          image_key TEXT NOT NULL UNIQUE,
          alt_text TEXT,
          category TEXT DEFAULT 'exterior',
          display_order INTEGER DEFAULT 999,
          is_hero INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✓ Tabelle "images" erstellt');
    } else if (action === 'migrate_from_github') {
      // Import static images from public/images/ into database
      // Complete list of all images in the repository
      const staticImages = [
        // === INNENBEREICH ===
        // Wohnbereich
        { key: 'innen/Wohnzimmer_01.jpg', alt: 'Gemütliche Stube - Eckbank mit Holztisch', category: 'living', order: 1 },
        { key: 'innen/Wohnzimmer_01.jpeg', alt: 'Wohnzimmer - Traditionelle Einrichtung', category: 'living', order: 2 },
        { key: 'innen/Wohnzimmer_02_Galerie.jpg', alt: 'Wohnzimmer - Galerie-Ansicht', category: 'living', order: 3 },
        { key: 'innen/Stube.jpg', alt: 'Wohnbereich - Bauernschrank und Treppe', category: 'living', order: 4 },
        { key: 'innen/Stube_02.jpg', alt: 'Stube - Zweite Ansicht', category: 'living', order: 5 },
        { key: 'innen/Stube_03.jpg', alt: 'Stube - Details', category: 'living', order: 6 },
        { key: 'innen/PXL_20221202_080423323.MP.jpg', alt: 'Wohnbereich - Detailansicht', category: 'living', order: 7 },
        { key: 'innen/PXL_20221202_080812396.MP.jpg', alt: 'Wohnbereich - Innenansicht', category: 'living', order: 8 },
        // Küche
        { key: 'innen/Küche_01.jpg', alt: 'Küche - Mit Bauernschrank', category: 'kitchen', order: 1 },
        { key: 'innen/Küche_02.jpg', alt: 'Küchenzeile - Voll ausgestattet mit Geschirrspüler', category: 'kitchen', order: 2 },
        { key: 'innen/Kaffeemaschinen.jpg', alt: 'Kaffeemaschinen - Küchengeräte', category: 'kitchen', order: 3 },
        // Schlafzimmer
        { key: 'innen/Schlafzimmer_groß.jpg', alt: 'Großes Schlafzimmer - Doppelbett und Einzelbett', category: 'bedrooms', order: 1 },
        { key: 'innen/Schlafzimmer_klein.jpg', alt: 'Kleines Schlafzimmer - Gemütliches Doppelbett', category: 'bedrooms', order: 2 },
        { key: 'innen/PXL_20221201_084430269.MP (1).jpg', alt: 'Schlafbereich - Ansicht', category: 'bedrooms', order: 3 },
        { key: 'innen/PXL_20221201_103207418.MP.jpg', alt: 'Schlafbereich - Detail', category: 'bedrooms', order: 4 },
        // Bad & Wellness
        { key: 'innen/Sauna.jpg', alt: 'Finnische Sauna - Holzverkleidung', category: 'wellness', order: 1 },
        { key: 'innen/Ruheraum.jpg', alt: 'Ruheraum - Blick auf Winterlandschaft', category: 'wellness', order: 2 },
        { key: 'innen/Ruheraum_02.jpg', alt: 'Ruheraum - Zweite Ansicht', category: 'wellness', order: 3 },
        { key: 'innen/Ruheraum Dusche.jpg', alt: 'Wellnessbereich - Dusche', category: 'wellness', order: 4 },
        { key: 'innen/PXL_20221202_081005571.MP (1).jpg', alt: 'Wellnessbereich - Ansicht', category: 'wellness', order: 5 },
        { key: 'innen/PXL_20221202_081024704.MP (1).jpg', alt: 'Wellnessbereich - Detail', category: 'wellness', order: 6 },
        { key: 'innen/PXL_20221202_081109229.MP.jpg', alt: 'Wellnessbereich - Sauna', category: 'wellness', order: 7 },
        { key: 'innen/PXL_20221202_081216050.MP.jpg', alt: 'Wellnessbereich - Ruhebereich', category: 'wellness', order: 8 },
        { key: 'innen/PXL_20221202_081338568.MP.jpg', alt: 'Wellnessbereich - Entspannung', category: 'wellness', order: 9 },
        // Badezimmer
        { key: 'innen/Badezimmer.jpg', alt: 'Badezimmer - Mit Dusche', category: 'bathroom', order: 1 },
        { key: 'innen/WC.jpg', alt: 'Separates WC', category: 'bathroom', order: 2 },
        // Ausstattung/Extras
        { key: 'innen/Kamin.jpg', alt: 'Pelletofen RIKA - Moderner Kamin', category: 'extras', order: 1 },
        { key: 'innen/Lampe.jpg', alt: 'Rustikale Deckenlampe', category: 'extras', order: 2 },
        { key: 'innen/Treppenaufgang.jpg', alt: 'Holztreppe ins Obergeschoss', category: 'extras', order: 3 },
        { key: 'innen/csm_grundrisse_b12eea715d.jpg', alt: 'Grundriss der Hütte', category: 'extras', order: 4 },

        // === AUSSENBEREICH ===
        // Außenansichten
        { key: 'aussen/Sommerhütte.jpg', alt: 'Sechszirbenhütte - Im Sommer mit Balkon', category: 'exterior', order: 1, hero: true },
        { key: 'aussen/Aussen-Sommer.jpg', alt: 'Außenansicht - Sommer', category: 'exterior', order: 2 },
        { key: 'aussen/Aussen-Sommer.jpeg', alt: 'Außenansicht - Sommer (2)', category: 'exterior', order: 3 },
        { key: 'aussen/Außen_Sommer_Mücke.jpg', alt: 'Außenansicht - Sommer Mücke', category: 'exterior', order: 4 },
        { key: 'aussen/Herbst.jpg', alt: 'Hütte im Herbst', category: 'exterior', order: 5 },
        { key: 'aussen/Herbst_2.jpg', alt: 'Hütte im Herbst (2)', category: 'exterior', order: 6 },
        { key: 'aussen/Aussen-Herbst.png', alt: 'Außenansicht - Herbst', category: 'exterior', order: 7 },
        { key: 'aussen/Mücke_Herbst.jpg', alt: 'Hütte Herbst - Mücke', category: 'exterior', order: 8 },
        { key: 'aussen/Balkon.jpg', alt: 'Verschneiter Balkon - Winterstimmung', category: 'exterior', order: 9, hero: true },
        { key: 'aussen/Rückseite_Schnee.jpg', alt: 'Hütte Rückseite im Schnee', category: 'exterior', order: 10 },
        { key: 'aussen/Außen_Winter_Mücke_1.jpg', alt: 'Außenansicht Winter - Mücke 1', category: 'exterior', order: 11, hero: true },
        { key: 'aussen/Außen_Winter_Mücke_2.jpg', alt: 'Außenansicht Winter - Mücke 2', category: 'exterior', order: 12 },
        { key: 'aussen/Außen_Winter_Mücke_3.jpg', alt: 'Außenansicht Winter - Mücke 3', category: 'exterior', order: 13 },
        { key: 'aussen/Stube.png', alt: 'Stubenansicht', category: 'exterior', order: 14 },
        { key: 'aussen/PXL_20221129_144005253.MP~3.jpg', alt: 'Außenansicht - Detail', category: 'exterior', order: 15 },
        { key: 'aussen/PXL_20221202_095611327.PORTRAIT~2.jpg', alt: 'Hütte - Portrait', category: 'exterior', order: 16 },
        // Umgebung
        { key: 'aussen/Nockberge.jpg', alt: 'Nockberge Panorama - Atemberaubende Berglandschaft', category: 'surroundings', order: 1, hero: true },
        { key: 'aussen/Kühe_Rodresnock.jpg', alt: 'Almkühe am Rodresnock', category: 'surroundings', order: 2 },
        { key: 'aussen/Kühe_Haus.jpg', alt: 'Kühe bei der Hütte', category: 'surroundings', order: 3 },
        { key: 'aussen/Falkertsee_Winter.png', alt: 'Falkertsee - Mystische Winterstimmung', category: 'surroundings', order: 4, hero: true },
        { key: 'aussen/Wandern_St_Oswald.jpg', alt: 'Wanderung St. Oswald - Über den Wolken', category: 'surroundings', order: 5 },
        { key: 'aussen/Wandern_Triglav.jpg', alt: 'Wanderung Triglav', category: 'surroundings', order: 6 },
        { key: 'aussen/Maltatal_1.jpg', alt: 'Maltatal - Ansicht 1', category: 'surroundings', order: 7 },
        { key: 'aussen/Maltatal_2.jpg', alt: 'Maltatal - Ansicht 2', category: 'surroundings', order: 8 },
        { key: 'aussen/Slowenien.jpg', alt: 'Ausflug nach Slowenien', category: 'surroundings', order: 9 },
        { key: 'aussen/csm_header-09_a956037c64.jpeg', alt: 'Berglandschaft - Header', category: 'surroundings', order: 10 },
        { key: 'aussen/csm_header-19_666fbd97d0.jpeg', alt: 'Bergpanorama - Header', category: 'surroundings', order: 11 },
        // Sommer-Aktivitäten
        { key: 'aussen/Gravel.jpg', alt: 'Gravelbiken - In den Lärchenwäldern', category: 'summer', order: 1 },
        { key: 'aussen/Nockiflitzer.jpg', alt: 'Nocki-Flitzer - Sommerrodelbahn', category: 'summer', order: 2 },
        { key: 'aussen/Pilze.jpg', alt: 'Pilze sammeln im Wald', category: 'summer', order: 3 },
        { key: 'aussen/Pilze_2.jpg', alt: 'Steinpilze', category: 'summer', order: 4 },
        { key: 'aussen/Pilze_3.jpg', alt: 'Pilzfund', category: 'summer', order: 5 },
        { key: 'aussen/Angeln.jpg', alt: 'Angeln am Bergsee', category: 'summer', order: 6 },
        { key: 'aussen/Kaffee.jpg', alt: 'Kaffee auf der Alm', category: 'summer', order: 7 },
        { key: 'aussen/Kaiserschmarrn.jpg', alt: 'Kaiserschmarrn auf der Hütte', category: 'summer', order: 8 },
        // Winter-Aktivitäten
        { key: 'aussen/Skigebiet.jpeg', alt: 'Skigebiet Falkert - Panorama', category: 'winter', order: 1, hero: true },
        { key: 'aussen/Snowboard.jpg', alt: 'Snowboarden - Im Tiefschnee', category: 'winter', order: 2, hero: true },
        { key: 'aussen/Snowboard_Header.jpg', alt: 'Snowboard Action', category: 'winter', order: 3 },
      ];

      let imported = 0;
      let skipped = 0;

      for (const img of staticImages) {
        try {
          // Use static path as the key (prefix with "static/" to distinguish from R2)
          const staticKey = `static/${img.key}`;

          // Check if already exists
          const existing = await env.DB.prepare(
            'SELECT id FROM images WHERE image_key = ?'
          ).bind(staticKey).first();

          if (existing) {
            skipped++;
            continue;
          }

          // Insert into database
          await env.DB.prepare(
            'INSERT INTO images (image_key, alt_text, category, display_order, is_hero) VALUES (?, ?, ?, ?, ?)'
          ).bind(staticKey, img.alt, img.category, img.order, img.hero ? 1 : 0).run();

          imported++;
        } catch (err) {
          console.error(`Error importing ${img.key}:`, err);
        }
      }

      results.push(`✓ ${imported} Bilder importiert`);
      if (skipped > 0) {
        results.push(`⏭️ ${skipped} Bilder übersprungen (bereits vorhanden)`);
      }
      results.push(`✓ Gesamt: ${staticImages.length} statische Bilder`);
    } else if (action === 'delete_all_images') {
      // Delete all images from database
      await env.DB.exec('DELETE FROM images');
      results.push('✓ Alle Bilder aus Datenbank gelöscht');
    } else if (action === 'recreate_table') {
      // Drop and recreate table
      await env.DB.exec('DROP TABLE IF EXISTS images');
      await env.DB.exec(`
        CREATE TABLE images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          image_key TEXT NOT NULL UNIQUE,
          alt_text TEXT,
          category TEXT DEFAULT 'exterior',
          display_order INTEGER DEFAULT 999,
          is_hero INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('✓ Tabelle "images" neu erstellt');
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('PATCH /api/admin/images error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, results: [`❌ Fehler: ${message}`] }, { status: 500 });
  }
}

// DELETE - Delete image
export async function DELETE(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext() as unknown as { env: Env };

    // Check admin password
    const adminPassword = request.headers.get('x-admin-password');

    if (!env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Get image details first
    const image = await env.DB.prepare(
      'SELECT * FROM images WHERE id = ?'
    ).bind(imageId).first<ImageRecord>();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from R2
    await env.IMAGES_BUCKET.delete(image.image_key);

    // Delete from D1
    await env.DB.prepare(
      'DELETE FROM images WHERE id = ?'
    ).bind(imageId).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
