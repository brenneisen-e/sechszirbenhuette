-- Sechszirbenhütte Datenbank Schema
-- Für Cloudflare D1 (SQLite)

-- Buchungsanfragen
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Persönliche Daten
    anrede TEXT NOT NULL,
    vorname TEXT NOT NULL,
    nachname TEXT NOT NULL,
    email TEXT NOT NULL,
    telefon TEXT,
    strasse TEXT,
    plz TEXT,
    ort TEXT,
    land TEXT DEFAULT 'Deutschland',

    -- Reisedaten
    anreise DATE NOT NULL,
    abreise DATE NOT NULL,
    erwachsene INTEGER NOT NULL DEFAULT 2,
    kinder INTEGER DEFAULT 0,
    kinder_alter TEXT,
    hunde INTEGER DEFAULT 0,

    -- Optionen
    waeschepaket BOOLEAN DEFAULT FALSE,
    anzahl_waesche INTEGER DEFAULT 0,

    -- Sonstiges
    nachricht TEXT,

    -- Status
    status TEXT DEFAULT 'neu',  -- neu, bestaetigt, storniert, abgeschlossen

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Verfügbarkeit / Belegungskalender
CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum DATE NOT NULL UNIQUE,
    status TEXT DEFAULT 'frei',  -- frei, belegt, geblockt
    booking_id INTEGER,
    notiz TEXT,

    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Bewertungen
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gast_name TEXT NOT NULL,
    bewertung INTEGER NOT NULL CHECK (bewertung >= 1 AND bewertung <= 5),
    titel TEXT,
    text TEXT,
    aufenthalt_von DATE,
    aufenthalt_bis DATE,
    quelle TEXT,  -- direkt, booking, fewo-direkt, google
    sichtbar BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Preise / Saisonzeiten
CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,  -- Nebensaison, Hauptsaison, Weihnachten, etc.
    von DATE NOT NULL,
    bis DATE NOT NULL,
    preis_pro_nacht DECIMAL(10,2) NOT NULL,
    mindestaufenthalt INTEGER DEFAULT 3,
    aktiv BOOLEAN DEFAULT TRUE
);

-- Kontaktanfragen (allgemein)
CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    betreff TEXT,
    nachricht TEXT NOT NULL,
    gelesen BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Medien-Verwaltung (Bilder & Videos in R2)
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,               -- UUID-style ID

    -- Datei-Infos
    file_key TEXT NOT NULL UNIQUE,     -- Pfad im R2 Bucket (z.B. "hero/123456-abc.mp4")
    url TEXT NOT NULL,                 -- API URL zum Abrufen der Datei

    -- Kategorisierung
    category TEXT NOT NULL,            -- hero, header, innen, aussen, umgebung, winter, sommer
    media_type TEXT NOT NULL,          -- image, video

    -- Metadaten für Galerie und SEO
    title TEXT,
    alt_text TEXT,                     -- SEO wichtig!
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin-Sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ausstattung-Kacheln Bilderzuordnung
CREATE TABLE IF NOT EXISTS amenity_card_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_key TEXT NOT NULL,             -- living, kitchen, rooms, sauna, bathroom, outdoor, equipment, location
    media_id TEXT NOT NULL,             -- Referenz auf media.id
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
    UNIQUE(card_key, media_id)
);

-- Website-Einstellungen (Styling)
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,    -- z.B. "primaryColor", "headingFont", etc.
    setting_value TEXT NOT NULL,         -- JSON oder String-Wert
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Standard-Einstellungen einfügen
INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES
    ('primaryColor', '#1e5631'),
    ('accentColor', '#8B7355'),
    ('headingFont', 'FeelingPassionate'),
    ('bodyFont', 'system-ui'),
    ('headingSize', 'normal'),
    ('bodySize', 'normal'),
    ('sectionSpacing', 'normal');

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_bookings_anreise ON bookings(anreise);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_availability_datum ON availability(datum);
CREATE INDEX IF NOT EXISTS idx_reviews_sichtbar ON reviews(sichtbar);
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_order ON media(category, display_order);
CREATE INDEX IF NOT EXISTS idx_amenity_card_images_key ON amenity_card_images(card_key);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);
