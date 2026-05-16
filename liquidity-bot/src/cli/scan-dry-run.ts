#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import {
  QuoteScanner,
  formatScanSummary,
} from '../scan/QuoteScanner.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const cache = new OpportunityCache();
  const maxPairs =
    typeof flags['max-pairs'] === 'string'
      ? Number(flags['max-pairs'])
      : undefined;

  console.log(
    `\n[scan:dry-run] bot=${botId} address=${bot.address} minSpread=${bot.scan.minSpreadBps}bps`
  );
  console.log(
    `  DEX set: Uni V2, V3 (100/500/3000/10000), Sushi — no Balancer/Curve`
  );
  console.log(`  DRY_RUN: no transactions\n`);

  const scanner = new QuoteScanner(provider, cache, {
    verbose: true,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
    pairDelayMs: 30,
  });

  const result = await scanner.scanBot(bot);
  console.log(formatScanSummary(botId, result, cache));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
