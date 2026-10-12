// Kerntabellen der Gästedatenbank (guests, bookings) sicherstellen.
//
// Die Auto-Migration hat diese Tabellen früher nie selbst angelegt, sondern
// nur Spalten ergänzt. Auf einer Datenbank, in der sie fehlen oder mit einem
// anderen Aufbau existieren, schlug dadurch jede Übernahme fehl
// („no such column: booking_number“). Hier gilt:
// - Tabelle fehlt → nach db/schema.sql anlegen.
// - Tabelle existiert, aber Kernspalten fehlen → leer: neu anlegen;
//   mit Daten: in <name>_legacy_<zeitstempel> umbenennen (nichts geht
//   verloren) und neu anlegen.

const GUESTS_SQL = `CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_number TEXT,
  month TEXT,
  year INTEGER,
  guest_name TEXT NOT NULL,
  nationality TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_returning_guest INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  no_nebenkosten INTEGER DEFAULT 0,
  platform TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  adults INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  children_ages TEXT,
  pets TEXT,
  rental_price REAL DEFAULT 0,
  net_rent REAL DEFAULT NULL,
  ancillary_costs_amount REAL DEFAULT 0,
  final_cleaning_amount REAL DEFAULT 0,
  additional_costs TEXT,
  final_cleaning TEXT,
  other_notes TEXT,
  first_contact_date TEXT,
  offer_sent INTEGER DEFAULT 0,
  contract_sent INTEGER DEFAULT 0,
  welcome_guide_sent INTEGER DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  deposit_paid INTEGER DEFAULT 0,
  final_payment REAL DEFAULT 0,
  final_payment_paid INTEGER DEFAULT 0,
  electricity_flat REAL DEFAULT 0,
  additional_payment REAL DEFAULT 0,
  security_deposit REAL DEFAULT 0,
  cleaning_cash REAL DEFAULT 0,
  utilities_cash REAL DEFAULT 0,
  admin_briefed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

const BOOKINGS_SQL = `CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  booking_number TEXT,
  platform TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  pets TEXT,
  rental_price REAL DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  deposit_paid INTEGER DEFAULT 0,
  final_payment REAL DEFAULT 0,
  final_payment_paid INTEGER DEFAULT 0,
  electricity_flat REAL DEFAULT 0,
  additional_payment REAL DEFAULT 0,
  security_deposit REAL DEFAULT 0,
  additional_costs TEXT,
  final_cleaning TEXT,
  first_contact_date TEXT,
  offer_sent INTEGER DEFAULT 0,
  contract_sent INTEGER DEFAULT 0,
  welcome_guide_sent INTEGER DEFAULT 0,
  admin_briefed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  cleaning_cash REAL DEFAULT 0,
  utilities_cash REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);`;

interface CoreDb {
  prepare(query: string): {
    run(): Promise<unknown>;
    all<T>(): Promise<{ results?: T[] }>;
    first<T>(): Promise<T | null>;
  };
}

const CORE_TABLES: Array<{ name: string; sql: string; required: string[] }> = [
  { name: 'guests', sql: GUESTS_SQL, required: ['id', 'guest_name', 'email', 'phone', 'status'] },
  {
    name: 'bookings',
    sql: BOOKINGS_SQL,
    required: [
      'id',
      'guest_id',
      'booking_number',
      'platform',
      'arrival_date',
      'departure_date',
      'status',
    ],
  },
];

// Pro Worker-Instanz genügt ein erfolgreicher Durchlauf
let verified = false;

export async function ensureCoreTables(db: CoreDb): Promise<string[]> {
  if (verified) return [];
  const actions: string[] = [];
  for (const table of CORE_TABLES) {
    const info = await db.prepare(`PRAGMA table_info(${table.name})`).all<{ name: string }>();
    const columns = new Set((info.results || []).map((c) => c.name));
    if (columns.size === 0) {
      await db.prepare(table.sql).run();
      actions.push(`table:${table.name}:created`);
      continue;
    }
    const missing = table.required.filter((c) => !columns.has(c));
    if (missing.length === 0) continue;

    const count = await db
      .prepare(`SELECT COUNT(*) AS cnt FROM ${table.name}`)
      .first<{ cnt: number }>();
    if ((count?.cnt || 0) === 0) {
      await db.prepare(`DROP TABLE ${table.name}`).run();
      actions.push(`table:${table.name}:recreated (leer, fehlte: ${missing.join(',')})`);
    } else {
      const legacy = `${table.name}_legacy_${Date.now()}`;
      await db.prepare(`ALTER TABLE ${table.name} RENAME TO ${legacy}`).run();
      actions.push(`table:${table.name}:renamed to ${legacy} (fehlte: ${missing.join(',')})`);
    }
    await db.prepare(table.sql).run();
  }
  verified = true;
  return actions;
}
