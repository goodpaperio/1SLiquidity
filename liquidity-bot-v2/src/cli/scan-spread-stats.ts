#!/usr/bin/env node
/**
 * Spread distribution across every candidate route (gated or not).
 * Use to pick a minSpreadBps floor for "always trade best spread" mode.
 */
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import { buildCandidateEdges } from '../scan/opportunityDetector.js';
import { collectQuoteSnapshots } from '../scan/collectQuotes.js';
import { QuoteScanner } from '../scan/QuoteScanner.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import type { ScanOpportunity } from '../scan/types.js';

function distribution(values: number[]): {
  n: number;
  mean: number;
  p25: number;
  p50: number;
  p75: number;
  min: number;
  max: number;
} | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const pct = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  return {
    n: values.length,
    mean: Math.round(mean * 10) / 10,
    p25: pct(0.25),
    p50: pct(0.5),
    p75: pct(0.75),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function fmtDist(label: string, d: ReturnType<typeof distribution>): void {
  if (!d) {
    console.log(`  ${label}: (no data)`);
    return;
  }
  console.log(
    `  ${label}: n=${d.n}  mean=${d.mean}  p25=${d.p25}  p50=${d.p50}  ` +
      `p75=${d.p75}  min=${d.min}  max=${d.max}`
  );
}

function countAbove(values: number[], thresholds: number[]): void {
  console.log('\n  Count of edges with buySpreadBps >= threshold:');
  for (const t of thresholds) {
    const c = values.filter((v) => v >= t).length;
    console.log(`    >= ${String(t).padStart(4)} bps: ${c}`);
  }
}

function countRtAbove(values: number[], thresholds: number[]): void {
  console.log('\n  Count of edges with signed roundTripBps >= threshold:');
  for (const t of thresholds) {
    const c = values.filter((v) => v >= t).length;
    console.log(`    >= ${String(t).padStart(4)} bps: ${c}`);
  }
}

function bestPerPair(edges: ScanOpportunity[]): ScanOpportunity[] {
  const byPair = new Map<string, ScanOpportunity[]>();
  for (const e of edges) {
    const list = byPair.get(e.pairKey) ?? [];
    list.push(e);
    byPair.set(e.pairKey, list);
  }
  return [...byPair.values()].map((list) =>
    list.reduce((a, b) => (b.buySpreadBps > a.buySpreadBps ? b : a))
  );
}

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const maxPairs =
    typeof flags['max-pairs'] === 'string'
      ? Number(flags['max-pairs'])
      : undefined;

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const quoteService = new DexQuoteService(provider);
  const scanner = new QuoteScanner(provider, new OpportunityCache(), {
    discoverMode: true,
    pairDelayMs: 20,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
  });

  console.log(
    `\n[scan:spread-stats] bot=${botId} nominal=$${bot.trade.nominalTradeUsd} ` +
      `current minSpreadBps=${bot.scan.minSpreadBps}\n`
  );

  const collected = await collectQuoteSnapshots(scanner, bot, {
    discoverMode: true,
    maxPairs: Number.isFinite(maxPairs) ? maxPairs : undefined,
    onProgress: (p) => {
      if (p.index % 25 === 0 || p.index === p.total) {
        console.log(
          `  quotes ${p.index}/${p.total}  ${(p.elapsedMs / 1000).toFixed(0)}s`
        );
      }
    },
  });

  const allEdges: ScanOpportunity[] = [];
  for (const snap of collected.snapshots) {
    const edges = await buildCandidateEdges(
      snap.tradePair,
      snap.amountIn,
      snap.quotes,
      quoteService
    );
    allEdges.push(...edges);
  }

  const buySpreadAll = allEdges.map((e) => e.buySpreadBps);
  const buySpreadPos = buySpreadAll.filter((v) => v > 0);
  const rtAll = allEdges.map((e) => e.roundTripBps);
  const perPairBest = bestPerPair(allEdges);
  const buySpreadBest = perPairBest.map((e) => e.buySpreadBps).filter((v) => v > 0);
  const rtBest = perPairBest.map((e) => e.roundTripBps);

  const thresholds = [0, 25, 50, 75, 100, 150, 200, 300, 500];

  console.log('\n--- All candidate edges (every thin pool vs deep buy) ---');
  fmtDist('buySpreadBps (all)', distribution(buySpreadAll));
  fmtDist('buySpreadBps (>0 only)', distribution(buySpreadPos));
  fmtDist('signed roundTripBps (all)', distribution(rtAll));
  countAbove(buySpreadAll, thresholds);
  countRtAbove(rtAll, thresholds);

  console.log('\n--- Per-pair winner (max buySpreadBps on that pair) ---');
  fmtDist('best buySpreadBps (>0)', distribution(buySpreadBest));
  fmtDist('signed roundTrip at best-buy route', distribution(rtBest));

  const alwaysTrade = [...perPairBest].sort(
    (a, b) => b.buySpreadBps - a.buySpreadBps
  )[0];
  if (alwaysTrade) {
    console.log('\n--- "Always trade" pick (global max buySpreadBps) ---');
    console.log(
      `  ${alwaysTrade.baseSymbol}→${alwaysTrade.targetName}  ` +
        `buySpr=${alwaysTrade.buySpreadBps}  signedRt=${alwaysTrade.roundTripBps}  ` +
        `thin=${alwaysTrade.candidateDex}  deepBuy=${alwaysTrade.deepBuyDex}`
    );
  }

  const atCurrentMin = buySpreadAll.filter(
    (v) => v >= bot.scan.minSpreadBps
  ).length;
  console.log(
    `\n  At current minSpreadBps=${bot.scan.minSpreadBps} (buy-only): ` +
      `${atCurrentMin} edges would pass buy spread alone; ` +
      `0 pass profitable round-trip at $${bot.trade.nominalTradeUsd} (from prior ecosystem scan).`
  );

  const suggested = distribution(buySpreadBest)?.p50 ?? 0;
  console.log(
    `\n  Suggested floor for always-trade (median best-per-pair buySpr): ~${Math.max(0, Math.floor(suggested))} bps`
  );
  console.log(
    `  (p75 best-per-pair buySpr: ${distribution(buySpreadBest)?.p75 ?? 'n/a'} bps)\n`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
