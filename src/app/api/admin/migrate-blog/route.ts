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

// Dog trip category keys mapping to media categories
const DOG_TRIP_CATEGORIES = [
  'hund-falkert',
  'hund-rodresnock',
  'hund-drei-seen',
  'hund-hochrindl',
  'hund-millstaetter',
];

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
        type: 'dog-carousel',
        sectionTitle: 'Die 5 schönsten Ausflüge mit Hund in Kärnten',
        imageCategories: DOG_TRIP_CATEGORIES,
        slides: [
          { title: 'Falkert und Falkertsee', description: 'Ein Spaziergang um den Falkertsee ist fester Bestandteil unseres Aufenthalts am Berg und ist auch für ältere Hunde gut zu bewerkstelligen. Nicht wegzudenken ist natürlich eine Wanderung auf den Falkert. Je nach Fitness dauert es 1 bis 3 Stunden. Ein steiler oder ein gemäßigter Auf- und Abstieg sind möglich. Der Hund sollte bergerfahren und fit sein.', difficulty: 'leicht bis mittel', duration: '1-3 Stunden' },
          { title: 'Wanderung Rodresnock/Moschelitzen/Murmeltiertal', description: 'Eine ausgedehnte, teilweise sportliche und meistens recht windige Rundwanderung. Unser heimlicher Favorit – oftmals trifft man keine Menschenseele und hat die Nockberge für sich.', difficulty: 'anspruchsvoll', tip: 'Hundemantel für den Gipfel' },
          { title: 'Drei-Seen-Wanderung an der Turracher Höhe', description: 'Eine gemäßigte Wanderung entlang der Drei-Seen. Für alle Level geeignet. Gut mit dem Auto zu erreichen. Unbedingt in der Karl-Hütte vorbeischauen und Kaiserschmarrn essen.', difficulty: 'leicht', tip: 'Kaiserschmarrn in der Karl-Hütte' },
          { title: 'Panoramaweg Hochrindl', description: 'Von hier aus starten verschiedene Wanderwege, u.a. eine schöne Panoramawanderung mit vielen Frischwassermöglichkeiten. Für Hunde perfekt.', difficulty: 'leicht bis mittel' },
          { title: 'Strandbad Tschinder am Millstätter See', description: 'Wer im Sommer eine Abkühlung sucht und seinen Vierbeiner mitnehmen möchte, sollte ins Strandbad Tschinder am Millstätter See. Hier gibt es einen Bereich für Hunde, natürlich mit Leine!', difficulty: 'leicht', tip: 'Hundebereich mit Leinenpflicht' },
        ],
      },
      {
        title: 'Mit Kindern',
        type: 'kids-accordion',
        sectionTitle: 'Die 7 schönsten Ausflüge mit Kindern in Kärnten',
        featured: {
          title: 'Die Heidi-Alm am Falkert',
          description: 'Die Heidi-Alm am Falkert ist direkt ums Eck und bietet einen märchenhaften Spaziergang durch die Heidi-Welt mit Blick auf die umliegenden Berge. Eine große Rutsche und ein moderner Spielplatz runden den Ausflug ab. Auf dem See der Heidi-Alm gibt es außerdem die Möglichkeit zu angeln. Bitte sprechen Sie vorab das Team der Heidi-Alm an. Nach der Heidi-Alm kann sich in der direkt angrenzenden Gastronomie der Seehütte oder der Bogi Alm gestärkt werden. Erwachsene kommen bei einem Spaziergang um den Falkertsee auf ihre Kosten.',
          distance: '5 Gehminuten',
          age: 'Alle Altersgruppen',
        },
        slides: [
          { title: 'Turracher Höhe und Nocky-Flitzer', description: 'Die Turracher Höhe ist ein wunderschönes Skigebiet für Anfänger und Profis. Die malerische Landschaft zwischen Tannen und Bergspitzen, die Schneesicherheit und ihre 43 Pistenkilometer sind für Familien perfekt. Außerhalb der Wintersaison ist die Alpen-Achterbahn Nockyflitzer ein absolutes Ausflugs-Highlight. Ab 3 Jahren geht\'s rasant den Berg herunter, natürlich in Begleitung eines Erwachsenen. Die Nockyflitzer öffnet ab Juni seine Tore. Tolle Spielplätze und Nockys Almzeit (eine kindgerechte Entdeckungs-Wanderung mit Stempelkarte) lassen den Tag wie im Flug vergehen. Bei uns vergeht kein Urlaub in der Sechszirbenhütte ohne einen Besuch der Turracher Höhe.', distance: '15 Autominuten', age: 'Ab 3 Jahren' },
          { title: 'Ossiacher See und Familywald', description: 'Der Ossiacher See liegt ca. 30 Fahrminuten von der Sechszirbenhütte entfernt. Direkt daran gelegen ist der Abenteuer- und Kletterwald Familywald. Hier kommen kleine und große Kinder voll auf ihre Kosten. Das Gelände ist liebevoll gestaltet, in jedem Baum gibt es etwas zu entdecken, Klangreisen, Balancier-Parks, eine Fly-Line und ein Hochseilgarten - hier lassen sich wirklich Stunden verbringen. Mit dem Tree-Net hat der Familywald ein absolutes Highlight geschaffen. Hier können Kleine und Große auf Netzen durch die Baumwipfel laufen, von Baum zu Baum rutschen und sind dabei absolut fallsicher.', distance: '30 Autominuten', age: 'Ab 4 Jahren' },
          { title: 'Panoramaweg St. Oswald (mit Brunnachbahn)', description: 'Unsere Standard-Wanderung, wenn wir am Falkert sind. Mit der Brunnachbahn in Bad Kleinkirchheim geht es zum Panoramaweg St. Oswald. Die Wanderung ist kindgerecht und nicht zu steil, um z.B. auch kleinere Kandidaten mit einer Kraxel zu transportieren. Der Ausblick ist traumhaft und es gibt zahlreiche Abzweigungen für ausgedehntere Wanderungen, wenn z.B. ein Elternteil alleine weiterziehen möchte. Auf halber Strecke liegt die Bockhütte, eine perfekte Rast und wie im Bilderbuch. Wieder an der Biosphärenparkbahn Brunnachbahn angekommen wartet ein Aktiv Park und Wasserspielplatz auf euch, hier können sich müde Beine abkühlen, die Kinder Floß fahren und die Erwachsenen auf den Sonnenbänken eine Pause einlegen.', distance: '16 Autominuten', age: 'Alle Altersgruppen' },
          { title: 'Tierpark Feld am See', description: 'Der Alpen Tierpark Feld am See ist ein Wildpark am Fuße eines Berges. Hier gibt es diverse heimische Tiere zu beobachten sowie einen kleinen Streichelzoo. Zwei Spielplätze sorgen für Abwechslung. Die Tour ist kinderwagen-geeignet, es gibt nur ein paar kleine Steigungen.', distance: '25 Autominuten', age: 'Alle Altersgruppen' },
          { title: 'Bergbahn Gerlitzen-Alpe', description: 'Die Gerlitzen-Alpe ist ein bekannter Startpunkt für Paraglider. Hier gibt es bei guten Bedingungen also immer viel zu bestaunen. An den einzelnen Stationen der Bergbahnen (ganz oben und Mitte) warten verschiedene Spielplätze. Ganz oben auf dem Berg können die Kinder mit tollstem Panorama schaukeln und dank super geringer Steigungen auch entspannt eine kleine Wanderung mit ihren Eltern machen.', distance: '40 Autominuten', age: 'Alle Altersgruppen' },
          { title: 'Panoramastraße Nockalm', description: 'Die Nockberge haben eine einzigartige Schönheit. Wie warme grüne Riesen liegen die Naturwunder in der Landschaft. Besonders eindrucksvoll lassen sie sich auf der Panoramastraße Nockalm bestaunen. Eltern planen das optimalerweise rund um den Mittagsschlaf und genießen dabei die Ruhe und den Ausblick. Aber Achtung: Es ist kurvig, schwache Mägen könnten sich bemerkbar machen.', distance: '15 Autominuten', age: 'Alle Altersgruppen' },
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
      console.error('[migrate-blog] DB not available');
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }
    console.log('[migrate-blog] Starting migration...');

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

    // Fetch images from 'aussen' category for Article 1 carousel slides + cover
    const aussenResult = await db.prepare(
      "SELECT url, alt_text FROM media WHERE category = 'aussen' AND media_type != 'video' ORDER BY display_order ASC, created_at ASC LIMIT ?"
    ).bind(ARTICLE_1.slides.length).all<{ url: string; alt_text: string }>();
    const aussenImages = aussenResult.results || [];
    const cover1Url = aussenImages[0]?.url || null;
    console.log(`[migrate-blog] Found ${aussenImages.length} aussen images:`, aussenImages.map(img => img.url));

    // Article 2 uses 'hund-falkert' category images (dog trips)
    const hundResult = await db.prepare(
      "SELECT url FROM media WHERE category = 'hund-falkert' AND media_type != 'video' ORDER BY display_order ASC, created_at ASC LIMIT 1"
    ).all<{ url: string }>();
    const cover2Url = hundResult.results?.[0]?.url || null;

    steps.push(`Cover images: article1=${cover1Url ? 'aussen' : 'none'} (${aussenImages.length} images), article2=${cover2Url ? 'hund-falkert' : 'none'}`);

    // Step 2: Migrate Article 1 (carousel)
    const slug1 = generateSlug(ARTICLE_1.title);
    const existing1 = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug1).first();
    if (!existing1) {
      const id1 = crypto.randomUUID();
      const cover1 = cover1Url;
      await db.prepare(
        `INSERT INTO blog_posts (id, slug, title, subtitle, excerpt, content, cover_image_url, layout, status, author, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 'Sechszirbenhütte', ?, ?, ?)`
      ).bind(id1, slug1, ARTICLE_1.title, ARTICLE_1.subtitle, ARTICLE_1.excerpt, ARTICLE_1.content, cover1, ARTICLE_1.layout, now, now, now).run();
      steps.push(`Article 1 inserted with id ${id1}, cover: ${cover1 ? 'yes' : 'none'}`);

      for (let i = 0; i < ARTICLE_1.slides.length; i++) {
        const slide = ARTICLE_1.slides[i];
        const imgId = crypto.randomUUID();
        const slideImageUrl = aussenImages[i]?.url || '';
        console.log(`[migrate-blog] Inserting slide ${i + 1}/${ARTICLE_1.slides.length}: "${slide.title}" image=${slideImageUrl ? 'yes' : 'none'}`);
        await db.prepare(
          `INSERT INTO blog_post_images (id, post_id, image_url, image_alt, caption, display_order)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(imgId, id1, slideImageUrl, slide.title, slide.description, i).run();
      }
      steps.push(`Article 1: ${ARTICLE_1.slides.length} slides inserted (${aussenImages.length} with images)`);
    } else {
      // Always update content, cover, and metadata to latest version
      await db.prepare(
        `UPDATE blog_posts SET title = ?, subtitle = ?, excerpt = ?, content = ?, cover_image_url = COALESCE(NULLIF(cover_image_url, ''), ?), layout = ?, updated_at = ? WHERE slug = ?`
      ).bind(ARTICLE_1.title, ARTICLE_1.subtitle, ARTICLE_1.excerpt, ARTICLE_1.content, cover1Url, ARTICLE_1.layout, now, slug1).run();

      // Re-create slides: delete old ones, insert new
      const existingPost1 = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug1).first<{ id: string }>();
      if (existingPost1) {
        console.log(`[migrate-blog] Deleting old slides for post ${existingPost1.id}`);
        await db.prepare('DELETE FROM blog_post_images WHERE post_id = ?').bind(existingPost1.id).run();
        for (let i = 0; i < ARTICLE_1.slides.length; i++) {
          const slide = ARTICLE_1.slides[i];
          const imgId = crypto.randomUUID();
          const slideImageUrl = aussenImages[i]?.url || '';
          console.log(`[migrate-blog] Re-inserting slide ${i + 1}/${ARTICLE_1.slides.length}: "${slide.title}" image=${slideImageUrl ? 'yes' : 'none'}`);
          await db.prepare(
            `INSERT INTO blog_post_images (id, post_id, image_url, image_alt, caption, display_order) VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(imgId, existingPost1.id, slideImageUrl, slide.title, slide.description, i).run();
        }
      }
      steps.push('Article 1 already exists, updated content and slides');
    }

    // Step 3: Migrate Article 2 (tabs)
    const slug2 = generateSlug(ARTICLE_2.title);
    const existing2 = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug2).first();
    if (!existing2) {
      const id2 = crypto.randomUUID();
      const tabsContent = JSON.stringify(ARTICLE_2.content);
      await db.prepare(
        `INSERT INTO blog_posts (id, slug, title, subtitle, excerpt, content, cover_image_url, layout, status, author, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 'Sechszirbenhütte', ?, ?, ?)`
      ).bind(id2, slug2, ARTICLE_2.title, ARTICLE_2.subtitle, ARTICLE_2.excerpt, tabsContent, cover2Url, ARTICLE_2.layout, now, now, now).run();
      steps.push(`Article 2 inserted with id ${id2}, cover: ${cover2Url ? 'yes' : 'none'}`);
    } else {
      // Always update content, cover, and metadata to latest version
      const tabsContentUpdate = JSON.stringify(ARTICLE_2.content);
      await db.prepare(
        `UPDATE blog_posts SET title = ?, subtitle = ?, excerpt = ?, content = ?, cover_image_url = COALESCE(NULLIF(cover_image_url, ''), ?), layout = ?, updated_at = ? WHERE slug = ?`
      ).bind(ARTICLE_2.title, ARTICLE_2.subtitle, ARTICLE_2.excerpt, tabsContentUpdate, cover2Url, ARTICLE_2.layout, now, slug2).run();
      steps.push('Article 2 already exists, updated content');
    }

    // Verify: count slides for article 1
    const post1 = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug1).first<{ id: string }>();
    if (post1) {
      const slideCount = await db.prepare('SELECT COUNT(*) as count FROM blog_post_images WHERE post_id = ?').bind(post1.id).first<{ count: number }>();
      console.log(`[migrate-blog] Verification: Article 1 has ${slideCount?.count || 0} slides in DB`);
      steps.push(`Verification: Article 1 has ${slideCount?.count || 0} slides`);
    }

    console.log('[migrate-blog] Migration completed. Steps:', steps);
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
