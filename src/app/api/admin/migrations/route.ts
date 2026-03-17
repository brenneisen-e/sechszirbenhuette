import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface MigrationRecord {
  id: string;
  version: number;
  name: string;
  description: string | null;
  executed_at: string;
  status: string;
}

// Migration definitions - each migration has an id, SQL statements, and metadata
interface MigrationDef {
  id: string;
  version: number;
  name: string;
  description: string;
  statements: string[];
}

const MIGRATIONS: MigrationDef[] = [
  {
    id: '013_add_migrations_table',
    version: 13,
    name: 'Migrations-Tabelle erstellen',
    description: 'Erstellt die migrations Tracking-Tabelle',
    statements: [
      `CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        executed_at TEXT DEFAULT (datetime('now')),
        status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'rolled_back'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version)`,
      `CREATE INDEX IF NOT EXISTS idx_migrations_status ON migrations(status)`,
    ],
  },
  {
    id: '014_add_booking_positions',
    version: 14,
    name: 'Positions-Tabelle erstellen',
    description: 'Erstellt die booking_positions Tabelle für das dynamische Positionssystem',
    statements: [
      `CREATE TABLE IF NOT EXISTS booking_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'custom' CHECK(category IN ('nk', 'reinigung', 'kurtaxe', 'komfortpaket', 'gebuehr', 'custom')),
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        amount REAL NOT NULL DEFAULT 0,
        paid_by TEXT NOT NULL DEFAULT 'guest_platform' CHECK(paid_by IN ('guest_platform', 'guest_cash', 'guest_direct', 'owner', 'included_payout')),
        paid INTEGER DEFAULT 0,
        affects_mieterlos INTEGER DEFAULT 0,
        affects_gewinn INTEGER DEFAULT 1,
        show_separate INTEGER DEFAULT 0,
        auto_calculate INTEGER DEFAULT 0,
        calc_rule TEXT DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        notes TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_booking_positions_booking_id ON booking_positions(booking_id)`,
      `CREATE INDEX IF NOT EXISTS idx_booking_positions_category ON booking_positions(category)`,
      `CREATE INDEX IF NOT EXISTS idx_booking_positions_type ON booking_positions(type)`,
    ],
  },
  {
    id: '015_add_position_templates',
    version: 15,
    name: 'Position-Templates erstellen',
    description: 'Erstellt Vorlagen für Standard-Positionen (NK, Kurtaxe, Reinigung etc.)',
    statements: [
      `CREATE TABLE IF NOT EXISTS position_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'custom' CHECK(category IN ('nk', 'reinigung', 'kurtaxe', 'komfortpaket', 'gebuehr', 'custom')),
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        default_amount REAL DEFAULT 0,
        default_paid_by TEXT DEFAULT 'guest_platform' CHECK(default_paid_by IN ('guest_platform', 'guest_cash', 'guest_direct', 'owner', 'included_payout')),
        affects_mieterlos INTEGER DEFAULT 0,
        affects_gewinn INTEGER DEFAULT 1,
        show_separate INTEGER DEFAULT 0,
        auto_calculate INTEGER DEFAULT 0,
        calc_rule TEXT DEFAULT NULL,
        applies_to_platforms TEXT DEFAULT NULL,
        is_default INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      // Standard templates
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('NK Strom', 'nk', 'expense', 0, 'guest_platform', 0, 1, 0, 1, '{"type":"nk_strom","params":{}}', 1, 1)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('NK Wasser', 'nk', 'expense', 0, 'guest_platform', 0, 1, 0, 1, '{"type":"nk_wasser","params":{}}', 1, 2)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('NK Müll', 'nk', 'expense', 0, 'guest_platform', 0, 1, 0, 1, '{"type":"nk_muell","params":{}}', 1, 3)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('NK Holz', 'nk', 'expense', 0, 'guest_platform', 0, 1, 0, 1, '{"type":"nk_holz","params":{}}', 1, 4)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('Kurtaxe', 'kurtaxe', 'expense', 0, 'guest_platform', 0, 1, 1, 1, '{"type":"kurtaxe","params":{"minAge":16}}', 1, 5)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('Reinigung', 'reinigung', 'expense', 0, 'guest_platform', 0, 1, 1, 1, '{"type":"reinigung","params":{"base":100,"dogSurcharge":25}}', 1, 6)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('Komfortpaket (Einnahme)', 'komfortpaket', 'income', 0, 'guest_cash', 0, 1, 1, 1, '{"type":"komfortpaket_income","params":{"pricePerPerson":25}}', 0, 7)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('Komfortpaket (Kosten)', 'komfortpaket', 'expense', 0, 'owner', 0, 1, 0, 1, '{"type":"komfortpaket_cost","params":{"costPerPerson":16}}', 0, 8)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('Plattform Service Fee', 'gebuehr', 'expense', 0, 'guest_platform', 0, 1, 0, 0, NULL, 0, 9)`,
      `INSERT OR IGNORE INTO position_templates (name, category, type, default_amount, default_paid_by, affects_mieterlos, affects_gewinn, show_separate, auto_calculate, calc_rule, is_default, sort_order) VALUES
        ('Zahlungsgebühr', 'gebuehr', 'expense', 0, 'guest_platform', 1, 1, 0, 0, NULL, 0, 10)`,
    ],
  },
  {
    id: '016_add_kurtaxe_rates',
    version: 16,
    name: 'Kurtaxe-Sätze erstellen',
    description: 'Erstellt die kurtaxe_rates Tabelle mit den aktuellen Ortstaxe-Sätzen',
    statements: [
      `CREATE TABLE IF NOT EXISTS kurtaxe_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        valid_from TEXT NOT NULL,
        valid_to TEXT DEFAULT NULL,
        rate_per_person_per_day REAL NOT NULL,
        min_age INTEGER DEFAULT 16,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_kurtaxe_rates_dates ON kurtaxe_rates(valid_from, valid_to)`,
      `INSERT INTO kurtaxe_rates (valid_from, valid_to, rate_per_person_per_day, min_age) VALUES ('2024-01-01', '2025-12-31', 2.70, 16)`,
      `INSERT INTO kurtaxe_rates (valid_from, valid_to, rate_per_person_per_day, min_age) VALUES ('2026-01-01', NULL, 2.70, 16)`,
    ],
  },
  {
    id: '017_add_payout_tracking',
    version: 17,
    name: 'Payout-Tracking erstellen',
    description: 'Erstellt die payout_tracking Tabelle für Zahlungseingangs-Tracking',
    statements: [
      `CREATE TABLE IF NOT EXISTS payout_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        expected_date TEXT,
        expected_amount REAL,
        received INTEGER DEFAULT 0,
        received_date TEXT DEFAULT NULL,
        payment_type TEXT DEFAULT 'payout' CHECK(payment_type IN ('payout', 'anzahlung', 'restzahlung', 'direct_transfer')),
        notes TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_payout_tracking_booking ON payout_tracking(booking_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payout_tracking_date ON payout_tracking(expected_date)`,
      `CREATE INDEX IF NOT EXISTS idx_payout_tracking_received ON payout_tracking(received)`,
    ],
  },
  {
    id: '018_add_briefing_notes',
    version: 18,
    name: 'Briefing-Hinweise',
    description: 'Fügt das Feld briefing_notes zur Buchungstabelle hinzu',
    statements: [
      `ALTER TABLE bookings ADD COLUMN briefing_notes TEXT DEFAULT NULL`,
    ],
  },
  {
    id: '019_add_position_categories',
    version: 19,
    name: 'Position-Kategorien erstellen',
    description: 'Erstellt die position_categories Tabelle für dynamische Kategorieverwaltung',
    statements: [
      `CREATE TABLE IF NOT EXISTS position_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT NULL,
        color TEXT DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      `INSERT OR IGNORE INTO position_categories (name, slug, icon, sort_order) VALUES ('Nebenkosten', 'nk', 'zap', 1)`,
      `INSERT OR IGNORE INTO position_categories (name, slug, icon, sort_order) VALUES ('Reinigung', 'reinigung', 'sparkles', 2)`,
      `INSERT OR IGNORE INTO position_categories (name, slug, icon, sort_order) VALUES ('Kurtaxe', 'kurtaxe', 'file-text', 3)`,
      `INSERT OR IGNORE INTO position_categories (name, slug, icon, sort_order) VALUES ('Komfortpaket', 'komfortpaket', 'package', 4)`,
      `INSERT OR IGNORE INTO position_categories (name, slug, icon, sort_order) VALUES ('Gebühren', 'gebuehr', 'credit-card', 5)`,
      `INSERT OR IGNORE INTO position_categories (name, slug, icon, sort_order) VALUES ('Sonstige', 'custom', 'plus-circle', 6)`,
    ],
  },
  {
    id: '020_add_booking_private_config',
    version: 20,
    name: 'Privatbuchungs-Konfiguration',
    description: 'Verschiebt is_private auf Buchungsebene mit granularer Konfiguration (Miete, NK, Kurtaxe, Provision)',
    statements: [
      `ALTER TABLE bookings ADD COLUMN is_private INTEGER DEFAULT 0`,
      `ALTER TABLE bookings ADD COLUMN private_config TEXT`,
      `UPDATE bookings SET is_private = 1 WHERE guest_id IN (SELECT id FROM guests WHERE is_private = 1)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_is_private ON bookings(is_private)`,
    ],
  },
  {
    id: '021_add_cash_payment_columns',
    version: 21,
    name: 'Barzahlungs-Felder',
    description: 'Fügt cleaning_cash und utilities_cash Felder zu bookings hinzu (Bar-Zahlungen für Reinigung und NK)',
    statements: [
      `ALTER TABLE bookings ADD COLUMN cleaning_cash INTEGER DEFAULT 0`,
      `ALTER TABLE bookings ADD COLUMN utilities_cash INTEGER DEFAULT 0`,
    ],
  },
  {
    id: '024_add_briefing_fields',
    version: 24,
    name: 'Briefing-Felder',
    description: 'Fügt preferred_language, early_checkin, late_checkout zu bookings hinzu',
    statements: [
      `ALTER TABLE bookings ADD COLUMN preferred_language TEXT DEFAULT NULL`,
      `ALTER TABLE bookings ADD COLUMN early_checkin TEXT DEFAULT NULL`,
      `ALTER TABLE bookings ADD COLUMN late_checkout TEXT DEFAULT NULL`,
    ],
  },
  {
    id: '023_fix_fewo_kurtaxe_mapping',
    version: 23,
    name: 'FeWo Kurtaxe-Mapping korrigieren',
    description: 'Verschiebt direct_breakdown.muell → kurtaxe für FeWo-Buchungen (Verwaltungsgebühr = Kurtaxe)',
    statements: [
      `UPDATE bookings
       SET additional_costs = json_set(
         json_remove(additional_costs, '$.direct_breakdown.muell'),
         '$.direct_breakdown.kurtaxe', json_extract(additional_costs, '$.direct_breakdown.muell'),
         '$.kurtaxe_income', json_extract(additional_costs, '$.direct_breakdown.muell'),
         '$.nebenkosten_income',
           COALESCE(json_extract(additional_costs, '$.nebenkosten_income'), 0)
           - COALESCE(json_extract(additional_costs, '$.direct_breakdown.muell'), 0)
       )
       WHERE platform = 'FeWo-direkt'
       AND additional_costs IS NOT NULL
       AND json_extract(additional_costs, '$.direct_breakdown.muell') IS NOT NULL
       AND json_extract(additional_costs, '$.direct_breakdown.muell') > 0`,
    ],
  },
  {
    id: '025_update_kurtaxe_rate_nov2026',
    version: 25,
    name: 'Kurtaxe-Erhöhung Nov 2026',
    description: 'Kurtaxe steigt zum 01.11.2026 von 2,70 EUR auf 4,50 EUR pro Person/Nacht',
    statements: [
      `UPDATE kurtaxe_rates SET valid_to = '2026-10-31', updated_at = datetime('now')
       WHERE valid_from = '2026-01-01' AND valid_to IS NULL AND rate_per_person_per_day = 2.70`,
      `INSERT INTO kurtaxe_rates (valid_from, valid_to, rate_per_person_per_day, min_age) VALUES
       ('2026-11-01', NULL, 4.50, 16)`,
    ],
  },
];

// Check if migrations table exists
async function ensureMigrationsTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      executed_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'completed'
    )
  `).run();
}

// Check if a migration has been executed
async function isMigrationExecuted(db: D1Database, migrationId: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      'SELECT id FROM migrations WHERE id = ? AND status = ?'
    ).bind(migrationId, 'completed').first();
    return !!result;
  } catch {
    return false;
  }
}

// Check if a table exists
async function tableExists(db: D1Database, tableName: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).bind(tableName).first();
    return !!result;
  } catch {
    return false;
  }
}

// GET - List all migrations and their status
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const expectedPassword = getAdminPassword(env);

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    await ensureMigrationsTable(env.DB);

    // Get executed migrations
    const { results: executed } = await env.DB.prepare(
      'SELECT * FROM migrations ORDER BY version ASC'
    ).all<MigrationRecord>();

    const executedMap = new Map<string, MigrationRecord>();
    for (const m of executed || []) {
      executedMap.set(m.id, m);
    }

    // Build migration list with status
    const migrations = MIGRATIONS.map(def => {
      const record = executedMap.get(def.id);
      return {
        id: def.id,
        version: def.version,
        name: def.name,
        description: def.description,
        status: record?.status || 'pending',
        executed_at: record?.executed_at || null,
      };
    });

    // Also include old migrations (001-012) from the records
    const oldMigrations = (executed || [])
      .filter(m => !MIGRATIONS.some(def => def.id === m.id))
      .map(m => ({
        id: m.id,
        version: m.version,
        name: m.name,
        description: m.description,
        status: m.status,
        executed_at: m.executed_at,
      }));

    const pendingCount = migrations.filter(m => m.status === 'pending').length;
    const currentVersion = Math.max(
      ...(executed || []).filter(m => m.status === 'completed').map(m => m.version),
      0
    );

    return NextResponse.json({
      currentVersion,
      pendingCount,
      migrations: [...oldMigrations, ...migrations].sort((a, b) => a.version - b.version),
    });
  } catch (error) {
    console.error('GET /api/admin/migrations error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Run migrations
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    await ensureMigrationsTable(env.DB);

    const body = await request.json() as { migrationId?: string };
    const { migrationId } = body;

    const results: Array<{ id: string; status: string; error?: string }> = [];

    // Run specific migration or all pending
    const migrationsToRun = migrationId
      ? MIGRATIONS.filter(m => m.id === migrationId)
      : MIGRATIONS;

    for (const migration of migrationsToRun) {
      // Skip if already executed
      const executed = await isMigrationExecuted(env.DB, migration.id);
      if (executed) {
        results.push({ id: migration.id, status: 'already_completed' });
        continue;
      }

      // Special check: skip booking_positions if table exists but migration not tracked
      if (migration.id === '014_add_booking_positions') {
        const exists = await tableExists(env.DB, 'booking_positions');
        if (exists) {
          // Table exists but not tracked - mark as completed
          await db_registerMigration(env.DB, migration);
          results.push({ id: migration.id, status: 'completed' });
          continue;
        }
      }

      try {
        // Execute all statements
        for (const sql of migration.statements) {
          await env.DB.prepare(sql).run();
        }

        // Register migration as completed
        await db_registerMigration(env.DB, migration);

        results.push({ id: migration.id, status: 'completed' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if error is "duplicate column" (for ALTER TABLE) - treat as success
        if (errorMessage.includes('duplicate column name') || errorMessage.includes('already exists')) {
          await db_registerMigration(env.DB, migration);
          results.push({ id: migration.id, status: 'completed' });
          continue;
        }

        // Record failure
        try {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO migrations (id, version, name, description, status, executed_at)
             VALUES (?, ?, ?, ?, 'failed', datetime('now'))`
          ).bind(migration.id, migration.version, migration.name, migration.description).run();
        } catch { /* ignore */ }

        results.push({ id: migration.id, status: 'failed', error: errorMessage });
        // Stop on failure if running all
        if (!migrationId) break;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('POST /api/admin/migrations error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function db_registerMigration(db: D1Database, migration: MigrationDef) {
  await db.prepare(
    `INSERT OR REPLACE INTO migrations (id, version, name, description, status, executed_at)
     VALUES (?, ?, ?, ?, 'completed', datetime('now'))`
  ).bind(migration.id, migration.version, migration.name, migration.description).run();
}
