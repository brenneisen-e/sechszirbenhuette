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

interface ExpenseRecord {
  id: number;
  year: number;
  month: number;
  category: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseCategory {
  id: number;
  name: string;
  display_order: number;
  created_at: string;
}

// Default 2025 expense data to auto-populate
const DEFAULT_2025_EXPENSES = [
  // Umsatzsteuer
  { month: 1, category: 'Umsatzsteuer', amount: 512.93 },
  { month: 2, category: 'Umsatzsteuer', amount: 1219.29 },
  { month: 3, category: 'Umsatzsteuer', amount: 865.00 },
  { month: 4, category: 'Umsatzsteuer', amount: 128.28 },
  { month: 5, category: 'Umsatzsteuer', amount: 56.70 },
  { month: 10, category: 'Umsatzsteuer', amount: 30.58 },
  { month: 12, category: 'Umsatzsteuer', amount: 594.00 },
  // Strom
  { month: 1, category: 'Strom', amount: 180.00 },
  { month: 2, category: 'Strom', amount: 180.00 },
  { month: 3, category: 'Strom', amount: 180.00 },
  { month: 4, category: 'Strom', amount: 483.77 },
  { month: 5, category: 'Strom', amount: 225.00 },
  { month: 6, category: 'Strom', amount: 225.00 },
  { month: 7, category: 'Strom', amount: 225.00 },
  { month: 8, category: 'Strom', amount: 225.00 },
  { month: 9, category: 'Strom', amount: 225.00 },
  { month: 10, category: 'Strom', amount: 225.00 },
  { month: 11, category: 'Strom', amount: 225.00 },
  { month: 12, category: 'Strom', amount: 225.00 },
  // Wasser/Kanal
  { month: 2, category: 'Wasser/Kanal', amount: 138.32 },
  { month: 4, category: 'Wasser/Kanal', amount: 402.32 },
  { month: 5, category: 'Wasser/Kanal', amount: 641.00 },
  { month: 6, category: 'Wasser/Kanal', amount: 103.34 },
  { month: 8, category: 'Wasser/Kanal', amount: 83.04 },
  { month: 9, category: 'Wasser/Kanal', amount: 136.94 },
  { month: 10, category: 'Wasser/Kanal', amount: 129.90 },
  // Ortstaxe
  { month: 1, category: 'Ortstaxe', amount: 97.20 },
  { month: 2, category: 'Ortstaxe', amount: 224.10 },
  { month: 3, category: 'Ortstaxe', amount: 186.30 },
  { month: 4, category: 'Ortstaxe', amount: 37.80 },
  { month: 7, category: 'Ortstaxe', amount: 72.90 },
  { month: 8, category: 'Ortstaxe', amount: 318.60 },
  { month: 9, category: 'Ortstaxe', amount: 151.20 },
  { month: 10, category: 'Ortstaxe', amount: 59.40 },
  { month: 11, category: 'Ortstaxe', amount: 54.00 },
  { month: 12, category: 'Ortstaxe', amount: 0.00 },
  // Manuela
  { month: 3, category: 'Manuela', amount: 1006.39 },
  { month: 6, category: 'Manuela', amount: 335.10 },
  { month: 9, category: 'Manuela', amount: 792.34 },
  { month: 12, category: 'Manuela', amount: 100.00 },
  // Telefon
  { month: 1, category: 'Telefon', amount: 228.68 },
  { month: 2, category: 'Telefon', amount: 223.38 },
  { month: 3, category: 'Telefon', amount: 244.91 },
  { month: 4, category: 'Telefon', amount: 223.38 },
  { month: 5, category: 'Telefon', amount: 223.38 },
  { month: 6, category: 'Telefon', amount: 238.10 },
  { month: 7, category: 'Telefon', amount: 223.38 },
  { month: 8, category: 'Telefon', amount: 223.38 },
  { month: 9, category: 'Telefon', amount: 240.89 },
  { month: 10, category: 'Telefon', amount: 223.38 },
  { month: 11, category: 'Telefon', amount: 223.38 },
  { month: 12, category: 'Telefon', amount: 240.89 },
];

// Default expense categories
const DEFAULT_CATEGORIES = [
  { name: 'Umsatzsteuer', display_order: 1 },
  { name: 'Versicherung', display_order: 2 },
  { name: 'Strom', display_order: 3 },
  { name: 'Wasser/Kanal', display_order: 4 },
  { name: 'Holz', display_order: 5 },
  { name: 'Ortstaxe', display_order: 6 },
  { name: 'Manuela', display_order: 7 },
  { name: 'Malte & Eike (Provision)', display_order: 8 },
  { name: 'Telefon', display_order: 9 },
];

// Helper function to ensure tables exist
async function ensureTablesExist(db: D1Database) {
  // Create expenses table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create expense_categories table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create indexes
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_expenses_year_month ON expenses(year, month)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)').run();
}

// Helper function to auto-populate default categories
async function ensureDefaultCategories(db: D1Database) {
  const { results: existingCategories } = await db.prepare(
    'SELECT name FROM expense_categories'
  ).all<{ name: string }>();

  const existingNames = new Set(existingCategories?.map(c => c.name) || []);

  for (const cat of DEFAULT_CATEGORIES) {
    if (!existingNames.has(cat.name)) {
      await db.prepare(
        'INSERT INTO expense_categories (name, display_order) VALUES (?, ?)'
      ).bind(cat.name, cat.display_order).run();
    }
  }
}

// Helper function to auto-populate default expenses for a given year
async function ensureDefaultExpenses(db: D1Database, year: number) {
  // Check if any expenses exist for this year
  const { results: existingExpenses } = await db.prepare(
    'SELECT COUNT(*) as count FROM expenses WHERE year = ?'
  ).bind(year).all<{ count: number }>();

  const count = existingExpenses?.[0]?.count || 0;

  // If no expenses exist for this year, auto-populate them
  if (count === 0) {
    for (const expense of DEFAULT_2025_EXPENSES) {
      await db.prepare(
        'INSERT OR IGNORE INTO expenses (year, month, category, amount) VALUES (?, ?, ?, ?)'
      ).bind(year, expense.month, expense.category, expense.amount).run();
    }
  }
}

// GET - Fetch expenses (optionally filtered by year)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({
        error: 'D1 Database binding not configured.',
        expenses: [],
        categories: []
      }, { status: 500 });
    }

    const year = searchParams.get('year');
    const categoriesOnly = searchParams.get('categories');

    // Ensure tables exist first
    await ensureTablesExist(env.DB);

    // Auto-populate default categories if needed
    await ensureDefaultCategories(env.DB);

    // Auto-populate default expenses for 2025 and 2026 (or requested year)
    const yearNum = year ? parseInt(year) : null;
    if (yearNum && (yearNum === 2025 || yearNum === 2026)) {
      await ensureDefaultExpenses(env.DB, yearNum);
    }

    // Fetch categories
    const { results: categories } = await env.DB.prepare(
      'SELECT * FROM expense_categories ORDER BY display_order ASC'
    ).all<ExpenseCategory>();

    if (categoriesOnly === 'true') {
      return NextResponse.json({ categories: categories || [] });
    }

    // Fetch expenses
    let query = 'SELECT * FROM expenses';
    const params: (string | number)[] = [];

    if (year) {
      query += ' WHERE year = ?';
      params.push(parseInt(year));
    }

    query += ' ORDER BY year DESC, month ASC, category ASC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const { results: expenses } = await stmt.all<ExpenseRecord>();

    return NextResponse.json({
      expenses: expenses || [],
      categories: categories || []
    });
  } catch (error) {
    console.error('GET /api/admin/expenses error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, expenses: [], categories: [] }, { status: 500 });
  }
}

// POST - Create or update expense
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

    const body = await request.json() as {
      id?: number;
      year: number;
      month: number;
      category: string;
      amount: number;
      notes?: string;
    };

    const { id, year, month, category, amount, notes } = body;

    if (!year || !month || !category) {
      return NextResponse.json({ error: 'year, month, and category are required' }, { status: 400 });
    }

    if (id) {
      // Update existing expense
      await env.DB.prepare(
        `UPDATE expenses SET year = ?, month = ?, category = ?, amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(year, month, category, amount || 0, notes || null, id).run();

      return NextResponse.json({ success: true, id });
    } else {
      // Check if expense already exists for this year/month/category
      const existing = await env.DB.prepare(
        'SELECT id FROM expenses WHERE year = ? AND month = ? AND category = ?'
      ).bind(year, month, category).first<{ id: number }>();

      if (existing) {
        // Update existing
        await env.DB.prepare(
          `UPDATE expenses SET amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(amount || 0, notes || null, existing.id).run();

        return NextResponse.json({ success: true, id: existing.id });
      } else {
        // Create new expense
        const result = await env.DB.prepare(
          `INSERT INTO expenses (year, month, category, amount, notes) VALUES (?, ?, ?, ?, ?)`
        ).bind(year, month, category, amount || 0, notes || null).run();

        return NextResponse.json({ success: true, id: result.meta.last_row_id });
      }
    }
  } catch (error) {
    console.error('POST /api/admin/expenses error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Add new category
export async function PUT(request: NextRequest) {
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

    const body = await request.json() as { name: string };
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Get max display_order
    const maxOrder = await env.DB.prepare(
      'SELECT MAX(display_order) as max_order FROM expense_categories'
    ).first<{ max_order: number }>();

    const newOrder = (maxOrder?.max_order || 0) + 1;

    const result = await env.DB.prepare(
      'INSERT INTO expense_categories (name, display_order) VALUES (?, ?)'
    ).bind(name, newOrder).run();

    return NextResponse.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('PUT /api/admin/expenses error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete expense or category
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);

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

    const expenseId = searchParams.get('id');
    const categoryId = searchParams.get('categoryId');

    if (categoryId) {
      // Delete category and all associated expenses
      const category = await env.DB.prepare(
        'SELECT name FROM expense_categories WHERE id = ?'
      ).bind(categoryId).first<{ name: string }>();

      if (category) {
        await env.DB.prepare('DELETE FROM expenses WHERE category = ?').bind(category.name).run();
        await env.DB.prepare('DELETE FROM expense_categories WHERE id = ?').bind(categoryId).run();
      }

      return NextResponse.json({ success: true });
    }

    if (expenseId) {
      await env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(expenseId).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or categoryId is required' }, { status: 400 });
  } catch (error) {
    console.error('DELETE /api/admin/expenses error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
