import { NextResponse } from 'next/server';
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

async function getDb(): Promise<D1Database | null> {
  try {
    const ctx = await getCloudflareContext();
    return (ctx.env as CloudflareEnv).DB;
  } catch {
    return null;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Article 1: Ganzjähriges Urlaubsziel (carousel layout)
const ARTICLE_1 = {
  title: 'Ganzjähriges Urlaubsziel für die ganze Familie',
  subtitle: 'Südösterreich: Ski- & Natururlaub in besten Klimabedingungen',
  excerpt: 'Entdecken Sie das idyllische Skidorf Falkertsee im Süden Österreichs, wo Ski- und Naturfreunde perfekte klimatische Bedingungen vorfinden.',
  content: 'Entdecken Sie das idyllische Skidorf Falkertsee im Süden Österreichs, wo Ski- und Naturfreunde perfekte klimatische Bedingungen vorfinden. Erleben Sie von Dezember bis April traumhafte Schneeverhältnisse und im Sommer saftig grüne Wiesen in Kärntens höchst gelegenem Skidorf.',
  layout: 'carousel',
  slides: [
    { title: 'Sechszirbenhütte: Zentrale Unterkunft für alle Aktivitäten', description: 'Die Sechszirbenhütte ist die ideale Unterkunft für Ihren Urlaub in Falkertsee. Dank ihrer zentralen Lage haben Sie bequemen Zugang zu allen Skigebieten, Wanderwegen, dem Nationalpark Nockberge und den malerischen Kärntner Seen.' },
    { title: 'Nationalpark Nockberge & angrenzende Skigebiete', description: 'Erkunden Sie den beeindruckenden Nationalpark Nockberge in unmittelbarer Nähe zur Sechszirbenhütte. Profitieren Sie zudem von der Nähe zu den erstklassigen Skigebieten Turracher Höhe und Bad Kleinkirchheim für noch mehr Abwechslung.' },
    { title: 'Dreiländereck: Italien, Slowenien & Österreich', description: 'Die zentrale Lage der Sechszirbenhütte ermöglicht es Ihnen, bequem das Dreiländereck von Italien, Slowenien und Österreich zu erkunden und die kulturellen Highlights der Region zu entdecken.' },
    { title: 'Ganzjährige Aktivitäten für die ganze Familie', description: 'Egal zu welcher Jahreszeit, in der Umgebung der Sechszirbenhütte gibt es zahlreiche Aktivitäten für die ganze Familie. Erleben Sie unvergessliche Momente beim Skifahren, Wandern, Golfen oder beim Besuch der malerischen Kärntner Seen.' },
    { title: 'Heidi-Alm, Golfen, Wandern & mehr', description: 'Erkunden Sie die abwechslungsreiche Bergwelt rund um die Sechszirbenhütte oder nutzen Sie die Golfmöglichkeiten (18-Loch) in Bad Kleinkirchheim. Die bekannte Heidi-Alm lockt besonders junge Besucher auf den Berg.' },
    { title: 'Sparen mit der Kärnten Card', description: 'Informieren Sie sich über die attraktive Kärnten Card, mit der Sie während Ihres Aufenthalts eine Menge Geld sparen können. Für Familien besonders toll – meist rechnet sie sich ab der 2. Gondelfahrt.' },
  ],
};

// Article 2: Ausflüge in Kärnten (tabs layout)
const ARTICLE_2 = {
  title: 'Ausflüge in Kärnten',
  subtitle: 'Die schönsten Ausflugsziele mit Hunden und Kindern',
  excerpt: 'Entdecken Sie die besten Ausflugsziele in Kärnten für die ganze Familie - perfekt für Urlaub mit Hunden und Kindern.',
  layout: 'tabs',
  content: {
    intro: 'Entdecken Sie die besten Ausflugsziele in Kärnten für die ganze Familie - perfekt für Urlaub mit Hunden und Kindern.',
    tabs: [
      {
        title: 'Mit Hunden',
        slides: [
          { title: 'Falkert und Falkertsee', description: 'Ein Spaziergang um den Falkertsee ist fester Bestandteil unseres Aufenthalts am Berg und ist auch für ältere Hunde gut zu bewerkstelligen. Nicht wegzudenken ist natürlich eine Wanderung auf den Falkert. Je nach Fitness dauert es 1 bis 3 Stunden.', difficulty: 'leicht bis mittel', duration: '1-3 Stunden' },
          { title: 'Wanderung Rodresnock/Moschelitzen/Murmeltiertal', description: 'Eine ausgedehnte, teilweise sportliche und meistens recht windige Rundwanderung. Unser heimlicher Favorit – oftmals trifft man keine Menschenseele und hat die Nockberge für sich.', difficulty: 'anspruchsvoll', tip: 'Hundemantel für den Gipfel' },
          { title: 'Drei-Seen-Wanderung an der Turracher Höhe', description: 'Eine gemäßigte Wanderung entlang der Drei-Seen. Für alle Level geeignet. Gut mit dem Auto zu erreichen. Unbedingt in der Karl-Hütte vorbeischauen und Kaiserschmarrn essen.', difficulty: 'leicht', tip: 'Kaiserschmarrn in der Karl-Hütte' },
          { title: 'Panoramaweg Hochrindl', description: 'Von hier aus starten verschiedene Wanderwege, u.a. eine schöne Panoramawanderung mit vielen Frischwassermöglichkeiten. Für Hunde perfekt.', difficulty: 'leicht bis mittel' },
          { title: 'Strandbad Tschinder am Millstätter See', description: 'Wer im Sommer eine Abkühlung sucht und seinen Vierbeiner mitnehmen möchte, sollte ins Strandbad Tschinder am Millstätter See. Hier gibt es einen Bereich für Hunde, natürlich mit Leine!', difficulty: 'leicht', tip: 'Hundebereich mit Leinenpflicht' },
        ],
      },
      {
        title: 'Mit Kindern',
        slides: [
          { title: 'Heidi-Alm Falkert', description: 'Der Klassiker für Familien! Die Heidi-Alm auf dem Falkert bietet einen wunderschönen Erlebnisweg mit dem Thema der beliebten Heidi-Geschichte. Perfekt für Kinder jeden Alters.' },
          { title: 'Turracher Höhe - Nocky Flitzer', description: 'Die Sommerrodelbahn Nocky Flitzer auf der Turracher Höhe ist ein Highlight für die ganze Familie. 1,6km rasante Abfahrt mit herrlichem Panorama.' },
          { title: 'Ossiacher See', description: 'Der Ossiacher See bietet im Sommer wunderbares Badevergnügen für die ganze Familie. Flache Einstiege und angenehme Wassertemperaturen machen ihn ideal für Kinder.' },
          { title: 'Panoramaweg für Familien', description: 'Leichte Wanderungen mit tollen Aussichtspunkten, die auch für kleinere Kinder gut machbar sind. Die Nockberge bieten unzählige familienfreundliche Wege.' },
          { title: 'Tierpark Rosegg', description: 'Der älteste Tierpark Kärntens beherbergt über 35 heimische und exotische Tierarten. Ein tolles Ausflugsziel für die ganze Familie.' },
        ],
      },
    ],
  },
};

export async function POST() {
  const steps: string[] = [];
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Step 1: Ensure blog_posts table supports 'tabs' layout
    // Clean up any leftover temp table from previous failed attempts
    try {
      await db.prepare('DROP TABLE IF EXISTS blog_posts_new').run();
      steps.push('Cleanup: blog_posts_new dropped');
    } catch {
      // fine if it doesn't exist
    }

    // Test if 'tabs' is allowed
    let needsRecreate = false;
    try {
      await db.prepare(
        "INSERT INTO blog_posts (id, slug, title, content, layout) VALUES ('__test_tabs__', '__test_tabs__', 'test', 'test', 'tabs')"
      ).run();
      await db.prepare("DELETE FROM blog_posts WHERE id = '__test_tabs__'").run();
      steps.push('Tabs layout already supported');
    } catch {
      needsRecreate = true;
      steps.push('Tabs layout NOT supported, need table recreation');
    }

    if (needsRecreate) {
      // Recreate blog_posts with updated CHECK constraint
      await db.prepare(`
        CREATE TABLE blog_posts_new (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT,
          excerpt TEXT,
          content TEXT NOT NULL,
          cover_image_url TEXT,
          cover_image_alt TEXT,
          layout TEXT DEFAULT 'standard' CHECK(layout IN ('standard', 'carousel', 'tabs')),
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
          author TEXT DEFAULT 'Sechszirbenhütte',
          meta_title TEXT,
          meta_description TEXT,
          meta_keywords TEXT,
          published_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      steps.push('Created blog_posts_new');

      await db.prepare('INSERT INTO blog_posts_new SELECT * FROM blog_posts').run();
      steps.push('Copied data to blog_posts_new');

      await db.prepare('DROP TABLE blog_posts').run();
      steps.push('Dropped old blog_posts');

      await db.prepare('ALTER TABLE blog_posts_new RENAME TO blog_posts').run();
      steps.push('Renamed blog_posts_new -> blog_posts');

      await db.prepare('CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at)').run();
      steps.push('Recreated indexes');
    }

    // Step 2: Migrate Article 1 (carousel)
    const slug1 = generateSlug(ARTICLE_1.title);
    const existing1 = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug1).first();
    if (!existing1) {
      const id1 = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO blog_posts (id, slug, title, subtitle, excerpt, content, layout, status, author, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 'Sechszirbenhütte', ?, ?, ?)`
      ).bind(id1, slug1, ARTICLE_1.title, ARTICLE_1.subtitle, ARTICLE_1.excerpt, ARTICLE_1.content, ARTICLE_1.layout, now, now, now).run();
      steps.push(`Article 1 inserted with id ${id1}`);

      for (let i = 0; i < ARTICLE_1.slides.length; i++) {
        const slide = ARTICLE_1.slides[i];
        const imgId = crypto.randomUUID();
        await db.prepare(
          `INSERT INTO blog_post_images (id, post_id, image_url, image_alt, caption, display_order)
           VALUES (?, ?, '', ?, ?, ?)`
        ).bind(imgId, id1, slide.title, slide.description, i).run();
      }
      steps.push(`Article 1: ${ARTICLE_1.slides.length} slides inserted`);
    } else {
      steps.push('Article 1 already exists, skipped');
    }

    // Step 3: Migrate Article 2 (tabs)
    const slug2 = generateSlug(ARTICLE_2.title);
    const existing2 = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug2).first();
    if (!existing2) {
      const id2 = crypto.randomUUID();
      const tabsContent = JSON.stringify(ARTICLE_2.content);
      await db.prepare(
        `INSERT INTO blog_posts (id, slug, title, subtitle, excerpt, content, layout, status, author, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 'Sechszirbenhütte', ?, ?, ?)`
      ).bind(id2, slug2, ARTICLE_2.title, ARTICLE_2.subtitle, ARTICLE_2.excerpt, tabsContent, ARTICLE_2.layout, now, now, now).run();
      steps.push(`Article 2 inserted with id ${id2}`);
    } else {
      steps.push('Article 2 already exists, skipped');
    }

    return NextResponse.json({
      success: true,
      message: 'Blog-Artikel erfolgreich migriert!',
      steps,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Migration error:', errMsg, 'Steps completed:', steps);
    return NextResponse.json({
      error: `Migration fehlgeschlagen: ${errMsg}`,
      steps,
    }, { status: 500 });
  }
}
