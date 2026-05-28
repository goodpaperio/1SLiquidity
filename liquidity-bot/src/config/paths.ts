import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/** Monorepo root (parent of liquidity-bot). */
export function getRepoRoot(): string {
  const fromEnv = process.env.REPO_ROOT?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.resolve(PACKAGE_ROOT, '..');
}

export function getPackageRoot(): string {
  return PACKAGE_ROOT;
}

export function getBotsDir(): string {
  return path.join(getPackageRoot(), 'bots');
}

export function getBotCooldownPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (safe !== botId.toLowerCase()) {
    throw new Error(`Invalid bot id: ${botId}`);
  }
  return path.join(getBotsDir(), `${safe}.cooldowns.json`);
}

export function getBotTradeHistoryPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (safe !== botId.toLowerCase()) {
    throw new Error(`Invalid bot id: ${botId}`);
  }
  return path.join(getBotsDir(), `${safe}.trade-history.json`);
}

export function getBotConfigPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (safe !== botId.toLowerCase()) {
    throw new Error(`Invalid bot id: ${botId}`);
  }
  return path.join(getBotsDir(), `${safe}.json`);
}

export function resolveFromRepo(relativePath: string): string {
  return path.resolve(getRepoRoot(), relativePath);
}

export function assertRepoLayout(): void {
  const configDir = path.join(getRepoRoot(), 'config');
  if (!fs.existsSync(configDir)) {
    throw new Error(
      `Expected config/ at repo root (${getRepoRoot()}). Set REPO_ROOT if running from a different layout.`
    );
  }
}
