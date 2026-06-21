import { getDb } from '@/lib/db';

/**
 * Resolves Telegram credentials.
 * Prioritizes SQLite database settings, then falls back to environment variables.
 */
async function getCredentials(): Promise<{ token: string; chatId: string }> {
  try {
    const db = await getDb();
    
    const tokenSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['telegram_bot_token']);
    const chatIdSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['telegram_chat_id']);

    const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = chatIdSetting?.value || process.env.TELEGRAM_CHAT_ID;

    if (!token || token === 'your_bot_token_here') {
      throw new Error('Telegram Bot Token is not configured. Please go to Settings/Setup Wizard.');
    }
    if (!chatId || chatId === 'your_chat_id_here') {
      throw new Error('Telegram Chat ID is not configured. Please go to Settings/Setup Wizard.');
    }

    return { token, chatId };
  } catch (error) {
    throw new Error('Failed to resolve Telegram configuration credentials.');
  }
}

export interface TelegramUploadResult {
  fileId: string;
  messageId: number;
}

/**
 * Uploads a file buffer to the configured Telegram group/channel.
 * Uses sendDocument to preserve original quality, format, and filename.
 */
export async function uploadToTelegram(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<TelegramUploadResult> {
  const { token, chatId } = await getCredentials();

  const formData = new FormData();
  formData.append('chat_id', chatId);

  const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append('document', fileBlob, fileName);

  const url = `https://api.telegram.org/bot${token}/sendDocument`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error('[Telegram Upload Error Response]:', data);
    throw new Error(data.description || 'Failed to upload file to Telegram');
  }

  const message = data.result;
  const document = message.document;

  if (!document) {
    throw new Error('Telegram response did not contain document metadata');
  }

  return {
    fileId: document.file_id,
    messageId: message.message_id,
  };
}

/**
 * Retrieves the direct file path of a Telegram file using its file_id.
 * Resolves to the proxy URL on Telegram's servers.
 */
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const { token } = await getCredentials();

  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error('[Telegram GetFile Error Response]:', data);
    throw new Error(data.description || 'Failed to retrieve file details from Telegram');
  }

  const filePath = data.result.file_path;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

/**
 * Deletes a message containing a file from the Telegram chat.
 * Requires the bot to be an administrator in the group.
 */
export async function deleteFromTelegram(messageId: number): Promise<boolean> {
  try {
    const { token, chatId } = await getCredentials();

    const url = `https://api.telegram.org/bot${token}/deleteMessage?chat_id=${chatId}&message_id=${messageId}`;
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn(`[Telegram Delete Warning]: Message ${messageId} could not be deleted.`, data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Delete Error]:', error);
    return false;
  }
}
