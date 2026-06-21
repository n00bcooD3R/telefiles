import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bot_token } = await req.json();

    if (!bot_token) {
      return NextResponse.json({ error: 'bot_token parameter is required' }, { status: 400 });
    }

    const cleanToken = bot_token.trim();
    const telegramUrl = `https://api.telegram.org/bot${cleanToken}/getUpdates`;

    console.log(`[Chat Detection] Scanning updates for bot...`);
    const response = await fetch(telegramUrl, { method: 'GET', cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('[Chat Detection API Error Response]:', data);
      return NextResponse.json(
        { error: data.description || 'Failed to fetch updates from Telegram API. Verify your Bot Token.' },
        { status: 400 }
      );
    }

    const updates = data.result || [];
    const detectedChats: Array<{ id: number; title: string; type: string }> = [];
    const seenIds = new Set<number>();

    // Helper function to add a unique chat to the results list
    const addChat = (chat: any) => {
      if (chat && (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel')) {
        if (!seenIds.has(chat.id)) {
          seenIds.add(chat.id);
          detectedChats.push({
            id: chat.id,
            title: chat.title || 'Untitled Group',
            type: chat.type,
          });
        }
      }
    };

    // Scan updates array
    for (const update of updates) {
      // Look in standard message structures
      if (update.message?.chat) {
        addChat(update.message.chat);
      }
      
      // Look in group additions/my_chat_member changes (when bot is added to a group)
      if (update.my_chat_member?.chat) {
        addChat(update.my_chat_member.chat);
      }

      // Look in channel posts
      if (update.channel_post?.chat) {
        addChat(update.channel_post.chat);
      }
    }

    return NextResponse.json({
      success: true,
      chats: detectedChats,
      rawCount: updates.length,
    });
  } catch (error: any) {
    console.error('[Telegram Chat Detection API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
