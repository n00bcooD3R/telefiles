import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { uploadToTelegram } from '@/lib/telegram';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type || 'application/octet-stream';

    // File size safety limit: Telegram Bot API limit is 50MB
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds Telegram limit of 50MB' },
        { status: 400 }
      );
    }

    // Read the file stream into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine category based on MIME type
    let category = 'document';
    if (mimeType.startsWith('image/')) {
      category = 'image';
    } else if (mimeType.startsWith('video/')) {
      category = 'video';
    } else if (mimeType.startsWith('audio/')) {
      category = 'audio';
    }

    // Upload to Telegram group
    console.log(`[privfiles Upload] Uploading "${fileName}" (${fileSize} bytes, ${mimeType}) to Telegram...`);
    const { fileId, messageId } = await uploadToTelegram(buffer, fileName, mimeType);
    console.log(`[privfiles Upload] Uploaded successfully! Telegram File ID: ${fileId}, Message ID: ${messageId}`);

    // Insert metadata into SQLite
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO files (telegram_file_id, telegram_message_id, file_name, file_size, mime_type, category, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [fileId, messageId, fileName, fileSize, mimeType, category]
    );

    // Fetch the newly created file record
    const newFile = await db.get('SELECT * FROM files WHERE id = ?', [result.lastID]);

    return NextResponse.json({ success: true, file: newFile });
  } catch (error: any) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
