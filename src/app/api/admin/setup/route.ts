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

// Check if a table exists
async function tableExists(db: D1Database, tableName: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).bind(tableName).first<{ name: string }>();
    return !!result;
  } catch {
    return false;
  }
}

// POST - Handle setup actions
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json(
        { error: 'Database not available', success: false },
        { status: 500 }
      );
    }

    const body = await request.json() as { action: string };
    const { action } = body;

    // Check setup status
    if (action === 'check_setup_status') {
      const guestsTableExists = await tableExists(env.DB, 'guests');
      const emailsTableExists = await tableExists(env.DB, 'emails');
      const bookingsTableExists = await tableExists(env.DB, 'bookings');
      const tasksTableExists = await tableExists(env.DB, 'tasks');
      const notesTableExists = await tableExists(env.DB, 'guest_notes');
      const documentsTableExists = await tableExists(env.DB, 'guest_documents');
      const costsTableExists = await tableExists(env.DB, 'guest_costs');

      return NextResponse.json({
        success: true,
        status: {
          guestsTableExists,
          emailsTableExists,
          bookingsTableExists,
          tasksTableExists,
          notesTableExists,
          documentsTableExists,
          costsTableExists,
          hasData: false, // Will be updated if tables exist
        }
      });
    }

    // Create/migrate tables
    if (action === 'migrate_guests_tables') {
      const results: string[] = [];

      // Guests table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS guests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_number TEXT,
            month TEXT,
            year INTEGER,
            guest_name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT,
            is_returning_guest INTEGER DEFAULT 0,
            is_private INTEGER DEFAULT 0,
            no_nebenkosten INTEGER DEFAULT 0,
            platform TEXT,
            arrival_date TEXT,
            departure_date TEXT,
            adults INTEGER DEFAULT 2,
            children INTEGER DEFAULT 0,
            children_ages TEXT,
            nationality TEXT,
            pets TEXT,
            rental_price REAL DEFAULT 0,
            net_rent REAL,
            cleaning_cash REAL DEFAULT 0,
            additional_costs TEXT,
            ancillary_costs_amount REAL DEFAULT 0,
            final_cleaning TEXT,
            final_cleaning_amount REAL DEFAULT 0,
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
            admin_briefed INTEGER DEFAULT 0,
            status TEXT DEFAULT 'inquiry',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        results.push('guests table created/verified');
      } catch (err) {
        console.error('Error creating guests table:', err);
        results.push('guests table error: ' + String(err));
      }

      // Emails table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER,
            subject TEXT,
            body TEXT,
            from_address TEXT,
            to_address TEXT,
            date_sent TEXT,
            is_incoming INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
          )
        `).run();
        results.push('emails table created/verified');
      } catch (err) {
        console.error('Error creating emails table:', err);
        results.push('emails table error: ' + String(err));
      }

      // Bookings table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER NOT NULL,
            arrival_date TEXT NOT NULL,
            departure_date TEXT NOT NULL,
            adults INTEGER DEFAULT 2,
            children INTEGER DEFAULT 0,
            children_ages TEXT,
            pets TEXT,
            rental_price REAL DEFAULT 0,
            cleaning_fee REAL DEFAULT 0,
            deposit_amount REAL DEFAULT 0,
            deposit_paid INTEGER DEFAULT 0,
            final_payment REAL DEFAULT 0,
            final_payment_paid INTEGER DEFAULT 0,
            status TEXT DEFAULT 'confirmed',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
          )
        `).run();
        results.push('bookings table created/verified');
      } catch (err) {
        console.error('Error creating bookings table:', err);
        results.push('bookings table error: ' + String(err));
      }

      // Tasks table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER,
            booking_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            assignee TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
          )
        `).run();
        results.push('tasks table created/verified');
      } catch (err) {
        console.error('Error creating tasks table:', err);
        results.push('tasks table error: ' + String(err));
      }

      // Guest notes table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS guest_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
          )
        `).run();
        results.push('guest_notes table created/verified');
      } catch (err) {
        console.error('Error creating guest_notes table:', err);
        results.push('guest_notes table error: ' + String(err));
      }

      // Guest documents table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS guest_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            r2_key TEXT NOT NULL,
            content_type TEXT,
            size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
          )
        `).run();
        results.push('guest_documents table created/verified');
      } catch (err) {
        console.error('Error creating guest_documents table:', err);
        results.push('guest_documents table error: ' + String(err));
      }

      // Guest costs table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS guest_costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER NOT NULL,
            booking_id INTEGER,
            cost_type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
          )
        `).run();
        results.push('guest_costs table created/verified');
      } catch (err) {
        console.error('Error creating guest_costs table:', err);
        results.push('guest_costs table error: ' + String(err));
      }

      // Admin sessions table
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS admin_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL
          )
        `).run();
        results.push('admin_sessions table created/verified');
      } catch (err) {
        console.error('Error creating admin_sessions table:', err);
        results.push('admin_sessions table error: ' + String(err));
      }

      // Create indexes
      try {
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_guests_arrival ON guests(arrival_date)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(arrival_date, departure_date)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_guest ON tasks(guest_id)').run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_emails_guest ON emails(guest_id)').run();
        results.push('indexes created/verified');
      } catch (err) {
        console.error('Error creating indexes:', err);
        results.push('indexes error: ' + String(err));
      }

      return NextResponse.json({
        success: true,
        message: `Migration complete: ${results.length} operations`,
        results
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', success: false },
      { status: 400 }
    );
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed', success: false },
      { status: 500 }
    );
  }
}

// GET - Simple status check
export async function GET() {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ available: false, error: 'Database not available' });
    }

    const guestsTableExists = await tableExists(env.DB, 'guests');

    return NextResponse.json({
      available: true,
      guestsTableExists
    });
  } catch (error) {
    console.error('Setup GET error:', error);
    return NextResponse.json({ available: false, error: 'Check failed' });
  }
}
