import 'dotenv/config';
import { loadTelegramConfig, prefixBotMessage, sendTelegram } from '../notify/telegram.js';

async function main(): Promise<void> {
  const botId = process.argv[2]?.trim().toLowerCase() ?? 'alpha';
  const config = loadTelegramConfig();
  if (!config) {
    console.error(
      'Telegram disabled. Set TELEGRAM_ENABLED=1, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID in .env'
    );
    process.exit(1);
  }
  const ok = await sendTelegram(
    prefixBotMessage(botId, '✅ liquidity-bot Telegram test OK'),
    config
  );
  console.log(ok ? `[${botId}] test message sent` : `[${botId}] send failed`);
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
