#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { PairCooldownStore } from '../scan/pairCooldown.js';
import { TradeHistoryStore } from '../scan/tradeHistory.js';
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
  const pairCooldown = PairCooldownStore.forBot(bot);
  const tradeHistory = TradeHistoryStore.forBot(bot);
  const cache = new OpportunityCache(undefined, pairCooldown, tradeHistory);
  const maxPairs =
    typeof flags['max-pairs'] === 'string'
      ? Number(flags['max-pairs'])
      : undefined;

  console.log(
    `\n[scan:dry-run] bot=${botId} address=${bot.address} ` +
      `selection=${bot.scan.selectionMode} coupledFloor=${bot.scan.minCoupledSpreadBps}bps ` +
      `pairCooldown=${bot.trade.pairCooldownMs / 60_000}min`
  );
  console.log(
    `  DEX set: Uni V2, V3 (100/500/3000/10000), Sushi — no Balancer/Curve`
  );
  const requireBalance = flags['require-balance'] === true;
  console.log(
    `  mode: ${requireBalance ? 'live (needs funded bases)' : 'discover (nominal $ quotes, no balance required)'}`
  );
  console.log(`  DRY_RUN: no transactions\n`);

  const scanner = new QuoteScanner(provider, cache, {
    verbose: true,
    discoverMode: !requireBalance,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
    pairDelayMs: 30,
  });

  const runStart = Date.now();
  const result = await scanner.scanBot(bot);
  if (!result.durationMs) {
    result.durationMs = Date.now() - runStart;
  }
  console.log(formatScanSummary(botId, bot, result, cache));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
