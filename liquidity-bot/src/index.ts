import 'dotenv/config';
import { loadBotConfig } from './config/loadBot.js';
import { BotRunner } from './runner/BotRunner.js';

async function main(): Promise<void> {
  const botId = process.env.BOT_ID?.trim().toLowerCase();
  if (!botId) {
    console.error('BOT_ID env required (set by PM2 or: BOT_ID=alpha node dist/index.js)');
    process.exit(1);
  }

  const config = loadBotConfig(botId);
  if (!config.enabled) {
    console.warn(`[${botId}] enabled=false — exiting. Set enabled:true in bots/${botId}.json`);
    process.exit(0);
  }

  const key = process.env[config.privateKeyEnv]?.trim();
  if (!key) {
    console.error(`Missing ${config.privateKeyEnv} in liquidity-bot/.env`);
    process.exit(1);
  }

  const runner = new BotRunner(config);
  process.on('SIGINT', () => runner.stop());
  process.on('SIGTERM', () => runner.stop());
  await runner.run();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
