-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  cover_image_alt TEXT,
  layout TEXT DEFAULT 'standard' CHECK(layout IN ('standard', 'carousel')),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  author TEXT DEFAULT 'Sechszirbenhütte',
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Blog Post Images (for galleries/carousels within posts)
CREATE TABLE IF NOT EXISTS blog_post_images (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_alt TEXT,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_post_images_post_id ON blog_post_images(post_id);
