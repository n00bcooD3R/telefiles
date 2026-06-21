import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'edge';

/**
 * GET /api/albums
 * Lists albums or lists files inside a specific album.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const albumId = searchParams.get('id');

    const db = await getDb();

    if (albumId) {
      // Fetch details for a specific album and list its files
      const album = await db.get('SELECT * FROM albums WHERE id = ?', [albumId]);
      if (!album) {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      }

      const files = await db.all(
        `SELECT f.* FROM files f
         JOIN album_files af ON f.id = af.file_id
         WHERE af.album_id = ?
         ORDER BY f.created_at DESC`,
        [albumId]
      );

      return NextResponse.json({ success: true, album, files });
    } else {
      // List all albums with file counts
      const albums = await db.all(
        `SELECT a.*, COUNT(af.file_id) as file_count
         FROM albums a
         LEFT JOIN album_files af ON a.id = af.album_id
         GROUP BY a.id
         ORDER BY a.created_at DESC`
      );

      return NextResponse.json({ success: true, albums });
    }
  } catch (error: any) {
    console.error('[Albums GET API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/albums
 * Creates a new album.
 * Expects JSON: { name: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    const db = await getDb();

    // Check if album name already exists
    const existing = await db.get('SELECT id FROM albums WHERE name = ?', [name.trim()]);
    if (existing) {
      return NextResponse.json({ error: 'An album with this name already exists' }, { status: 400 });
    }

    const result = await db.run('INSERT INTO albums (name) VALUES (?)', [name.trim()]);
    const newAlbum = await db.get('SELECT * FROM albums WHERE id = ?', [result.lastID]);

    return NextResponse.json({ success: true, album: newAlbum });
  } catch (error: any) {
    console.error('[Albums POST API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/albums
 * Adds or removes files to/from an album.
 * Expects JSON: { action: 'add' | 'remove', album_id: number, file_ids: number[] }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, album_id, file_ids } = await req.json();

    if (!action || !album_id || !file_ids || !Array.isArray(file_ids)) {
      return NextResponse.json(
        { error: 'Parameters action, album_id, and file_ids (array) are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if album exists
    const album = await db.get('SELECT id FROM albums WHERE id = ?', [album_id]);
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    if (action === 'add') {
      // Add files to album, ignoring duplicates
      const stmt = await db.prepare('INSERT OR IGNORE INTO album_files (album_id, file_id) VALUES (?, ?)');
      for (const fileId of file_ids) {
        await stmt.run([album_id, fileId]);
      }
      await stmt.finalize();
    } else if (action === 'remove') {
      // Remove files from album
      const stmt = await db.prepare('DELETE FROM album_files WHERE album_id = ? AND file_id = ?');
      for (const fileId of file_ids) {
        await stmt.run([album_id, fileId]);
      }
      await stmt.finalize();
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be add or remove' }, { status: 400 });
    }

    // Fetch updated file count
    const countResult = await db.get('SELECT COUNT(*) as count FROM album_files WHERE album_id = ?', [album_id]);

    return NextResponse.json({
      success: true,
      album_id,
      action,
      file_count: countResult?.count || 0,
    });
  } catch (error: any) {
    console.error('[Albums PATCH API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/albums
 * Deletes an album.
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
    const album = await db.get('SELECT * FROM albums WHERE id = ?', [id]);

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Delete record (cascading deletes album_files junction matches)
    await db.run('DELETE FROM albums WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Album deleted successfully' });
  } catch (error: any) {
    console.error('[Albums DELETE API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
