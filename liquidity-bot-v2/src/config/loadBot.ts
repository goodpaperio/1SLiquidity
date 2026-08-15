import fs from 'node:fs';
import { botConfigSchema, type BotConfig } from './schema.js';
import { getBotConfigPath, getBotsDir } from './paths.js';

export function loadBotConfig(botId: string): BotConfig {
  const filePath = getBotConfigPath(botId);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Bot config not found: ${filePath}. Run: npm run generate bot -- ${botId}`
    );
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  const parsed = botConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid bot config ${filePath}: ${parsed.error.message}`
    );
  }
  if (parsed.data.id !== botId.toLowerCase()) {
    throw new Error(
      `Bot id mismatch: file is "${parsed.data.id}", expected "${botId.toLowerCase()}"`
    );
  }
  return parsed.data;
}

export function listBotIds(): string[] {
  const dir = getBotsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter(
      (f: string) => f.endsWith('.json') && !f.endsWith('.example.json')
    )
    .map((f: string) => f.replace(/\.json$/, ''))
    .sort();
}

export function loadEnabledBots(): BotConfig[] {
  return listBotIds()
    .map((id) => loadBotConfig(id))
    .filter((b) => b.enabled);
}

/** Env var name for a bot's private key (e.g. alpha → BOT_ALPHA_KEY). */
export function privateKeyEnvForBotId(botId: string): string {
  return `BOT_${botId.toUpperCase().replace(/-/g, '_')}_KEY`;
}
