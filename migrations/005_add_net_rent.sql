-- Migration: Add net_rent column for FeWo commission calculation
-- Net rent = Raten pro Nacht - Rabatt + Verwaltungsgebühr
-- This is used as basis for 10% commission on FeWo/Vrbo bookings

ALTER TABLE guests ADD COLUMN net_rent REAL DEFAULT NULL;
