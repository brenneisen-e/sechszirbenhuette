import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
  connectWithToken,
  createAuthorizeUrl,
  disconnectInstagram,
  getInstagramStatus,
  redirectUriFor,
  refreshFeed,
  saveAppCredentials,
  setFeedEnabled,
} from '@/lib/server/instagram';

interface Env {
  DB: D1Database;
}

// Instagram-Anbindung im Admin Center (src/components/admin/InstagramPanel.tsx).
// Auth: Admin-Session, geprüft in src/middleware.ts. App-Geheimnis und
// Zugangsschlüssel werden nie zurückgegeben.

async function getDb(): Promise<D1Database | null> {
  const ctx = await getCloudflareContext();
  return (ctx as { env: Env }).env?.DB ?? null;
}

function originOf(request: NextRequest): string {
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });
  const status = await getInstagramStatus(db);
  return NextResponse.json({
    success: true,
    status,
    redirectUri: redirectUriFor(originOf(request)),
  });
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    appId?: string;
    appSecret?: string;
    token?: string;
    enabled?: boolean;
  };
  try {
    switch (body.action) {
      case 'saveApp':
        await saveAppCredentials(db, body.appId ?? '', body.appSecret);
        return NextResponse.json({ success: true, status: await getInstagramStatus(db) });
      case 'authorize':
        return NextResponse.json({
          success: true,
          url: await createAuthorizeUrl(db, originOf(request)),
        });
      case 'saveToken': {
        const { username } = await connectWithToken(db, body.token ?? '');
        await refreshFeed(db).catch(() => null);
        return NextResponse.json({
          success: true,
          message: `Verbunden mit @${username}`,
          status: await getInstagramStatus(db),
        });
      }
      case 'refresh': {
        const feed = await refreshFeed(db);
        return NextResponse.json({
          success: true,
          message: `${feed.posts.length} Beiträge geladen`,
          status: await getInstagramStatus(db),
        });
      }
      case 'setEnabled':
        await setFeedEnabled(db, body.enabled === true);
        return NextResponse.json({ success: true, status: await getInstagramStatus(db) });
      case 'disconnect':
        await disconnectInstagram(db);
        return NextResponse.json({ success: true, status: await getInstagramStatus(db) });
      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler' }, { status: 400 });
  }
}
