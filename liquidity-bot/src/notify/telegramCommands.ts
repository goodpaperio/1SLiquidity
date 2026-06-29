import fs from 'node:fs';
import { getBotsDir } from '../config/paths.js';

export interface TelegramPollState {
  lastUpdateId: number;
}

export function getTelegramStatePath(botId: string): string {
  return `${getBotsDir()}/${botId}.telegram-state.json`;
}

export function readTelegramPollState(botId: string): TelegramPollState {
  const p = getTelegramStatePath(botId);
  if (!fs.existsSync(p)) return { lastUpdateId: 0 };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as TelegramPollState;
  } catch {
    return { lastUpdateId: 0 };
  }
}

export function writeTelegramPollState(
  botId: string,
  state: TelegramPollState
): void {
  fs.mkdirSync(getBotsDir(), { recursive: true });
  fs.writeFileSync(
    getTelegramStatePath(botId),
    JSON.stringify(state, null, 2) + '\n'
  );
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

export interface CommandHandlers {
  liquify: () => Promise<string>;
  status: () => Promise<string>;
  pause: () => string;
  resume: () => string;
  help: () => string;
}

export function parseTelegramCommand(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const cmd = trimmed.split(/\s+/)[0]?.toLowerCase().replace(/@\w+$/, '');
  return cmd ?? null;
}

export async function pollTelegramCommands(
  botToken: string,
  authorizedChatId: string,
  botId: string,
  handlers: CommandHandlers
): Promise<void> {
  const state = readTelegramPollState(botId);
  const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${state.lastUpdateId + 1}&timeout=0&limit=10`;

  let data: { ok?: boolean; result?: TelegramUpdate[] };
  try {
    const response = await fetch(url);
    data = (await response.json()) as typeof data;
  } catch (err) {
    console.warn(
      '[telegram-cmd] poll failed:',
      err instanceof Error ? err.message : err
    );
    return;
  }

  if (!data.ok || !data.result?.length) return;

  let maxId = state.lastUpdateId;
  for (const update of data.result) {
    if (update.update_id > maxId) maxId = update.update_id;
    const msg = update.message;
    if (!msg?.text) continue;
    if (String(msg.chat.id) !== authorizedChatId) continue;

    const cmd = parseTelegramCommand(msg.text);
    if (!cmd) continue;

    let reply = '';
    try {
      switch (cmd) {
        case '/liquify':
          reply = await handlers.liquify();
          break;
        case '/status':
          reply = await handlers.status();
          break;
        case '/pause':
          reply = handlers.pause();
          break;
        case '/resume':
          reply = handlers.resume();
          break;
        case '/help':
          reply = handlers.help();
          break;
        default:
          reply = 'Unknown command. Try /help';
      }
    } catch (err) {
      reply = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    await sendTelegramReply(botToken, authorizedChatId, reply);
  }

  if (maxId > state.lastUpdateId) {
    writeTelegramPollState(botId, { lastUpdateId: maxId });
  }
}

async function sendTelegramReply(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
}

export function formatHelpMessage(): string {
  return (
    '<b>Commands</b>\n' +
    '/status — ETH, WETH, outstanding trades\n' +
    '/liquify — sweep allowlisted dust → base token\n' +
    '/pause — skip trading cycles\n' +
    '/resume — resume trading\n' +
    '/help — this message'
  );
}
