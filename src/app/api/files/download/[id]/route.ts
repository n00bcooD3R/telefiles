import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTelegramFileUrl } from '@/lib/telegram';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const file = await db.get('SELECT * FROM files WHERE id = ?', [id]);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get Telegram direct download URL
    const telegramUrl = await getTelegramFileUrl(file.telegram_file_id);

    // Fetch the binary stream from Telegram
    const response = await fetch(telegramUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch file from Telegram: ${response.statusText}`);
    }

    // Get stream reader or raw body
    const fileStream = response.body;

    if (!fileStream) {
      throw new Error('Telegram file response body is empty');
    }

    // Check if client requested a forced download
    const searchParams = req.nextUrl.searchParams;
    const forceDownload = searchParams.get('download') === 'true';

    const dispositionType = forceDownload ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(file.file_name);

    // Set correct proxy headers
    const headers = new Headers();
    headers.set('Content-Type', file.mime_type || 'application/octet-stream');
    headers.set('Content-Length', file.file_size.toString());
    headers.set(
      'Content-Disposition',
      `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`
    );
    headers.set('Cache-Control', 'private, max-age=86400'); // Cache locally for 1 day

    return new Response(fileStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[Download API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
