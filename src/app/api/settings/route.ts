import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/settings
 * Retrieves current Telegram settings (masked for security).
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    const tokenSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['telegram_bot_token']);
    const chatIdSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['telegram_chat_id']);

    const token = tokenSetting?.value || '';
    const chatId = chatIdSetting?.value || '';

    // Mask the token and chat ID for security
    const maskedToken = token
      ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}`
      : '';
    const maskedChatId = chatId
      ? `${chatId.substring(0, 4)}...${chatId.substring(chatId.length - 3)}`
      : '';

    return NextResponse.json({
      success: true,
      settings: {
        telegram_bot_token: maskedToken,
        telegram_chat_id: maskedChatId,
        isConfigured: !!(token && chatId),
      },
    });
  } catch (error: any) {
    console.error('[Settings GET API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/settings
 * Saves Telegram settings to SQLite.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { telegram_bot_token, telegram_chat_id } = await req.json();

    if (!telegram_bot_token || !telegram_chat_id) {
      return NextResponse.json(
        { error: 'telegram_bot_token and telegram_chat_id are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Insert or update keys
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'telegram_bot_token',
      telegram_bot_token.trim(),
    ]);

    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'telegram_chat_id',
      telegram_chat_id.trim(),
    ]);

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('[Settings POST API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
