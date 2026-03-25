-- Migration: Add guest app tables
-- Guest app categories (e.g. "Rund um den Check-In", "Rund um die Reise")
CREATE TABLE IF NOT EXISTS guest_app_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  icon TEXT DEFAULT 'info',
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guest app info cards within categories
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
);

-- Guest access tokens for guest app login
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
);

-- Guest app sessions
CREATE TABLE IF NOT EXISTS guest_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  token_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES guest_access_tokens(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_app_cards_category ON guest_app_cards(category_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_tokens_booking ON guest_access_tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_tokens_code ON guest_access_tokens(access_code);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_id ON guest_sessions(session_id);
