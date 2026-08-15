#!/usr/bin/env node
/**
 * Sync this host's liquidity-bot with origin/<branch> and restart PM2.
 *
 *   npm run pull -- alpha
 *   npm run pull -- alpha --status
 *   npm run pull -- alpha --dry-run
 *   PULL_BRANCH=main npm run pull -- alpha
 */
import 'dotenv/config';
import { parseCliArgs } from './parse-args.js';
import {
  getPullStatus,
  startSelfUpdate,
} from '../ops/selfUpdate.js';

async function main(): Promise<void> {
  const { command, positional, flags } = parseCliArgs(process.argv);
  const botId = (
    positional[0] ??
    (command && command !== 'bot' ? command : undefined)
  )?.toLowerCase();
  if (!botId) {
    throw new Error('Bot id required. Example: npm run pull -- alpha');
  }
  const branch =
    (typeof flags.branch === 'string' ? flags.branch : undefined) ??
    process.env.PULL_BRANCH ??
    'main';

  if (flags.status === true || flags.status === 'true') {
    try {
      const { spawnSync } = await import('node:child_process');
      const { getRepoRoot } = await import('../config/paths.js');
      spawnSync('git', ['fetch', 'origin', branch], {
        cwd: getRepoRoot(),
        stdio: 'ignore',
      });
    } catch {
      /* ignore */
    }
    const status = getPullStatus(branch);
    console.log(status.message);
    process.exit(status.behind ? 2 : 0);
  }

  const result = startSelfUpdate({
    botId,
    branch,
    dryRun: flags['dry-run'] === true || flags['dry-run'] === 'true',
    allowDirty: flags['allow-dirty'] === true || flags['allow-dirty'] === 'true',
    detached: false,
  });

  console.log(result.message);
  process.exit(result.started ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
