#!/usr/bin/env node
/**
 * Per-pair matrix: forward spread | backward spread | coupled round-trip.
 * Plus mid-range selection preview (default execution model).
 */
import 'dotenv/config';
import fs from 'node:fs';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import {
  buildPairMatrixRow,
  selectMidRangeCoupled,
  type PairMatrixRow,
} from '../scan/pairMatrix.js';
import { collectQuoteSnapshots } from '../scan/collectQuotes.js';
import { QuoteScanner } from '../scan/QuoteScanner.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s.padEnd(n);
}

function formatRow(r: PairMatrixRow): string {
  const pair = `${r.baseSymbol}→${r.targetName}`;
  return (
    `${pad(pair, 18)}  ` +
    `fwd=${String(r.forwardSpreadBps).padStart(5)}  ` +
    `bwd=${String(r.backwardSpreadBps).padStart(5)}  ` +
    `coupled=${String(r.coupledSpreadBps).padStart(6)}  ` +
    `deca=${r.decaViable ? 'Y' : 'N'}  ` +
    `thin=${r.coupledThinDex ?? '-'}`
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
  const topN = typeof flags.top === 'string' ? Number(flags.top) : 20;
  const jsonPath = typeof flags.json === 'string' ? flags.json : undefined;

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const quoteService = new DexQuoteService(provider);
  const scanner = new QuoteScanner(provider, new OpportunityCache(), {
    discoverMode: true,
    pairDelayMs: 20,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
  });

  console.log(
    `\n[scan:pair-matrices] bot=${botId} nominal=$${bot.trade.nominalTradeUsd}\n` +
      `  forward  = max base→alt vs deepest BUY (all DEXs)\n` +
      `  backward = max alt→base vs deepest SELL at alt from deep buy\n` +
      `  coupled  = best thin-buy + deep-sell signed round-trip at trade size\n`
  );

  const collected = await collectQuoteSnapshots(scanner, bot, {
    discoverMode: true,
    maxPairs: Number.isFinite(maxPairs) ? maxPairs : undefined,
    onProgress: (p) => {
      if (p.index % 25 === 0 || p.index === p.total) {
        console.log(`  quotes ${p.index}/${p.total}  ${(p.elapsedMs / 1000).toFixed(0)}s`);
      }
    },
  });

  const rows: PairMatrixRow[] = [];
  for (const snap of collected.snapshots) {
    if (snap.direction !== 'forward') continue;
    const row = await buildPairMatrixRow(
      snap.tradePair,
      snap.amountIn,
      snap.quotes,
      quoteService
    );
    if (row) rows.push(row);
  }

  const byCoupled = [...rows].sort(
    (a, b) => b.coupledSpreadBps - a.coupledSpreadBps
  );
  const byForward = [...rows].sort(
    (a, b) => b.forwardSpreadBps - a.forwardSpreadBps
  );
  const byBackward = [...rows].sort(
    (a, b) => b.backwardSpreadBps - a.backwardSpreadBps
  );

  const fwdPos = rows.filter((r) => r.forwardSpreadBps > 0).length;
  const bwdPos = rows.filter((r) => r.backwardSpreadBps > 0).length;
  const coupledPos = rows.filter((r) => r.coupledSpreadBps > 0).length;
  const viable = rows.filter((r) => r.decaViable).length;

  console.log('--- Summary ---');
  console.log(`  pairs quoted:        ${collected.pairsScanned}`);
  console.log(`  matrix rows:         ${rows.length}`);
  console.log(`  deca-viable routes:  ${viable}`);
  console.log(`  forward spread > 0:  ${fwdPos}`);
  console.log(`  backward spread > 0: ${bwdPos}`);
  console.log(`  coupled spread > 0:  ${coupledPos}`);

  const selection = selectMidRangeCoupled(rows, {
    onlyDecaViable: true,
    minCoupledSpreadBps: bot.scan.minCoupledSpreadBps,
  });
  console.log(
    `  coupled floor:         ${bot.scan.minCoupledSpreadBps} bps (reject worse)`
  );
  console.log('\n--- Default selection (p25 floor, max coupled above) ---');
  console.log(
    `  floor p25=${selection.bandLow} bps  best=${selection.bandHigh} bps  ` +
      `eligible=${selection.eligibleCount}`
  );
  if (selection.pick) {
    console.log(`  WOULD EXECUTE: ${formatRow(selection.pick)}`);
  } else {
    console.log('  WOULD EXECUTE: (none)');
  }

  console.log(`\n--- Top ${topN} by coupled spread ---`);
  console.log(
    `  ${pad('pair', 18)}  fwd    bwd    coupled  deca  thin`
  );
  for (const r of byCoupled.slice(0, topN)) {
    console.log(`  ${formatRow(r)}`);
  }

  console.log(`\n--- Top ${Math.min(10, topN)} forward-only (isolated A→B) ---`);
  for (const r of byForward.slice(0, 10)) {
    console.log(`  ${formatRow(r)}`);
  }

  console.log(`\n--- Top ${Math.min(10, topN)} backward-only (isolated B→A @ deep-buy alt) ---`);
  for (const r of byBackward.slice(0, 10)) {
    console.log(`  ${formatRow(r)}`);
  }

  if (jsonPath) {
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          summary: {
            pairsScanned: collected.pairsScanned,
            rows: rows.length,
            forwardPositive: fwdPos,
            backwardPositive: bwdPos,
            coupledPositive: coupledPos,
            selection,
          },
          rows: rows.map((r) => ({
            ...r,
            amountIn: r.amountIn.toString(),
            altRefWei: r.altRefWei.toString(),
          })),
        },
        null,
        2
      )
    );
    console.log(`\n  wrote ${jsonPath}\n`);
  } else {
    console.log('');
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
