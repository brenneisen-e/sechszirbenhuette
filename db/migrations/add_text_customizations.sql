-- Migration: Textanpassungen für Homepage
-- Datum: 2026-01-15

-- Textanpassungen für Homepage
CREATE TABLE IF NOT EXISTS text_customizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key TEXT NOT NULL UNIQUE,      -- z.B. "hero.title", "ferienhaus.intro", etc.
    text_de TEXT,                          -- Deutscher Text
    text_en TEXT,                          -- Englischer Text
    font_size TEXT,                        -- CSS font-size (z.B. "text-4xl", "48px", "3rem")
    font_color TEXT,                       -- Farbe (z.B. "#1e5631", "rgb(30, 86, 49)")
    font_family TEXT,                      -- Schriftart (z.B. "Inter", "Serif", "Playfair Display")
    font_weight TEXT,                      -- Schriftstärke (z.B. "400", "600", "bold")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_text_customizations_section ON text_customizations(section_key);

-- Beispiel-Daten (optional, kann bei Bedarf eingefügt werden)
INSERT OR IGNORE INTO text_customizations (section_key, text_de, text_en, font_size, font_color, font_family, font_weight) VALUES
('hero.title', 'Willkommen in der Sechszirbenhütte', 'Welcome to Sechszirbenhütte', '3rem', '#ffffff', 'Inter', '700'),
('hero.subtitle', 'Luxus-Ferienhaus auf 1.700m Höhe', 'Luxury vacation home at 1,700m altitude', '1.5rem', '#ffffff', 'Inter', '400'),
('ferienhaus.title', 'Die Sechszirbenhütte', 'The Sechszirbenhütte', '2.5rem', '#1e5631', 'Inter', '700'),
('ferienhaus.intro', 'Unser gemütliches Ferienhaus bietet Platz für bis zu 10 Personen', 'Our cozy vacation home accommodates up to 10 people', '1.125rem', '#374151', 'Inter', '400');
