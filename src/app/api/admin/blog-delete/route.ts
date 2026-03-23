import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
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

// DELETE blog post - called from admin panel (no extra auth needed, admin page is already protected)
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as { id?: string };
    const id = body.id;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Delete post images first
    await env.DB.prepare('DELETE FROM blog_post_images WHERE post_id = ?').bind(id).run();
    // Delete the post
    await env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
