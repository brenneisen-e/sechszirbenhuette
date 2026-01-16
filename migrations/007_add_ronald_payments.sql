-- Migration: Add ronald_payments table for tracking deposits from Ronald
-- Payments can be linked to a booking (guest_id) or marked as unknown (?)

CREATE TABLE IF NOT EXISTS ronald_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER, -- NULL if unknown booking (?)
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  notes TEXT,
  is_unknown_booking INTEGER DEFAULT 0, -- 1 if marked with ? (unknown which booking)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ronald_payments_guest ON ronald_payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_ronald_payments_date ON ronald_payments(payment_date);
