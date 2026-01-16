-- Migration: Add numeric fields for ancillary costs (Nebenkosten) and final cleaning (Endreinigung)
-- Run with: wrangler d1 execute natbergerhuette-db --file=./migrations/009_add_ancillary_costs_numeric.sql

-- Add numeric field for Nebenkosten (NK) - ancillary costs amount
ALTER TABLE guests ADD COLUMN ancillary_costs_amount REAL DEFAULT 0;

-- Add numeric field for Endreinigung (ER) - final cleaning amount
ALTER TABLE guests ADD COLUMN final_cleaning_amount REAL DEFAULT 0;

-- Note: existing additional_costs and final_cleaning TEXT fields are kept for notes like "vor Ort"
