import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cloudflare types
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

// Get Cloudflare environment
async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

export interface TextCustomization {
  id: number;
  section_key: string;
  text_de: string | null;
  text_en: string | null;
  font_size: string | null;
  font_color: string | null;
  font_family: string | null;
  font_weight: string | null;
  created_at: string;
  updated_at: string;
}

// GET - Public endpoint to fetch text customizations
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ error: 'Cloudflare environment not available', success: false }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const section_key = searchParams.get('section_key');

    let query = 'SELECT * FROM text_customizations';
    const params: string[] = [];

    if (section_key) {
      query += ' WHERE section_key = ?';
      params.push(section_key);
    }

    query += ' ORDER BY section_key ASC';

    const stmt = env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<TextCustomization>();

    return NextResponse.json({
      customizations: result.results || [],
      success: true
    });
  } catch (error) {
    console.error('Error fetching text customizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch text customizations', success: false },
      { status: 500 }
    );
  }
}
