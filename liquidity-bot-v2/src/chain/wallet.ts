import { Wallet, type Provider } from 'ethers';
import type { BotConfig } from '../config/schema.js';

export function isDryRun(): boolean {
  const v = process.env.DRY_RUN?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function createBotWallet(
  bot: BotConfig,
  provider: Provider
): Wallet {
  const key = process.env[bot.privateKeyEnv]?.trim();
  if (!key) {
    throw new Error(
      `Missing ${bot.privateKeyEnv} in liquidity-bot/.env`
    );
  }
  return new Wallet(key, provider);
}
