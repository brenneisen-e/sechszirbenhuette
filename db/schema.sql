-- Sechszirbenhütte Datenbank Schema
-- Für Cloudflare D1 (SQLite)

-- Buchungsanfragen (Website-Formular)
CREATE TABLE IF NOT EXISTS booking_requests (
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

-- =============================================
-- GÄSTEDATENBANK TABELLEN
-- =============================================

-- Gäste-Tabelle
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_number TEXT,
  month TEXT,
  year INTEGER,
  guest_name TEXT NOT NULL,
  nationality TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_returning_guest INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  no_nebenkosten INTEGER DEFAULT 0,
  platform TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  adults INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  children_ages TEXT,
  pets TEXT,
  rental_price REAL DEFAULT 0,
  net_rent REAL DEFAULT NULL,
  ancillary_costs_amount REAL DEFAULT 0,
  final_cleaning_amount REAL DEFAULT 0,
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
  cleaning_cash REAL DEFAULT 0,
  utilities_cash REAL DEFAULT 0,
  admin_briefed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Buchungen (zusätzliche Buchungen pro Gast)
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
  cleaning_cash REAL DEFAULT 0,
  utilities_cash REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Gast-Aufgaben
CREATE TABLE IF NOT EXISTS guest_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  booking_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  is_completed INTEGER DEFAULT 0,
  due_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Gast-Notizen
CREATE TABLE IF NOT EXISTS guest_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- E-Mails
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

-- E-Mail Sync Status
CREATE TABLE IF NOT EXISTS email_sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder TEXT NOT NULL UNIQUE,
  last_uid INTEGER DEFAULT 0,
  last_sync DATETIME,
  total_emails INTEGER DEFAULT 0
);

-- =============================================
-- AUSGABEN & FINANZEN
-- =============================================

-- Ausgaben
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ausgaben-Kategorien
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Standard-Kategorien
INSERT OR IGNORE INTO expense_categories (name, display_order) VALUES
  ('Umsatzsteuer', 1),
  ('Versicherung', 2),
  ('Strom', 3),
  ('Wasser/Kanal', 4),
  ('Holz', 5),
  ('Ortstaxe', 6),
  ('Reinigung', 7),
  ('Provision', 8),
  ('Telefon', 9);

-- Admin-Einstellungen (für Kalender, Preise etc.)
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Gast-Dokumente
CREATE TABLE IF NOT EXISTS guest_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Verfügbarkeit / Belegungskalender
CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum DATE NOT NULL UNIQUE,
    status TEXT DEFAULT 'frei',  -- frei, belegt, geblockt
    booking_id INTEGER,
    notiz TEXT,

    FOREIGN KEY (booking_id) REFERENCES booking_requests(id)
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
    ('headingSize', '64'),
    ('bodySize', '16'),
    ('sectionSpacing', 'normal');

-- =============================================
-- INDIZES
-- =============================================

-- Gäste-Indizes
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(guest_name);
CREATE INDEX IF NOT EXISTS idx_guests_arrival ON guests(arrival_date);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_year ON guests(year);

-- Buchungs-Indizes
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_arrival ON bookings(arrival_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_platform ON bookings(platform);

-- Task-Indizes
CREATE INDEX IF NOT EXISTS idx_tasks_guest_id ON guest_tasks(guest_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON guest_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON guest_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON guest_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_booking_id ON guest_tasks(booking_id);

-- E-Mail-Indizes
CREATE INDEX IF NOT EXISTS idx_emails_guest_id ON emails(guest_id);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_address);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date_sent);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- Ausgaben-Indizes
CREATE INDEX IF NOT EXISTS idx_expenses_year_month ON expenses(year, month);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Andere Indizes
CREATE INDEX IF NOT EXISTS idx_booking_requests_anreise ON booking_requests(anreise);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_availability_datum ON availability(datum);
CREATE INDEX IF NOT EXISTS idx_reviews_sichtbar ON reviews(sichtbar);
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_order ON media(category, display_order);
CREATE INDEX IF NOT EXISTS idx_amenity_card_images_key ON amenity_card_images(card_key);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- Individuelle Texte & Überschriften
CREATE TABLE IF NOT EXISTS content_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_key TEXT NOT NULL UNIQUE,       -- z.B. "hero_title", "ferienhaus_subtitle"
    content TEXT NOT NULL,                -- Der eigentliche Text
    font_family TEXT,                     -- Optional: Schriftart für diesen Text
    font_size TEXT,                       -- Optional: Schriftgröße (z.B. "48", "72")
    color TEXT,                           -- Optional: Farbe für diesen Text
    padding TEXT,                         -- Optional: Padding für diesen Text (z.B. "8", "16")
    section TEXT NOT NULL,                -- Sektion: hero, reviews, introtext, ferienhaus, etc.
    text_type TEXT DEFAULT 'body',        -- heading oder body
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_texts_key ON content_texts(text_key);
CREATE INDEX IF NOT EXISTS idx_content_texts_section ON content_texts(section);
