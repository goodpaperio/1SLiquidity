#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId = requireBotId(positional);
  const to = flags.to;
  if (typeof to !== 'string' || !ADDRESS_RE.test(to)) {
    throw new Error(
      'Valid --to 0x address required. Example: npm run withdraw bot -- alpha --to 0x...'
    );
  }

  const config = loadBotConfig(botId);
  const dryRun = flags['dry-run'] === true || process.env.DRY_RUN === '1';

  console.log(`\nWithdraw plan for bot "${botId}"`);
  console.log(`  from: ${config.address}`);
  console.log(`  to:   ${to}`);
  console.log(`  mode: ${dryRun ? 'DRY_RUN' : 'LIVE'}\n`);

  if (dryRun) {
    console.log(
      'Would sweep ERC20 balances and ETH (full chain sweep in a later phase).'
    );
    console.log('Unset DRY_RUN and pass --no-dry-run when swap/transfer logic ships.\n');
    return;
  }

  throw new Error(
    'Live withdraw not implemented yet. Use --dry-run or DRY_RUN=1 to preview.'
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
