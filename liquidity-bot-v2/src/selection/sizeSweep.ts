import type { BotConfig } from '../config/schema.js';
import { getPriceHints, nominalUsdToBaseAmount } from '../config/sizing.js';
import type { DexQuoteService } from '../scan/DexQuoteService.js';
import {
  buildCandidateEdges,
  buildReverseCandidateEdges,
} from '../scan/opportunityDetector.js';
import type { ScanOpportunity } from '../scan/types.js';
import type { TradePair } from '../config/loadPairs.js';
import { passesStructuralSafety } from './safetyFilters.js';
import { ethCallBudgetExceeded } from '../ops/cycleMetrics.js';

function tradePairFromSeed(seed: ScanOpportunity): TradePair {
  const forward = seed.direction === 'forward';
  const baseAddress = forward ? seed.tokenIn : seed.tokenOut;
  const targetAddress = forward ? seed.tokenOut : seed.tokenIn;
  return {
    baseSymbol: seed.baseSymbol,
    baseAddress,
    targetName: seed.targetName,
    targetAddress,
    tokenIn: baseAddress,
    tokenOut: targetAddress,
  };
}

/**
 * Re-quote a forward seed at several USD notionals; keep the edge with best netBps.
 */
export async function sweepNotionalsForSeed(
  seed: ScanOpportunity,
  bot: BotConfig,
  quoteService: DexQuoteService,
  sizesUsd: number[]
): Promise<ScanOpportunity | null> {
  if (seed.direction === 'reverse') {
    if (ethCallBudgetExceeded(bot.scan.maxEthCallsPerCycle)) return null;
    // Reverse sizes from alt inventory — keep seed amount only for now.
    const tradePair = tradePairFromSeed(seed);
    const quotes = await quoteService.quotePair(
      seed.tokenIn,
      seed.tokenOut,
      seed.amountIn
    );
    const edges = await buildReverseCandidateEdges(
      tradePair,
      seed.amountIn,
      quotes,
      quoteService
    );
    const safe = edges.filter((e) => passesStructuralSafety(e, bot));
    if (safe.length === 0) return null;
    return safe.reduce((a, b) => (b.netBps > a.netBps ? b : a));
  }

  const hints = await getPriceHints();
  const tradePair = tradePairFromSeed(seed);
  const sizes =
    sizesUsd.length > 0 ? sizesUsd : [bot.trade.nominalTradeUsd];

  let best: ScanOpportunity | null = null;
  for (const usd of sizes) {
    if (!(usd > 0)) continue;
    if (ethCallBudgetExceeded(bot.scan.maxEthCallsPerCycle)) break;
    const amountIn = nominalUsdToBaseAmount(
      seed.baseSymbol,
      usd,
      hints
    );
    if (amountIn <= 0n) continue;

    const quotes = await quoteService.quotePair(
      tradePair.tokenIn,
      tradePair.tokenOut,
      amountIn
    );
    const edges = await buildCandidateEdges(
      tradePair,
      amountIn,
      quotes,
      quoteService,
      {
        sellImpactBpsThreshold: bot.scan.sellImpactBpsThreshold,
        decaProtocolFeeBps: bot.scan.decaProtocolFeeBps,
      }
    );
    for (const edge of edges) {
      if (!passesStructuralSafety(edge, bot)) continue;
      if (!best || edge.netBps > best.netBps) {
        best = edge;
      }
    }
  }
  return best;
}

/**
 * Size-sweep top seeds by |gross| / net; return best opportunities per pair.
 */
export async function sweepFinalistNotionals(
  seeds: ScanOpportunity[],
  bot: BotConfig,
  quoteService: DexQuoteService
): Promise<{
  opportunities: ScanOpportunity[];
  triedUsd: number[];
  improved: number;
}> {
  const triedUsd =
    bot.scan.sizeSweepUsd.length > 0
      ? bot.scan.sizeSweepUsd
      : [bot.trade.nominalTradeUsd];

  const out: ScanOpportunity[] = [];
  let improved = 0;

  for (const seed of seeds) {
    if (ethCallBudgetExceeded(bot.scan.maxEthCallsPerCycle)) break;
    const best = await sweepNotionalsForSeed(
      seed,
      bot,
      quoteService,
      triedUsd
    );
    if (!best) continue;
    if (best.netBps > seed.netBps || best.amountIn !== seed.amountIn) {
      improved++;
    }
    out.push(best);
  }

  return { opportunities: out, triedUsd, improved };
}
