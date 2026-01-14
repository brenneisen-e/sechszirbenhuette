import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

interface AmenityCardImage {
  card_key: string;
  url: string;
  title: string;
  alt_text: string;
}

// GET - Get amenity card images (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ byCard: {}, success: true });
    }

    const { searchParams } = new URL(request.url);
    const cardKey = searchParams.get('card_key');

    let query = `
      SELECT
        aci.card_key,
        m.url, m.title, m.alt_text
      FROM amenity_card_images aci
      LEFT JOIN media m ON aci.media_id = m.id
      WHERE m.url IS NOT NULL
    `;

    if (cardKey) {
      query += ` AND aci.card_key = ?`;
      query += ` ORDER BY aci.display_order ASC LIMIT 1`;
      const result = await env.DB.prepare(query).bind(cardKey).first<AmenityCardImage>();
      return NextResponse.json({ image: result, success: true });
    }

    query += ` ORDER BY aci.card_key, aci.display_order ASC`;
    const result = await env.DB.prepare(query).all<AmenityCardImage>();

    // Group by card_key, take first image per card
    const byCard: Record<string, AmenityCardImage> = {};
    for (const img of result.results || []) {
      if (!byCard[img.card_key]) {
        byCard[img.card_key] = img;
      }
    }

    return NextResponse.json({
      byCard,
      success: true
    });
  } catch (error) {
    console.error('Error fetching amenity card images:', error);
    return NextResponse.json({ byCard: {}, success: true });
  }
}
