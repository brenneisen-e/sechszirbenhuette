import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel';
  status: 'draft' | 'published';
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogPostImage {
  id: string;
  post_id: string;
  image_url: string;
  image_alt: string | null;
  caption: string | null;
  display_order: number;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface CloudflareEnv {
  DB: D1Database;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

// GET - List all blog posts or get single post by slug
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const status = searchParams.get('status'); // 'published' | 'draft' | null (all)
  const includeImages = searchParams.get('images') === 'true';

  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ posts: [] });
    }

    // Get single post by slug
    if (slug) {
      const post = await env.DB.prepare(
        'SELECT * FROM blog_posts WHERE slug = ?'
      ).bind(slug).first<BlogPost>();

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      let images: BlogPostImage[] = [];
      if (includeImages) {
        const imagesResult = await env.DB.prepare(
          'SELECT * FROM blog_post_images WHERE post_id = ? ORDER BY display_order ASC'
        ).bind(post.id).all<BlogPostImage>();
        images = imagesResult.results || [];
      }

      return NextResponse.json({ post, images }, {
        headers: {
          'Cache-Control': post.status === 'published'
            ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
            : 'no-cache'
        }
      });
    }

    // List all posts
    let query = 'SELECT * FROM blog_posts';
    const params: string[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY COALESCE(published_at, created_at) DESC';

    const stmt = env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<BlogPost>();

    return NextResponse.json({ posts: result.results || [] }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST - Create new blog post (admin only)
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as Partial<BlogPost> & { images?: Partial<BlogPostImage>[] };

    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Generate slug from title if not provided
    const slug = body.slug || generateSlug(body.title);

    // Check if slug already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM blog_posts WHERE slug = ?'
    ).bind(slug).first();

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // Create post
    const postId = crypto.randomUUID();
    const publishedAt = body.status === 'published' ? new Date().toISOString() : null;

    await env.DB.prepare(`
      INSERT INTO blog_posts (id, slug, title, subtitle, excerpt, content, cover_image_url, cover_image_alt, layout, status, author, meta_title, meta_description, meta_keywords, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      slug,
      body.title,
      body.subtitle || null,
      body.excerpt || null,
      body.content,
      body.cover_image_url || null,
      body.cover_image_alt || null,
      body.layout || 'standard',
      body.status || 'draft',
      body.author || 'Sechszirbenhütte',
      body.meta_title || body.title,
      body.meta_description || body.excerpt || null,
      body.meta_keywords || null,
      publishedAt
    ).run();

    // Add images if provided
    if (body.images && body.images.length > 0) {
      for (let i = 0; i < body.images.length; i++) {
        const img = body.images[i];
        if (img.image_url) {
          await env.DB.prepare(`
            INSERT INTO blog_post_images (post_id, image_url, image_alt, caption, display_order)
            VALUES (?, ?, ?, ?, ?)
          `).bind(postId, img.image_url, img.image_alt || null, img.caption || null, i).run();
        }
      }
    }

    return NextResponse.json({ success: true, id: postId, slug });

  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// PUT - Update blog post (admin only)
export async function PUT(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as Partial<BlogPost> & { id: string; images?: Partial<BlogPostImage>[] };

    if (!body.id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Get current post
    const currentPost = await env.DB.prepare(
      'SELECT * FROM blog_posts WHERE id = ?'
    ).bind(body.id).first<BlogPost>();

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check slug uniqueness if changed
    if (body.slug && body.slug !== currentPost.slug) {
      const existing = await env.DB.prepare(
        'SELECT id FROM blog_posts WHERE slug = ? AND id != ?'
      ).bind(body.slug, body.id).first();

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    // Set published_at if publishing for the first time
    let publishedAt = currentPost.published_at;
    if (body.status === 'published' && !currentPost.published_at) {
      publishedAt = new Date().toISOString();
    }

    // Update post
    await env.DB.prepare(`
      UPDATE blog_posts SET
        slug = ?,
        title = ?,
        subtitle = ?,
        excerpt = ?,
        content = ?,
        cover_image_url = ?,
        cover_image_alt = ?,
        layout = ?,
        status = ?,
        author = ?,
        meta_title = ?,
        meta_description = ?,
        meta_keywords = ?,
        published_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.slug || currentPost.slug,
      body.title || currentPost.title,
      body.subtitle ?? currentPost.subtitle,
      body.excerpt ?? currentPost.excerpt,
      body.content || currentPost.content,
      body.cover_image_url ?? currentPost.cover_image_url,
      body.cover_image_alt ?? currentPost.cover_image_alt,
      body.layout || currentPost.layout,
      body.status || currentPost.status,
      body.author || currentPost.author,
      body.meta_title ?? currentPost.meta_title,
      body.meta_description ?? currentPost.meta_description,
      body.meta_keywords ?? currentPost.meta_keywords,
      publishedAt,
      body.id
    ).run();

    // Update images if provided
    if (body.images !== undefined) {
      // Delete existing images
      await env.DB.prepare('DELETE FROM blog_post_images WHERE post_id = ?').bind(body.id).run();

      // Add new images
      for (let i = 0; i < body.images.length; i++) {
        const img = body.images[i];
        if (img.image_url) {
          await env.DB.prepare(`
            INSERT INTO blog_post_images (post_id, image_url, image_alt, caption, display_order)
            VALUES (?, ?, ?, ?, ?)
          `).bind(body.id, img.image_url, img.image_alt || null, img.caption || null, i).run();
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE - Delete blog post (admin only)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');

  // Also accept id from request body
  if (!id) {
    try {
      const body = await request.json() as { id?: string };
      id = body.id || null;
    } catch {
      // no body
    }
  }

  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Delete post images first (in case CASCADE is broken after table recreation)
    await env.DB.prepare('DELETE FROM blog_post_images WHERE post_id = ?').bind(id).run();
    // Delete the post
    await env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
