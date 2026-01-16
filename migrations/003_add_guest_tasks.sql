-- Migration: Add guest_tasks table
-- Run with: wrangler d1 execute natbergerhuette-db --file=./migrations/003_add_guest_tasks.sql
-- Or use Admin Panel: Setup & Konfiguration -> Datenbank-Tabellen erstellen

-- Guest tasks table for managing tasks per guest
CREATE TABLE IF NOT EXISTS guest_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  is_completed INTEGER DEFAULT 0,
  due_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Indexes for guest_tasks
CREATE INDEX IF NOT EXISTS idx_tasks_guest_id ON guest_tasks(guest_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON guest_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON guest_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON guest_tasks(is_completed);
