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

// GET - List all amenity card image assignments
export async function GET() {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ assignments: [], success: true });
    }

    const result = await env.DB.prepare(`
      SELECT aci.id, aci.card_key, aci.media_id, aci.display_order,
             m.url, m.title, m.alt_text
      FROM amenity_card_images aci
      LEFT JOIN media m ON aci.media_id = m.id
      ORDER BY aci.card_key, aci.display_order ASC
    `).all<{
      id: number;
      card_key: string;
      media_id: string;
      display_order: number;
      url: string;
      title: string;
      alt_text: string;
    }>();

    return NextResponse.json({ assignments: result.results || [], success: true });
  } catch (error) {
    console.error('Error fetching amenity card images:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST - Assign a media item to a card
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    const body = await request.json() as { card_key: string; media_id: string };
    const { card_key, media_id } = body;

    if (!card_key || !media_id) {
      return NextResponse.json({ error: 'card_key and media_id required' }, { status: 400 });
    }

    // Remove existing assignment for this card (one image per card)
    await env.DB.prepare('DELETE FROM amenity_card_images WHERE card_key = ?').bind(card_key).run();

    // Insert new assignment
    await env.DB.prepare(
      'INSERT INTO amenity_card_images (card_key, media_id, display_order) VALUES (?, ?, 0)'
    ).bind(card_key, media_id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning amenity image:', error);
    return NextResponse.json({ error: 'Failed to assign' }, { status: 500 });
  }
}

// DELETE - Remove image assignment from a card
export async function DELETE(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const cardKey = searchParams.get('card_key');

    if (!cardKey) {
      return NextResponse.json({ error: 'card_key required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM amenity_card_images WHERE card_key = ?').bind(cardKey).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing amenity image:', error);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
