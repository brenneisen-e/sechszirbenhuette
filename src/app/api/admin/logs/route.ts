import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { ensureAppLogsTable } from '@/lib/server/appLog';

// Auth: /api/admin/* liegt hinter Cloudflare Zero Trust.

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx.env as { DB: D1Database }).DB;
    await ensureAppLogsTable(db);

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const source = url.searchParams.get('source');
    const level = url.searchParams.get('level');

    let query = 'SELECT * FROM app_logs';
    const conditions: string[] = [];
    const params: string[] = [];

    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(String(limit));

    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).all();

    return NextResponse.json({ logs: result.results || [] });
  } catch (error) {
    return NextResponse.json({
      error: 'Fehler beim Laden der Logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function DELETE() {
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx.env as { DB: D1Database }).DB;
    await ensureAppLogsTable(db);

    await db.prepare('DELETE FROM app_logs').run();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      error: 'Fehler beim Löschen der Logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
