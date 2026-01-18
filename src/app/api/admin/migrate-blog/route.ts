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

// The two static blog articles to migrate
const BLOG_ARTICLES = [
  {
    slug: 'ganzjaehriges-urlaubsziel-nockberge',
    title: 'Ganzjähriges Urlaubsziel für die ganze Familie',
    subtitle: 'Südösterreich: Ski- & Natururlaub in besten Klimabedingungen',
    excerpt: 'Entdecken Sie das idyllische Skidorf Falkertsee im Süden Österreichs, wo Ski- und Naturfreunde perfekte klimatische Bedingungen vorfinden.',
    layout: 'carousel' as const,
    content: `# Ganzjähriges Urlaubsziel für die ganze Familie

Entdecken Sie das idyllische Skidorf Falkertsee im Süden Österreichs, wo Ski- und Naturfreunde perfekte klimatische Bedingungen vorfinden. Erleben Sie von Dezember bis April traumhafte Schneeverhältnisse und im Sommer saftig grüne Wiesen in Kärntens höchst gelegenem Skidorf.

## Sechszirbenhütte: Zentrale Unterkunft für alle Aktivitäten

Die Sechszirbenhütte ist die ideale Unterkunft für Ihren Urlaub in Falkertsee. Dank ihrer zentralen Lage haben Sie bequemen Zugang zu allen Skigebieten, Wanderwegen, dem Nationalpark Nockberge und den malerischen Kärntner Seen.

## Nationalpark Nockberge & angrenzende Skigebiete

Erkunden Sie den beeindruckenden Nationalpark Nockberge in unmittelbarer Nähe zur Sechszirbenhütte. Profitieren Sie zudem von der Nähe zu den erstklassigen Skigebieten Turracher Höhe und Bad Kleinkirchheim für noch mehr Abwechslung.

## Dreiländereck: Italien, Slowenien & Österreich

Die zentrale Lage der Sechszirbenhütte ermöglicht es Ihnen, bequem das Dreiländereck von Italien, Slowenien und Österreich zu erkunden und die kulturellen Highlights der Region zu entdecken.

## Ganzjährige Aktivitäten für die ganze Familie

Egal zu welcher Jahreszeit, in der Umgebung der Sechszirbenhütte gibt es zahlreiche Aktivitäten für die ganze Familie. Erleben Sie unvergessliche Momente beim Skifahren, Wandern, Golfen oder beim Besuch der malerischen Kärntner Seen.

## Heidi-Alm, Golfen, Wandern & mehr

Erkunden Sie die abwechslungsreiche Bergwelt rund um die Sechszirbenhütte oder nutzen Sie die Golfmöglichkeiten (18-Loch) in Bad Kleinkirchheim. Die bekannte Heidi-Alm lockt besonders junge Besucher auf den Berg.

## Sparen mit der Kärnten Card

Informieren Sie sich über die attraktive Kärnten Card, mit der Sie während Ihres Aufenthalts eine Menge Geld sparen können. Für Familien besonders toll – meist rechnet sie sich ab der 2. Gondelfahrt.

[Mehr zur Kärnten Card](https://www.kaerntencard.at) | [Heidi-Alm besuchen](https://www.heidialm.at)`,
    meta_title: 'Ganzjähriges Urlaubsziel Nockberge | Sechszirbenhütte',
    meta_description: 'Entdecken Sie Falkertsee in Kärnten - perfekt für Ski- und Natururlaub. Die Sechszirbenhütte bietet zentrale Lage für Nationalpark, Skigebiete und Seen.',
    meta_keywords: 'Nockberge, Falkertsee, Skiurlaub Kärnten, Familienurlaub Österreich, Nationalpark, Heidi-Alm, Kärnten Card',
  },
  {
    slug: 'ausfluege-kaernten-hunde-kinder',
    title: 'Ausflüge in Kärnten',
    subtitle: 'Die schönsten Ausflugsziele mit Hunden und Kindern',
    excerpt: 'Entdecken Sie die besten Ausflugsziele in Kärnten für die ganze Familie - perfekt für Urlaub mit Hunden und Kindern.',
    layout: 'carousel' as const,
    content: `# Ausflüge in Kärnten mit Hunden und Kindern

Entdecken Sie die besten Ausflugsziele in Kärnten für die ganze Familie - perfekt für Urlaub mit Hunden und Kindern.

---

## Die 5 schönsten Ausflüge mit Hund in Kärnten

### 1. Falkert und Falkertsee
Ein Spaziergang um den Falkertsee ist fester Bestandteil unseres Aufenthalts am Berg und ist auch für ältere Hunde gut zu bewerkstelligen. Nicht wegzudenken ist natürlich eine Wanderung auf den Falkert. Je nach Fitness dauert es 1 bis 3 Stunden. Ein steiler oder ein gemäßigter Auf- und Abstieg sind möglich. Der Hund sollte bergerfahren und fit sein.

**Schwierigkeit:** leicht bis mittel | **Dauer:** 1-3 Stunden

### 2. Wanderung Rodresnock/Moschelitzen/Murmeltiertal
Eine ausgedehnte, teilweise sportliche und meistens recht windige Rundwanderung. Unser heimlicher Favorit – oftmals trifft man keine Menschenseele und hat die Nockberge für sich.

**Schwierigkeit:** anspruchsvoll | **Tipp:** Hundemantel für den Gipfel

### 3. Drei-Seen-Wanderung an der Turracher Höhe
Eine gemäßigte Wanderung entlang der Drei-Seen. Für alle Level geeignet. Gut mit dem Auto zu erreichen. Unbedingt in der Karl-Hütte vorbeischauen und Kaiserschmarrn essen.

**Schwierigkeit:** leicht | **Tipp:** Kaiserschmarrn in der Karl-Hütte

### 4. Panoramaweg Hochrindl
Von hier aus starten verschiedene Wanderwege, u.a. eine schöne Panoramawanderung mit vielen Frischwassermöglichkeiten. Für Hunde perfekt.

**Schwierigkeit:** leicht bis mittel

### 5. Strandbad Tschinder am Millstätter See
Wer im Sommer eine Abkühlung sucht und seinen Vierbeiner mitnehmen möchte, sollte ins Strandbad Tschinder am Millstätter See. Hier gibt es einen Bereich für Hunde, natürlich mit Leine!

**Schwierigkeit:** leicht | **Tipp:** Hundebereich mit Leinenpflicht

---

## Die 7 schönsten Ausflüge mit Kindern in Kärnten

### 1. Die Heidi-Alm am Falkert (Highlight!)
Die Heidi-Alm am Falkert ist direkt ums Eck und bietet einen märchenhaften Spaziergang durch die Heidi-Welt mit Blick auf die umliegenden Berge. Eine große Rutsche und ein moderner Spielplatz runden den Ausflug ab. Auf dem See der Heidi-Alm gibt es außerdem die Möglichkeit zu angeln.

**Entfernung:** 5 Gehminuten | **Altersgruppe:** Alle Altersgruppen

### 2. Turracher Höhe und Nocky-Flitzer
Die Turracher Höhe ist ein wunderschönes Skigebiet für Anfänger und Profis. Außerhalb der Wintersaison ist die Alpen-Achterbahn Nockyflitzer ein absolutes Ausflugs-Highlight. Ab 3 Jahren geht's rasant den Berg herunter.

**Entfernung:** 15 Autominuten | **Altersgruppe:** Ab 3 Jahren

### 3. Ossiacher See und Familywald
Der Ossiacher See liegt ca. 30 Fahrminuten entfernt. Direkt daran gelegen ist der Abenteuer- und Kletterwald Familywald mit Klangreisen, Balancier-Parks, Fly-Line und Hochseilgarten.

**Entfernung:** 30 Autominuten | **Altersgruppe:** Ab 4 Jahren

### 4. Panoramaweg St. Oswald (mit Brunnachbahn)
Mit der Brunnachbahn in Bad Kleinkirchheim geht es zum Panoramaweg St. Oswald. Die Wanderung ist kindgerecht mit traumhaftem Ausblick. Auf halber Strecke liegt die Bockhütte für eine perfekte Rast.

**Entfernung:** 16 Autominuten | **Altersgruppe:** Alle Altersgruppen

### 5. Tierpark Feld am See
Ein Wildpark am Fuße eines Berges mit heimischen Tieren und Streichelzoo. Die Tour ist kinderwagen-geeignet.

**Entfernung:** 25 Autominuten | **Altersgruppe:** Alle Altersgruppen

### 6. Bergbahn Gerlitzen-Alpe
Bekannter Startpunkt für Paraglider mit verschiedenen Spielplätzen an den Stationen. Ganz oben können die Kinder mit tollem Panorama schaukeln.

**Entfernung:** 40 Autominuten | **Altersgruppe:** Alle Altersgruppen

### 7. Panoramastraße Nockalm
Die Nockberge haben eine einzigartige Schönheit. Besonders eindrucksvoll auf der Panoramastraße Nockalm zu bestaunen. Perfekt während des Mittagsschlafs der Kleinen!

**Entfernung:** 15 Autominuten | **Altersgruppe:** Alle Altersgruppen`,
    meta_title: 'Ausflüge in Kärnten mit Hunden & Kindern | Sechszirbenhütte',
    meta_description: 'Die schönsten Ausflugsziele in Kärnten für Familien mit Hunden und Kindern. Wanderungen, Spielplätze, Seen und mehr rund um die Sechszirbenhütte.',
    meta_keywords: 'Ausflüge Kärnten, Wandern mit Hund, Familienausflüge Österreich, Heidi-Alm, Nocky-Flitzer, Millstätter See, Turracher Höhe',
  }
];

// POST - Migrate static blog articles to database
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check authentication
    const sessionToken = request.cookies.get('admin_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await env.DB.prepare(
      "SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > datetime('now')"
    ).bind(sessionToken).first();

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const results: { slug: string; status: 'created' | 'exists' | 'error'; message?: string }[] = [];

    for (const article of BLOG_ARTICLES) {
      try {
        // Check if article already exists
        const existing = await env.DB.prepare(
          'SELECT id FROM blog_posts WHERE slug = ?'
        ).bind(article.slug).first();

        if (existing) {
          results.push({ slug: article.slug, status: 'exists', message: 'Article already exists' });
          continue;
        }

        // Create article
        const postId = crypto.randomUUID();
        const publishedAt = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO blog_posts (id, slug, title, subtitle, excerpt, content, cover_image_url, cover_image_alt, layout, status, author, meta_title, meta_description, meta_keywords, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          postId,
          article.slug,
          article.title,
          article.subtitle,
          article.excerpt,
          article.content,
          null, // cover_image_url - can be set later in admin
          null, // cover_image_alt
          article.layout,
          'published',
          'Sechszirbenhütte',
          article.meta_title,
          article.meta_description,
          article.meta_keywords,
          publishedAt
        ).run();

        results.push({ slug: article.slug, status: 'created' });

      } catch (error) {
        results.push({
          slug: article.slug,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Migration complete: ${created} created, ${existing} already existed, ${errors} errors`,
      results
    });

  } catch (error) {
    console.error('Error migrating blog articles:', error);
    return NextResponse.json({ error: 'Failed to migrate articles' }, { status: 500 });
  }
}

// GET - Check migration status
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const slugs = BLOG_ARTICLES.map(a => a.slug);
    const status: Record<string, boolean> = {};

    for (const slug of slugs) {
      const existing = await env.DB.prepare(
        'SELECT id FROM blog_posts WHERE slug = ?'
      ).bind(slug).first();
      status[slug] = !!existing;
    }

    const allMigrated = Object.values(status).every(v => v);

    return NextResponse.json({
      migrated: allMigrated,
      articles: status,
      total: slugs.length,
      existing: Object.values(status).filter(v => v).length
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
