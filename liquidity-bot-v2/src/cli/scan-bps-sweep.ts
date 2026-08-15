#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import { QuoteScanner } from '../scan/QuoteScanner.js';
import { detectOpportunitiesForPair } from '../scan/opportunityDetector.js';
import type { BotConfig } from '../config/schema.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const maxPairs =
    typeof flags['max-pairs'] === 'string'
      ? Number(flags['max-pairs'])
      : undefined;

  const thresholds = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100];

  console.log(`\n[bps-sweep] bot=${botId} universe scan + threshold sweep`);
  console.log(`  nominal: $${bot.trade.nominalTradeUsd}  minLiquidityRatio: ${bot.scan.minLiquidityRatio}`);
  console.log(`  thresholds: ${thresholds.join(', ')} bps\n`);

  const quoteService = new DexQuoteService(provider);
  const scanner = new QuoteScanner(provider, new OpportunityCache(), {
    discoverMode: true,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
    pairDelayMs: 15,
  });

  const sweepStart = Date.now();
  let lastLog = 0;

  const collected = await collectWithProgress(scanner, bot, (info) => {
    if (info.index - lastLog >= 25 || info.index === info.total) {
      lastLog = info.index;
      const pct = ((info.index / info.total) * 100).toFixed(0);
      console.log(
        `  [${pct}%] ${info.index}/${info.total} ${info.pair.baseSymbol}→${info.pair.targetName}  elapsed ${(info.elapsedMs / 1000).toFixed(0)}s`
      );
    }
  });

  const scanSec = (collected.durationMs / 1000).toFixed(1);
  console.log(
    `\nRPC scan done: ${collected.pairsScanned} pairs quoted in ${scanSec}s` +
      ` (skipped ${collected.pairsSkipped}, errors ${collected.errors}, universe ${collected.totalPairsInUniverse})`
  );

  console.log('\nOpportunities by minSpreadBps (same quotes, different threshold):\n');
  console.log('  minSpreadBps | opportunities | pairs w/ hit');
  console.log('  -------------|---------------|-------------');

  const sweepResults: { bps: number; count: number; pairsWithHit: number }[] = [];

  for (const bps of thresholds) {
    const botAtBps: BotConfig = {
      ...bot,
      scan: { ...bot.scan, minSpreadBps: bps },
    };
    let count = 0;
    let pairsWithHit = 0;
    for (const snap of collected.snapshots) {
      const opps = await detectOpportunitiesForPair(
        snap.tradePair,
        snap.amountIn,
        snap.quotes,
        botAtBps,
        quoteService
      );
      if (opps.length > 0) pairsWithHit++;
      count += opps.length;
    }
    sweepResults.push({ bps, count, pairsWithHit });
    console.log(
      `  ${String(bps).padStart(12)} | ${String(count).padStart(13)} | ${pairsWithHit}`
    );
  }

  const totalSec = ((Date.now() - sweepStart) / 1000).toFixed(1);
  const at100 = sweepResults.find((r) => r.bps === 100);
  const at1000 = sweepResults.find((r) => r.bps === 1000);

  console.log(`\nTotal wall time: ${totalSec}s (scan ${scanSec}s + instant threshold pass)`);
  console.log(
    `Resolution: at 1000 bps → ${at1000?.count ?? 0} opps (${at1000?.pairsWithHit ?? 0} pairs); ` +
      `at 100 bps → ${at100?.count ?? 0} opps (${at100?.pairsWithHit ?? 0} pairs)\n`
  );
}

async function collectWithProgress(
  scanner: QuoteScanner,
  bot: BotConfig,
  onProgress: (info: {
    index: number;
    total: number;
    pair: { baseSymbol: string; targetName: string };
    elapsedMs: number;
  }) => void
) {
  const { collectQuoteSnapshots } = await import('../scan/collectQuotes.js');
  return collectQuoteSnapshots(scanner, bot, {
    discoverMode: true,
    maxPairs: undefined,
    onProgress,
  });
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
