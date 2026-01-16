-- Add is_private and no_nebenkosten columns to guests table
-- is_private: marks private bookings (not through portals)
-- no_nebenkosten: excludes guest from ancillary cost calculations

ALTER TABLE guests ADD COLUMN is_private INTEGER DEFAULT 0;
ALTER TABLE guests ADD COLUMN no_nebenkosten INTEGER DEFAULT 0;
