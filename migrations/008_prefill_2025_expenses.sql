-- Migration: Pre-fill 2025 expenses from existing records
-- This migration ensures 2025 expense data is populated

-- Umsatzsteuer
INSERT OR REPLACE INTO expenses (year, month, category, amount) VALUES
  (2025, 1, 'Umsatzsteuer', 512.93),
  (2025, 2, 'Umsatzsteuer', 1219.29),
  (2025, 3, 'Umsatzsteuer', 865.00),
  (2025, 4, 'Umsatzsteuer', 128.28),
  (2025, 5, 'Umsatzsteuer', 56.70),
  (2025, 10, 'Umsatzsteuer', 30.58),
  (2025, 12, 'Umsatzsteuer', 594.00);

-- Strom
INSERT OR REPLACE INTO expenses (year, month, category, amount) VALUES
  (2025, 1, 'Strom', 180.00),
  (2025, 2, 'Strom', 180.00),
  (2025, 3, 'Strom', 180.00),
  (2025, 4, 'Strom', 483.77),
  (2025, 5, 'Strom', 225.00),
  (2025, 6, 'Strom', 225.00),
  (2025, 7, 'Strom', 225.00),
  (2025, 8, 'Strom', 225.00),
  (2025, 9, 'Strom', 225.00),
  (2025, 10, 'Strom', 225.00),
  (2025, 11, 'Strom', 225.00),
  (2025, 12, 'Strom', 225.00);

-- Wasser/Kanal
INSERT OR REPLACE INTO expenses (year, month, category, amount) VALUES
  (2025, 2, 'Wasser/Kanal', 138.32),
  (2025, 4, 'Wasser/Kanal', 402.32),
  (2025, 5, 'Wasser/Kanal', 641.00),
  (2025, 6, 'Wasser/Kanal', 103.34),
  (2025, 8, 'Wasser/Kanal', 83.04),
  (2025, 9, 'Wasser/Kanal', 136.94),
  (2025, 10, 'Wasser/Kanal', 129.90);

-- Ortstaxe
INSERT OR REPLACE INTO expenses (year, month, category, amount) VALUES
  (2025, 1, 'Ortstaxe', 97.20),
  (2025, 2, 'Ortstaxe', 224.10),
  (2025, 3, 'Ortstaxe', 186.30),
  (2025, 4, 'Ortstaxe', 37.80),
  (2025, 7, 'Ortstaxe', 72.90),
  (2025, 8, 'Ortstaxe', 318.60),
  (2025, 9, 'Ortstaxe', 151.20),
  (2025, 10, 'Ortstaxe', 59.40),
  (2025, 11, 'Ortstaxe', 54.00),
  (2025, 12, 'Ortstaxe', 0.00);

-- Manuela
INSERT OR REPLACE INTO expenses (year, month, category, amount) VALUES
  (2025, 3, 'Manuela', 1006.39),
  (2025, 6, 'Manuela', 335.10),
  (2025, 9, 'Manuela', 792.34),
  (2025, 12, 'Manuela', 100.00);

-- Telefon
INSERT OR REPLACE INTO expenses (year, month, category, amount) VALUES
  (2025, 1, 'Telefon', 228.68),
  (2025, 2, 'Telefon', 223.38),
  (2025, 3, 'Telefon', 244.91),
  (2025, 4, 'Telefon', 223.38),
  (2025, 5, 'Telefon', 223.38),
  (2025, 6, 'Telefon', 238.10),
  (2025, 7, 'Telefon', 223.38),
  (2025, 8, 'Telefon', 223.38),
  (2025, 9, 'Telefon', 240.89),
  (2025, 10, 'Telefon', 223.38),
  (2025, 11, 'Telefon', 223.38),
  (2025, 12, 'Telefon', 240.89);
