#!/usr/bin/env node
import 'dotenv/config';
import { createProvider } from '../chain/provider.js';
import { createBotWallet, isDryRun } from '../chain/wallet.js';
import { loadBotConfig } from '../config/loadBot.js';
import { TradeExecutor } from '../execution/TradeExecutor.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { PairCooldownStore } from '../scan/pairCooldown.js';
import { TradeHistoryStore } from '../scan/tradeHistory.js';
import { formatSelectedTradeBlock } from '../selection/selectForExecution.js';
import {
  QuoteScanner,
  formatFinalistRefreshLog,
  formatScanSummary,
} from '../scan/QuoteScanner.js';
import { pollTradeCompletions } from '../notify/completionWatcher.js';
import { parseCliArgs, requireBotId } from './parse-args.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const wallet = createBotWallet(bot, provider);
  const pairCooldown = PairCooldownStore.forBot(bot);
  const tradeHistory = TradeHistoryStore.forBot(bot);
  const cache = new OpportunityCache(undefined, pairCooldown, tradeHistory);

  const maxPairs =
    typeof flags['max-pairs'] === 'string'
      ? Number(flags['max-pairs'])
      : undefined;

  console.log(
    `\n[run-once] bot=${botId} address=${bot.address} bases=[${bot.baseTokens.join(', ')}]`
  );
  console.log(
    `  selection=${bot.scan.selectionMode} coupledFloor=${bot.scan.minCoupledSpreadBps}bps ` +
      `pairCooldown=${bot.trade.pairCooldownMs / 60_000}min ` +
      `repeatGuard=${bot.trade.minTradesBetweenSamePair} ` +
      `DRY_RUN=${isDryRun() ? '1 (no txs)' : '0 (LIVE)'}`
  );

  const scanner = new QuoteScanner(provider, cache, {
    discoverMode: false,
    verbose: true,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
    pairDelayMs: 30,
  });

  const runStart = Date.now();
  const result = await scanner.scanBot(bot);
  if (!result.durationMs) {
    result.durationMs = Date.now() - runStart;
  }
  console.log(formatScanSummary(botId, bot, result, cache));

  const finalist = await scanner.finalizeExecutionSelection(
    bot,
    result.opportunities,
    cache.selectionStores()
  );
  console.log(formatFinalistRefreshLog(finalist, bot));
  const sel = finalist.final;
  console.log(
    formatSelectedTradeBlock(sel, {
      headline: isDryRun()
        ? 'DRY-RUN: would execute on live run'
        : 'LIVE: executing this trade',
    })
  );

  const opportunity = sel.pick;
  if (!opportunity) {
    console.log('\n[run-once] No eligible opportunity — exiting without trade.');
    process.exit(0);
  }

  console.log(
    `  trade-history recent: ${tradeHistory.recentSummary(8)}`
  );

  const executor = new TradeExecutor(
    bot,
    provider,
    pairCooldown,
    tradeHistory
  );
  await executor.execute(opportunity, wallet);

  const notified = await pollTradeCompletions(bot, provider);
  if (notified > 0) {
    console.log(`[run-once] trade completion alerts sent: ${notified}`);
  }

  console.log('\n[run-once] Done — single run complete.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
