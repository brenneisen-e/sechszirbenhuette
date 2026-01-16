import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;  // Fallback for development
}

// Helper to get admin password from env
function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface TaskRecord {
  id: number;
  guest_id: number;
  booking_id: number | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  is_completed: number;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

// GET - Get tasks for a guest
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const { searchParams } = new URL(request.url);

    if (!env?.DB) {
      console.error('DB not found in env. Available keys:', Object.keys(env || {}));
      return NextResponse.json({ error: 'DB not configured', tasks: [] }, { status: 500 });
    }

    const guestId = searchParams.get('guest_id');
    const bookingId = searchParams.get('booking_id');
    const assignedTo = searchParams.get('assigned_to');
    const showCompleted = searchParams.get('show_completed') === 'true';
    const guestLevelOnly = searchParams.get('guest_level_only') === 'true';

    let query = 'SELECT * FROM guest_tasks';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (guestId) {
      conditions.push('guest_id = ?');
      params.push(parseInt(guestId));
    }

    if (bookingId) {
      conditions.push('booking_id = ?');
      params.push(parseInt(bookingId));
    }

    if (guestLevelOnly) {
      conditions.push('booking_id IS NULL');
    }

    if (assignedTo) {
      conditions.push('assigned_to = ?');
      params.push(assignedTo);
    }

    if (!showCompleted) {
      conditions.push('is_completed = 0');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY is_completed ASC, due_date ASC, created_at DESC';

    const { results } = await env.DB.prepare(query).bind(...params).all<TaskRecord>();

    return NextResponse.json({ tasks: results || [] });
  } catch (error) {
    console.error('GET /api/admin/tasks error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    // If table doesn't exist, return empty array instead of error
    if (message.includes('no such table')) {
      return NextResponse.json({ tasks: [], tableNotFound: true });
    }
    return NextResponse.json({ error: message, tasks: [] }, { status: 500 });
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      guest_id: number;
      booking_id?: number;
      title: string;
      description?: string;
      assigned_to?: string;
      due_date?: string;
    };

    const { guest_id, booking_id, title, description, assigned_to, due_date } = body;

    if (!guest_id || !title) {
      return NextResponse.json({ error: 'guest_id and title are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(`
      INSERT INTO guest_tasks (guest_id, booking_id, title, description, assigned_to, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      guest_id,
      booking_id || null,
      title,
      description || null,
      assigned_to || null,
      due_date || null
    ).first<TaskRecord>();

    return NextResponse.json({ task: result });
  } catch (error) {
    console.error('POST /api/admin/tasks error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update a task (toggle completion, edit)
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      id: number;
      booking_id?: number | null;
      title?: string;
      description?: string;
      assigned_to?: string;
      is_completed?: boolean;
      due_date?: string;
    };

    const { id, booking_id, title, description, assigned_to, is_completed, due_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (booking_id !== undefined) {
      updates.push('booking_id = ?');
      values.push(booking_id);
    }

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(assigned_to || null);
    }

    if (is_completed !== undefined) {
      updates.push('is_completed = ?');
      // Support 3 states: 0 = pending, 1 = completed, 2 = N/A
      const statusValue = typeof is_completed === 'number' ? is_completed : (is_completed ? 1 : 0);
      values.push(statusValue);
      // Set completed_at only when status is 1 (completed)
      if (statusValue === 1) {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      } else {
        updates.push('completed_at = NULL');
      }
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const result = await env.DB.prepare(
      `UPDATE guest_tasks SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<TaskRecord>();

    if (!result) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: result });
  } catch (error) {
    console.error('PUT /api/admin/tasks error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM guest_tasks WHERE id = ?').bind(parseInt(id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/tasks error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
