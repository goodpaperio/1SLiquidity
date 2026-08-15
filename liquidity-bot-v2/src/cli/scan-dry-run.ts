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
import {
  formatSelectedTradeBlock,
} from '../selection/selectForExecution.js';
import { formatFinalistRefreshLog } from '../selection/finalistRefresh.js';
import { resolveHotPairsForBot } from '../scan/hotPairs.js';
import { refreshWarmSetFromCex } from '../signal/warmSet.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const bot = loadBotConfig(botId);
  if (flags.watch === 'off' || flags['watch-off'] === true) {
    bot.scan.watchMode = 'off';
  }
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
      `selection=${bot.scan.selectionMode} strategy=${bot.scan.strategyMode} ` +
      `minNet=${bot.scan.minNetBps}bps deca=${bot.scan.decaProtocolFeeBps}bps ` +
      `warm=${bot.scan.warmSetMode} watch=${bot.scan.watchMode} ` +
      `confirmGap=${bot.scan.confirmGapBps ?? 'auto'} maxConfirm=${bot.scan.maxConfirmPairs} ` +
      `sizes=[${bot.scan.sizeSweepUsd.join(',')}] ` +
      `rpcCap=${bot.scan.maxEthCallsPerCycle} ` +
      `coupledFloor=${bot.scan.minCoupledSpreadBps}bps`
  );
  console.log(
    `  DEX set: Uni V2, V3 (100/500/3000/10000), Sushi — no Balancer/Curve`
  );
  const requireBalance = flags['require-balance'] === true;
  console.log(
    `  mode: ${requireBalance ? 'live (needs funded bases)' : 'discover (nominal $ quotes, no balance required)'}`
  );
  console.log(`  DRY_RUN: no transactions\n`);

  // Seed hot + CEX warm-set (signal plane; no Quoter) before quoting.
  if (bot.scan.universeMode === 'hot_pairs') {
    await resolveHotPairsForBot(bot);
  }
  if (bot.scan.warmSetMode !== 'off') {
    try {
      const warm = await refreshWarmSetFromCex(bot);
      console.log(
        `  cexWarmSeed: ${warm.pairs.length} pairs ` +
          `(maxSpread=${warm.maxCexSpreadBps}bps) ` +
          warm.pairs
            .slice(0, 5)
            .map((p) => `${p.targetName}@${p.cexSpreadBps?.toFixed(1)}bps`)
            .join(', ')
      );
    } catch (err) {
      console.log(
        `  cexWarmSeed: failed (${err instanceof Error ? err.message : err})`
      );
    }
  }

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

  // WP2 finalist size-sweep path (matches live BotRunner finalize).
  const finalist = await scanner.finalizeExecutionSelection(
    bot,
    result.opportunities,
    cache.selectionStores()
  );
  console.log(formatFinalistRefreshLog(finalist, bot));
  console.log(
    formatSelectedTradeBlock(finalist.final, {
      headline: 'AFTER SIZE-SWEEP FINALIST PASS',
      emptyMessage:
        'No trade after fee gate + size sweep (need net ≥ minNet after Deca).',
    })
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
