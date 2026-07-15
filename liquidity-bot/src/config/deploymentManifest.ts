import fs from 'node:fs';
import path from 'node:path';
import type { BotConfig } from './schema.js';
import { getPackageRoot } from './paths.js';

interface DeploymentManifest {
  deploymentBlock?: number;
  contracts?: { Core?: string };
}

/**
 * Resolve Core `deploymentBlock` from `bot.contracts.deploymentManifest`.
 * Paths in bot configs are relative to `liquidity-bot/` (e.g. ../versions/…).
 */
export function resolveDeploymentManifestPath(bot: BotConfig): string {
  const raw = bot.contracts.deploymentManifest.trim();
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(getPackageRoot(), raw);
}

export function loadCoreDeploymentBlock(bot: BotConfig): number {
  const manifestPath = resolveDeploymentManifestPath(bot);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Deployment manifest not found for bot "${bot.id}": ${manifestPath}`
    );
  }
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf8')
  ) as DeploymentManifest;
  const block = Number(manifest.deploymentBlock);
  if (!Number.isFinite(block) || block <= 0) {
    throw new Error(
      `Invalid deploymentBlock in ${manifestPath} for bot "${bot.id}"`
    );
  }

  const coreAddr = bot.contracts.core.toLowerCase();
  const manifestCore = manifest.contracts?.Core?.toLowerCase();
  if (manifestCore && manifestCore !== coreAddr) {
    console.warn(
      `[${bot.id}] deployment manifest Core ${manifest.contracts?.Core} ` +
        `!= bot.contracts.core ${bot.contracts.core}; still using deploymentBlock=${block}`
    );
  }

  return Math.floor(block);
}
