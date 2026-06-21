import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { deleteFromTelegram } from '@/lib/telegram';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/files
 * Fetch all tracked files. Supports search, category, and favorite filters.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category'); // 'image' | 'video' | 'document' | 'audio'
    const favorite = searchParams.get('favorite'); // 'true' | 'false'
    const search = searchParams.get('search'); // text search

    const db = await getDb();

    let query = 'SELECT * FROM files WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (favorite === 'true') {
      query += ' AND is_favorite = 1';
    } else if (favorite === 'false') {
      query += ' AND is_favorite = 0';
    }

    if (search) {
      query += ' AND file_name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const files = await db.all(query, params);
    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error('[Files GET API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/files
 * Toggles the favorite status of a file.
 * Expects JSON: { id: number, is_favorite: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, is_favorite } = await req.json();

    if (id === undefined || is_favorite === undefined) {
      return NextResponse.json(
        { error: 'id and is_favorite parameters are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const favInt = is_favorite ? 1 : 0;

    await db.run('UPDATE files SET is_favorite = ? WHERE id = ?', [favInt, id]);

    return NextResponse.json({ success: true, id, is_favorite });
  } catch (error: any) {
    console.error('[Files PATCH API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/files
 * Deletes a file record and deletes the corresponding message on Telegram.
 * Expects searchParam: ?id=123
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const file = await db.get('SELECT * FROM files WHERE id = ?', [id]);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Try deleting from Telegram group
    const telegramMessageId = file.telegram_message_id;
    if (telegramMessageId) {
      await deleteFromTelegram(telegramMessageId);
    }

    // Delete record from local SQLite database
    await db.run('DELETE FROM files WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('[Files DELETE API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
