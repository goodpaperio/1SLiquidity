#!/usr/bin/env tsx
import 'dotenv/config';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { createBotWallet } from '../chain/wallet.js';
import { runLiquifySweep } from '../ops/liquifySweep.js';
import { ensurePriceCache } from '../ops/priceCache.js';

async function main(): Promise<void> {
  const botId = process.argv.find((a) => a.startsWith('--bot='))?.split('=')[1]
    ?? process.env.BOT_ID
    ?? 'alpha';

  await ensurePriceCache();
  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const wallet = createBotWallet(bot, provider);
  const result = await runLiquifySweep(bot, provider, wallet);
  console.log(result.message);
  if (result.txHashes.length) {
    for (const h of result.txHashes) console.log('tx:', h);
  }
  if (result.skipped.length) {
    console.log('skipped:', result.skipped.length);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
