export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export function loadTelegramConfig(): TelegramConfig | null {
  const enabled =
    process.env.TELEGRAM_ENABLED === '1' ||
    process.env.TELEGRAM_ENABLED === 'true';
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? '';
  if (!enabled || !botToken || !chatId) return null;
  return { enabled, botToken, chatId };
}

/** Send HTML message; no-op when Telegram is disabled. */
export async function sendTelegram(
  message: string,
  config: TelegramConfig | null = loadTelegramConfig()
): Promise<boolean> {
  if (!config) return false;
  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = (await response.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.warn('[telegram] API error:', data.description ?? data);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      '[telegram] send failed:',
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export function prefixBotMessage(botId: string, body: string): string {
  return `<b>bot=${botId}</b>\n${body}`;
}
