-- Migration: Add guests and emails tables
-- Run with: wrangler d1 execute natbergerhuette-db --file=./migrations/002_add_guests.sql

-- Guests table
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
  platform TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  adults INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  pets TEXT,
  rental_price REAL DEFAULT 0,
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
  admin_briefed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emails table for storing fetched emails
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE,
  guest_id INTEGER,
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  date_sent DATETIME,
  is_incoming INTEGER DEFAULT 1,
  is_read INTEGER DEFAULT 0,
  folder TEXT DEFAULT 'INBOX',
  raw_headers TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL
);

-- Indexes for guests
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(guest_name);
CREATE INDEX IF NOT EXISTS idx_guests_arrival ON guests(arrival_date);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_year ON guests(year);

-- Indexes for emails
CREATE INDEX IF NOT EXISTS idx_emails_guest_id ON emails(guest_id);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_address);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date_sent);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- Email sync status table to track IMAP sync progress
CREATE TABLE IF NOT EXISTS email_sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder TEXT NOT NULL UNIQUE,
  last_uid INTEGER DEFAULT 0,
  last_sync DATETIME,
  total_emails INTEGER DEFAULT 0
);
