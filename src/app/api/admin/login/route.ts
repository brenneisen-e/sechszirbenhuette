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
  ADMIN_PASSWORD?: string;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext();
    return ctx.env as CloudflareEnv;
  } catch {
    return null;
  }
}

// POST - Login with password
export async function POST(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json(
        { error: 'Server nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Passwort erforderlich' },
        { status: 400 }
      );
    }

    // Check password against environment variable
    const adminPassword = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin-Passwort nicht konfiguriert. Bitte ADMIN_PASSWORD als Environment Variable setzen.' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Falsches Passwort' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Ensure admin_sessions table exists
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (tableError) {
      console.error('Error creating admin_sessions table:', tableError);
    }

    // Store session in database
    await env.DB.prepare(`
      INSERT INTO admin_sessions (session_id, expires_at)
      VALUES (?, ?)
    `).bind(sessionId, expiresAt.toISOString()).run();

    // Set cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login fehlgeschlagen' },
      { status: 500 }
    );
  }
}

// GET - Check if logged in
export async function GET(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    if (!env) {
      return NextResponse.json({ authenticated: false });
    }

    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ authenticated: false });
    }

    const session = await env.DB.prepare(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > datetime("now")'
    ).bind(sessionId).first();

    return NextResponse.json({ authenticated: !!session });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    const sessionId = request.cookies.get('admin_session')?.value;

    if (env && sessionId) {
      await env.DB.prepare(
        'DELETE FROM admin_sessions WHERE session_id = ?'
      ).bind(sessionId).run();
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_session');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_session');
    return response;
  }
}
