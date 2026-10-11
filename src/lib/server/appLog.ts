// Protokoll für Hintergrundvorgänge (Beds24-Webhook, Buchungsschluss, E-Mail).
// Einsehbar im Admin Center unter System → Logs.

// Strukturelles Minimum einer D1-Datenbank: manche Routen arbeiten mit einer
// eigenen, abgespeckten D1-Typdeklaration — beide passen hier hinein.
interface LogPreparedStatement {
  bind(...values: unknown[]): LogPreparedStatement;
  run(): Promise<unknown>;
}

export interface LogDatabase {
  prepare(query: string): LogPreparedStatement;
}

export const APP_LOGS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS app_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL,
  action TEXT,
  message TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`;

// Der Webhook läuft unabhängig vom Admin Center, das die Auto-Migration
// anstößt — die Tabelle wird deshalb beim ersten Schreiben pro Worker-Instanz
// sichergestellt.
let tableVerified = false;

export async function ensureAppLogsTable(db: LogDatabase): Promise<void> {
  if (tableVerified) return;
  await db.prepare(APP_LOGS_TABLE_SQL).run();
  tableVerified = true;
}

export async function writeAppLog(
  db: LogDatabase | null,
  level: string,
  source: string,
  action: string,
  message: string,
  details?: string,
): Promise<void> {
  if (!db) return;
  try {
    await ensureAppLogsTable(db);
    await db
      .prepare(
        'INSERT INTO app_logs (level, source, action, message, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(level, source, action, message, details || null, new Date().toISOString())
      .run();
  } catch {
    // Logging ist optional — ein Fehler hier darf nichts blockieren
  }
}
