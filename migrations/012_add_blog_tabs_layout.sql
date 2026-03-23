-- Add 'tabs' layout to blog_posts
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints,
-- so we recreate the table with the updated constraint.

-- 1. Create new table with updated constraint
CREATE TABLE IF NOT EXISTS blog_posts_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  cover_image_alt TEXT,
  layout TEXT DEFAULT 'standard' CHECK(layout IN ('standard', 'carousel', 'tabs')),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  author TEXT DEFAULT 'Sechszirbenhütte',
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Copy existing data
INSERT INTO blog_posts_new SELECT * FROM blog_posts;

-- 3. Drop old table
DROP TABLE blog_posts;

-- 4. Rename new table
ALTER TABLE blog_posts_new RENAME TO blog_posts;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
