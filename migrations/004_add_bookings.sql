-- Migration: Add bookings table for multiple bookings per guest
-- Run with: wrangler d1 execute natbergerhuette-db --file=./migrations/004_add_bookings.sql
-- Or use Admin Panel: Setup & Konfiguration -> Datenbank-Tabellen erstellen

-- Bookings table - stores individual bookings linked to a guest
CREATE TABLE IF NOT EXISTS bookings (
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Add booking_id to guest_tasks (optional - NULL means guest-level task)
ALTER TABLE guest_tasks ADD COLUMN booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE;

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_arrival ON bookings(arrival_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_platform ON bookings(platform);

-- Index for tasks by booking
CREATE INDEX IF NOT EXISTS idx_tasks_booking_id ON guest_tasks(booking_id);
