import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1Database {
  prepare(query: string): {
    run(): Promise<unknown>;
    all<T>(): Promise<{ results?: T[] }>;
    first<T>(): Promise<T | null>;
  };
}

/**
 * Auto-migration endpoint: adds missing columns to existing tables.
 * Called on admin page load. Each ALTER TABLE ADD COLUMN is idempotent
 * in SQLite (errors on duplicate are silently caught).
 */
export async function POST() {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as { DB: D1Database };
    const db = env?.DB;

    if (!db) {
      return NextResponse.json({ error: 'DB not available', migrated: [] }, { status: 503 });
    }

    const migrated: string[] = [];
    const errors: string[] = [];

    // Helper: try to add a column, silently ignore if it already exists
    const addColumn = async (table: string, column: string, type: string) => {
      try {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
        migrated.push(`${table}.${column}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (!msg.includes('duplicate column')) {
          errors.push(`${table}.${column}: ${msg}`);
        }
        // "duplicate column" means it already exists — that's fine
      }
    };

    // Helper: create a table if it doesn't exist
    const createTable = async (sql: string, name: string) => {
      try {
        await db.prepare(sql).run();
        migrated.push(`table:${name}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        errors.push(`table:${name}: ${msg}`);
      }
    };

    // =============================================
    // BOOKINGS TABLE — columns referenced in API but missing from original schema
    // =============================================
    await addColumn('bookings', 'children_ages', 'TEXT');
    await addColumn('bookings', 'kurtaxe_cash', 'REAL DEFAULT 0');
    await addColumn('bookings', 'is_private', 'INTEGER DEFAULT 0');
    await addColumn('bookings', 'private_config', 'TEXT');
    await addColumn('bookings', 'briefing_notes', 'TEXT');
    await addColumn('bookings', 'preferred_language', 'TEXT');
    await addColumn('bookings', 'early_checkin', 'TEXT');
    await addColumn('bookings', 'late_checkout', 'TEXT');

    // =============================================
    // GUESTS TABLE — additional fields
    // =============================================
    await addColumn('guests', 'net_rent', 'REAL DEFAULT NULL');
    await addColumn('guests', 'is_private', 'INTEGER DEFAULT 0');
    await addColumn('guests', 'no_nebenkosten', 'INTEGER DEFAULT 0');
    await addColumn('guests', 'ancillary_costs_amount', 'REAL DEFAULT 0');
    await addColumn('guests', 'final_cleaning_amount', 'REAL DEFAULT 0');

    // =============================================
    // MEDIA TABLE — Cloudflare IDs
    // =============================================
    await addColumn('media', 'cf_image_id', 'TEXT DEFAULT NULL');
    await addColumn('media', 'cf_stream_uid', 'TEXT DEFAULT NULL');

    // =============================================
    // IMAGES TABLE — CF Images ID + hero flag
    // =============================================
    await addColumn('images', 'cf_image_id', 'TEXT DEFAULT NULL');
    await addColumn('images', 'is_hero', 'INTEGER DEFAULT 0');

    // =============================================
    // GUEST DOCUMENTS — booking reference
    // =============================================
    await addColumn('guest_documents', 'booking_id', 'INTEGER');

    // =============================================
    // GUEST TASKS — booking reference
    // =============================================
    await addColumn('guest_tasks', 'booking_id', 'INTEGER');

    // =============================================
    // REVIEWS TABLE — ensure it exists
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gast_name TEXT NOT NULL,
        bewertung INTEGER NOT NULL CHECK (bewertung >= 1 AND bewertung <= 5),
        titel TEXT,
        text TEXT,
        aufenthalt_von DATE,
        aufenthalt_bis DATE,
        quelle TEXT,
        sichtbar BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, 'reviews');

    // =============================================
    // MEDIA CATEGORIES — junction table
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS media_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id TEXT NOT NULL,
        category TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
        UNIQUE(media_id, category)
      )
    `, 'media_categories');

    // =============================================
    // CONTENT TEXTS — editable text/headlines
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS content_texts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text_key TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        font_family TEXT,
        font_size TEXT,
        color TEXT,
        padding TEXT,
        section TEXT NOT NULL,
        text_type TEXT DEFAULT 'body',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, 'content_texts');

    // =============================================
    // SITE SETTINGS — styling settings
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, 'site_settings');

    // =============================================
    // BLOG POSTS
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        excerpt TEXT,
        content TEXT NOT NULL,
        cover_image_url TEXT,
        cover_image_alt TEXT,
        layout TEXT DEFAULT 'standard',
        status TEXT DEFAULT 'draft',
        author TEXT DEFAULT 'Sechszirbenhütte',
        meta_title TEXT,
        meta_description TEXT,
        meta_keywords TEXT,
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `, 'blog_posts');

    await createTable(`
      CREATE TABLE IF NOT EXISTS blog_post_images (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_alt TEXT,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `, 'blog_post_images');

    // =============================================
    // GUEST APP — categories, cards, access tokens, sessions
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS guest_app_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        icon TEXT DEFAULT 'info',
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, 'guest_app_categories');

    await createTable(`
      CREATE TABLE IF NOT EXISTS guest_app_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        image_alt TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES guest_app_categories(id) ON DELETE CASCADE
      )
    `, 'guest_app_cards');

    await createTable(`
      CREATE TABLE IF NOT EXISTS guest_access_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        access_code TEXT NOT NULL UNIQUE,
        guest_name TEXT,
        valid_from TEXT,
        valid_until TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      )
    `, 'guest_access_tokens');

    // =============================================
    // RENTAL PRICES — seasonal pricing periods
    // =============================================
    await createTable(`
      CREATE TABLE IF NOT EXISTS rental_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        price_per_night DECIMAL(10,2) NOT NULL,
        nebenkosten_pro_person DECIMAL(10,2) DEFAULT 0,
        mindestaufenthalt INTEGER DEFAULT 3,
        aktiv BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, 'rental_prices');

    // Seed rental_prices with 2026 data if table is empty
    try {
      const count = await db.prepare('SELECT COUNT(*) as cnt FROM rental_prices').first<{ cnt: number }>();
      if (count && count.cnt === 0) {
        const seedData = [
          // Chronologisch 2026 — Woche = Samstag bis Samstag
          ['Standard',                          '2026-01-03', '2026-02-06', 120, 7],
          ['Faschingswoche/Semester Kärnten',    '2026-02-07', '2026-02-20', 129, 7],
          ['Standard',                          '2026-02-21', '2026-04-03', 120, 7],
          ['Schlechte Saison',                  '2026-04-04', '2026-05-01', 100, 3],
          ['Standard',                          '2026-05-02', '2026-10-30', 120, 7],
          ['Schlechte Saison',                  '2026-10-31', '2026-12-11', 100, 3],
          ['Vorweihnachtswoche',                '2026-12-12', '2026-12-18', 114, 7],
          ['Weihnachten',                       '2026-12-19', '2026-12-25', 357, 7],
          ['Silvester',                         '2026-12-26', '2027-01-01', 371, 7],
          // 2027 — gleiche Preise, Samstag-Samstag
          ['Standard',                          '2027-01-02', '2027-02-05', 120, 7],
          ['Faschingswoche/Semester Kärnten',    '2027-02-06', '2027-02-19', 129, 7],
          ['Standard',                          '2027-02-20', '2027-04-02', 120, 7],
          ['Schlechte Saison',                  '2027-04-03', '2027-04-30', 100, 3],
          ['Standard',                          '2027-05-01', '2027-10-29', 120, 7],
          ['Schlechte Saison',                  '2027-10-30', '2027-12-10', 100, 3],
          ['Vorweihnachtswoche',                '2027-12-11', '2027-12-17', 114, 7],
          ['Weihnachten',                       '2027-12-18', '2027-12-24', 357, 7],
          ['Silvester',                         '2027-12-25', '2027-12-31', 371, 7],
        ];
        for (const [name, from, to, price, minStay] of seedData) {
          await db.prepare(
            'INSERT INTO rental_prices (name, date_from, date_to, price_per_night, mindestaufenthalt, aktiv) VALUES (?, ?, ?, ?, ?, 1)'
          ).bind(name, from, to, price, minStay).run();
        }
        migrated.push('rental_prices:seed_2026');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      errors.push(`rental_prices:seed: ${msg}`);
    }

    await createTable(`
      CREATE TABLE IF NOT EXISTS guest_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        token_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (token_id) REFERENCES guest_access_tokens(id) ON DELETE CASCADE
      )
    `, 'guest_sessions');

    return NextResponse.json({
      success: true,
      migrated,
      errors: errors.length > 0 ? errors : undefined,
      message: migrated.length > 0
        ? `${migrated.length} Migrationen durchgeführt`
        : 'Datenbank ist aktuell',
    });
  } catch (error) {
    console.error('Auto-migrate error:', error);
    return NextResponse.json(
      { error: 'Migration fehlgeschlagen', details: String(error) },
      { status: 500 }
    );
  }
}
