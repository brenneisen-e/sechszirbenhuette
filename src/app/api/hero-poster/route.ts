import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
}

// Standbild des Hüttenfilms im Aufmacher, direkt aus dem HTML ladbar (Bild mit
// srcset in Hero.tsx) — ohne auf JavaScript und /api/media zu warten; das ist
// das größte sichtbare Element (LCP). Leitet auf das Stream-Standbild in der
// gewünschten Breite weiter, ohne Film auf das hinterlegte Vorschaubild.

const WIDTHS = [640, 960, 1280, 1920];

export async function GET(request: NextRequest) {
  const asked = Number(request.nextUrl.searchParams.get('w')) || 1920;
  const width = WIDTHS.find((w) => w >= asked) ?? 1920;
  const height = Math.round((width * 9) / 16);
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    if (db) {
      const video = await db
        .prepare(
          `SELECT url FROM media WHERE category = 'hero' AND media_type = 'video'
           ORDER BY display_order ASC, created_at DESC LIMIT 1`,
        )
        .first<{ url: string }>();
      const match = video?.url.match(/^https:\/\/([^/]+\.cloudflarestream\.com)\/([a-f0-9]+)\//);
      if (match) {
        return redirect(
          `https://${match[1]}/${match[2]}/thumbnails/thumbnail.jpg?time=1s&width=${width}&height=${height}`,
        );
      }
      const image = await db
        .prepare(
          `SELECT url FROM media WHERE category = 'hero-thumbnail' AND media_type = 'image'
           ORDER BY display_order ASC, created_at DESC LIMIT 1`,
        )
        .first<{ url: string }>();
      if (image?.url) return redirect(new URL(image.url, request.url).toString());
    }
  } catch {
    // ohne Datenbank kein Standbild
  }
  return new NextResponse(null, { status: 404 });
}

function redirect(url: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'public, max-age=600' },
  });
}
