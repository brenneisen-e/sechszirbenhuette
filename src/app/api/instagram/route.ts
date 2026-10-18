import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { getPublicFeed } from '@/lib/server/instagram';

interface Env {
  DB: D1Database;
}

// Öffentlich: Profil und letzte Beiträge des Instagram-Kanals für die
// Website (src/components/sections/Instagram.tsx). Nur Bildadressen, Links
// und Bildtexte — der Zugangsschlüssel bleibt auf dem Server.

export async function GET() {
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    const feed = db ? await getPublicFeed(db) : null;
    return NextResponse.json(
      feed
        ? { connected: true, profile: feed.profile, posts: feed.posts }
        : { connected: false, profile: null, posts: [] },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    );
  } catch {
    return NextResponse.json({ connected: false, profile: null, posts: [] });
  }
}
