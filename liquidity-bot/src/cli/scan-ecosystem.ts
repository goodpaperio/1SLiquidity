#!/usr/bin/env node
/**
 * Full-universe scan: rank round-trip edges (new detector) for ecosystem health.
 *
 * Quoting model (no separate "price" step):
 *   - Uni V2 / Sushi: router.getAmountsOut(amountIn, [tokenIn, tokenOut]) → amountOut
 *   - Uni V3: QuoterV2.quoteExactInputSingle(amountIn) → amountOut
 *   - Buy spread (diagnostic): (altOut_candidate − altOut_deepBuy) / altOut_deepBuy
 *   - Round-trip bps: (predictedBaseOut − amountIn) / amountIn
 *     where predictedBaseOut = quote(alt→base, full altOut) on deepest sell reserveIn
 */
import 'dotenv/config';
import fs from 'node:fs';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import { formatOpportunityLine, formatPredictedWin } from '../scan/formatOpportunity.js';
import {
  detectOpportunitiesForPair,
  diagnosePairEdges,
} from '../scan/opportunityDetector.js';
import { collectQuoteSnapshots } from '../scan/collectQuotes.js';
import { QuoteScanner } from '../scan/QuoteScanner.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import type { BotConfig } from '../config/schema.js';
import type { ScanOpportunity } from '../scan/types.js';

interface RankedRow extends ScanOpportunity {
  passesBotGates: boolean;
  rejectReason?: string;
}

function passesGates(opp: ScanOpportunity, bot: BotConfig): string | null {
  if (opp.roundTripBps < bot.scan.minSpreadBps) {
    return `roundTrip ${opp.roundTripBps} < min ${bot.scan.minSpreadBps}`;
  }
  if (opp.roundTripBps > bot.scan.maxSpreadBps) {
    return `roundTrip ${opp.roundTripBps} > max ${bot.scan.maxSpreadBps}`;
  }
  if (opp.liquidityRatio < bot.scan.minLiquidityRatio) {
    return `liquidityRatio ${opp.liquidityRatio.toFixed(2)} < min ${bot.scan.minLiquidityRatio}`;
  }
  if (opp.sellReserveIn > 0n) {
    const usageBps = Number((opp.amountOutCandidate * 10_000n) / opp.sellReserveIn);
    if (usageBps > bot.scan.maxSellReserveUsageBps) {
      return `sell usage ${usageBps}bps > max ${bot.scan.maxSellReserveUsageBps}`;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const topN =
    typeof flags.top === 'string' ? Number(flags.top) : 40;
  const minBpsFloor =
    typeof flags['min-bps'] === 'string' ? Number(flags['min-bps']) : 0;
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
    `\n[scan:ecosystem] bot=${botId} bases=[${bot.baseTokens.join(', ')}] ` +
      `nominal=$${bot.trade.nominalTradeUsd} discover mode`
  );
  console.log(
    `  bot gates: roundTrip ${bot.scan.minSpreadBps}-${bot.scan.maxSpreadBps}bps  ` +
      `minLiqRatio ${bot.scan.minLiquidityRatio}  maxSellReserveUsage ${bot.scan.maxSellReserveUsageBps}bps`
  );
  console.log(
    `  ranking: all edges with roundTrip >= ${minBpsFloor} bps (top ${topN} shown)\n`
  );
  console.log(
    '  How quotes work: getAmountsOut / quoteExactInputSingle at amountIn — not a separate price feed.\n'
  );

  const collected = await collectQuoteSnapshots(scanner, bot, {
    discoverMode: true,
    maxPairs: Number.isFinite(maxPairs) ? maxPairs : undefined,
    onProgress: (p) => {
      if (p.index % 25 === 0 || p.index === p.total) {
        const pct = ((p.index / p.total) * 100).toFixed(0);
        console.log(
          `  [${pct}%] ${p.index}/${p.total} ${p.pair.baseSymbol}→${p.pair.targetName}  ${(p.elapsedMs / 1000).toFixed(0)}s`
        );
      }
    },
  });

  const detectBot: BotConfig = {
    ...bot,
    scan: { ...bot.scan, minSpreadBps: minBpsFloor, maxSpreadBps: 50_000 },
  };

  const allRows: RankedRow[] = [];
  const pairsWithPositiveRt = new Set<string>();
  const diagnostics = [];

  for (const snap of collected.snapshots) {
    const diag = await diagnosePairEdges(
      snap.tradePair,
      snap.amountIn,
      snap.quotes,
      quoteService
    );
    if (diag) diagnostics.push(diag);

    const opps = await detectOpportunitiesForPair(
      snap.tradePair,
      snap.amountIn,
      snap.quotes,
      detectBot,
      quoteService
    );
    for (const opp of opps) {
      if (opp.roundTripBps <= 0 && opp.predictedWinWei <= 0n) continue;
      const reject = passesGates(opp, bot);
      allRows.push({
        ...opp,
        passesBotGates: reject === null,
        rejectReason: reject ?? undefined,
      });
      pairsWithPositiveRt.add(opp.pairKey);
    }
  }

  allRows.sort((a, b) => b.roundTripBps - a.roundTripBps);

  const tradeable = allRows.filter((r) => r.passesBotGates);
  const scanSec = (collected.durationMs / 1000).toFixed(1);

  console.log('\n--- Ecosystem summary ---');
  console.log(`  pairs in universe:     ${collected.totalPairsInUniverse}`);
  console.log(`  pairs quoted:          ${collected.pairsScanned} (${scanSec}s)`);
  console.log(`  pairs skipped:         ${collected.pairsSkipped}`);
  console.log(`  quote errors:          ${collected.errors}`);
  console.log(`  candidate edges:       ${allRows.length} (roundTrip > 0)`);
  console.log(`  pairs w/ any edge:     ${pairsWithPositiveRt.size}`);
  console.log(`  pass bot gates:        ${tradeable.length}`);

  if (allRows.length > 0) {
    const rtValues = allRows.map((r) => r.roundTripBps);
    console.log(
      `  roundTrip range:       ${Math.min(...rtValues)} – ${Math.max(...rtValues)} bps`
    );
    const p50 = rtValues[Math.floor(rtValues.length * 0.5)] ?? 0;
    console.log(`  roundTrip median:      ${p50} bps`);
  }

  const byBuySpread = [...diagnostics].sort(
    (a, b) => b.bestBuySpreadBps - a.bestBuySpreadBps
  );
  const bySignedRt = [...diagnostics].sort(
    (a, b) => b.bestSignedRoundTripBps - a.bestSignedRoundTripBps
  );
  const buySpreadValues = diagnostics
    .map((d) => d.bestBuySpreadBps)
    .filter((v) => v > 0);
  const signedRtValues = diagnostics.map((d) => d.bestSignedRoundTripBps);

  if (diagnostics.length > 0) {
    console.log('\n--- Ecosystem diagnostics (all quoted pairs) ---');
    console.log(
      `  pairs w/ candidate routes: ${diagnostics.length}`
    );
    if (buySpreadValues.length > 0) {
      const sorted = [...buySpreadValues].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
      console.log(
        `  buy-only spread (bps):   p50=${p50}  max=${sorted[sorted.length - 1]}  ` +
          `(pairs with buySpr>0: ${buySpreadValues.length})`
      );
    }
    if (signedRtValues.length > 0) {
      const sorted = [...signedRtValues].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
      const positive = sorted.filter((v) => v > 0).length;
      console.log(
        `  signed round-trip (bps): p50=${p50}  min=${sorted[0]}  max=${sorted[sorted.length - 1]}  ` +
          `(positive: ${positive})`
      );
    }
  }

  const diagTop = Math.min(topN, 25);
  console.log(
    `\n--- Top buy-only spreads (base→alt vs deepest buy; NOT tradeable alone) ---`
  );
  const buyShow = byBuySpread.filter((d) => d.bestBuySpreadBps > 0).slice(0, diagTop);
  if (buyShow.length === 0) {
    console.log('  (none)');
  } else {
    for (let i = 0; i < buyShow.length; i++) {
      const d = buyShow[i];
      const edge = d.bestBuySpreadEdge;
      const rt =
        edge != null ? edge.roundTripBps : d.bestSignedRoundTripBps;
      console.log(
        `  ${String(i + 1).padStart(3)}. ${d.baseSymbol}→${d.targetName}  ` +
          `buySpr=${String(d.bestBuySpreadBps).padStart(5)} bps  ` +
          `signedRt=${String(rt).padStart(6)}  ` +
          `thin=${d.bestBuySpreadDex} deepBuy=${d.deepBuyDex}`
      );
    }
  }

  console.log('\n--- Top signed round-trip (full WETH→alt→WETH quote path) ---');
  const rtShow = bySignedRt.slice(0, diagTop);
  if (rtShow.length === 0) {
    console.log('  (none)');
  } else {
    for (let i = 0; i < rtShow.length; i++) {
      const d = rtShow[i];
      const edge = d.bestRoundTrip;
      if (!edge) continue;
      const reject = passesGates(edge, bot);
      const flag = reject === null ? 'PASS' : '    ';
      console.log(
        `  ${String(i + 1).padStart(3)}. [${flag}] ${formatOpportunityLine(edge)}  ` +
          `buySpr=${String(edge.buySpreadBps).padStart(5)}`
      );
      if (reject) console.log(`       └─ ${reject}`);
    }
  }

  console.log('\n--- Profitable round-trip only (roundTrip > 0) ---');
  console.log(
    '  pass = meets alpha gates | buySpr = buy-only bps vs deepBuy | rt = round-trip bps'
  );
  const show = allRows.slice(0, topN);
  if (show.length === 0) {
    console.log('  (none with positive round-trip at this nominal size)\n');
  } else {
    for (let i = 0; i < show.length; i++) {
      const r = show[i];
      const flag = r.passesBotGates ? 'PASS' : '    ';
      console.log(
        `  ${String(i + 1).padStart(3)}. [${flag}] ${formatOpportunityLine(r)}  ` +
          `buySpr=${String(r.buySpreadBps).padStart(5)}  ` +
          `reserveUse=${r.sellReserveIn > 0n ? ((Number(r.amountOutCandidate * 10_000n / r.sellReserveIn) / 100).toFixed(1) + '%') : 'n/a'}`
      );
      if (!r.passesBotGates && r.rejectReason) {
        console.log(`       └─ ${r.rejectReason}`);
      }
    }
  }

  if (tradeable.length > 0 && tradeable.length <= 15) {
    console.log('\n--- Tradeable (pass all gates) ---');
    for (const r of tradeable) {
      console.log(`    ${formatOpportunityLine(r)}  win=${formatPredictedWin(r)}`);
    }
  } else if (tradeable.length > 15) {
    console.log(`\n--- Tradeable: ${tradeable.length} (run scan:dry-run to execute best) ---`);
  }

  const jsonPath =
    typeof flags.json === 'string' ? flags.json : undefined;
  if (jsonPath) {
    const serializable = allRows.map((r) => ({
      ...r,
      amountIn: r.amountIn.toString(),
      amountOutCandidate: r.amountOutCandidate.toString(),
      predictedBaseOut: r.predictedBaseOut.toString(),
      predictedWinWei: r.predictedWinWei.toString(),
      sellReserveIn: r.sellReserveIn.toString(),
    }));
    fs.writeFileSync(jsonPath, JSON.stringify({ summary: { tradeable: tradeable.length, total: allRows.length }, rows: serializable }, null, 2));
    console.log(`\n  wrote ${jsonPath}\n`);
  } else {
    console.log('');
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
