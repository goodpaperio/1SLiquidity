import type { BotConfig } from '../config/schema.js';
import type { DexQuoteService } from './DexQuoteService.js';
import { STREAM_DEX_IDS } from './DexQuoteService.js';
import type { DexQuote, ScanOpportunity, StreamDexId } from './types.js';
import type { TradePair } from '../config/loadPairs.js';

export function spreadBps(
  amountOutBetter: bigint,
  amountOutReference: bigint
): number {
  if (amountOutReference <= 0n) return 0;
  const diff = amountOutBetter - amountOutReference;
  if (diff <= 0n) return 0;
  return Number((diff * 10_000n) / amountOutReference);
}

/** Round-trip edge in base token: (baseOut − baseIn) / baseIn (0 if not profitable). */
export function roundTripBps(baseIn: bigint, baseOut: bigint): number {
  if (baseIn <= 0n || baseOut <= baseIn) return 0;
  return Number(((baseOut - baseIn) * 10_000n) / baseIn);
}

/** Signed round-trip bps; negative when sell quote returns less base than spent. */
export function signedRoundTripBps(baseIn: bigint, baseOut: bigint): number {
  if (baseIn <= 0n) return 0;
  return Number(((baseOut - baseIn) * 10_000n) / baseIn);
}

export interface PairEdgeDiagnostic {
  pairKey: string;
  baseSymbol: TradePair['baseSymbol'];
  targetName: string;
  amountIn: bigint;
  /** Largest buy-only spread (thin vs deep base→alt). */
  bestBuySpreadBps: number;
  bestBuySpreadDex?: StreamDexId;
  deepBuyDex?: StreamDexId;
  /** Best signed round-trip across candidate routes. */
  bestSignedRoundTripBps: number;
  bestRoundTrip?: ScanOpportunity;
  bestBuySpreadEdge?: ScanOpportunity;
}

export function pairKey(tokenIn: string, tokenOut: string): string {
  return `${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}`;
}

function pickMaxReserveInDex(
  reserveInByDex: Map<StreamDexId, bigint>
): StreamDexId | null {
  let best: StreamDexId | null = null;
  let bestReserve = 0n;
  for (const dex of STREAM_DEX_IDS) {
    const r = reserveInByDex.get(dex) ?? 0n;
    if (r > bestReserve) {
      bestReserve = r;
      best = dex;
    }
  }
  return best;
}

/** All thin-vs-deep candidate routes for a pair (no bot gates). */
export async function buildCandidateEdges(
  tradePair: TradePair,
  amountIn: bigint,
  buyQuotes: DexQuote[],
  quoteService: DexQuoteService
): Promise<ScanOpportunity[]> {
  const validBuy = buyQuotes.filter(
    (q) => q.amountOut > 0n && q.liquidityScore > 0n
  );
  if (validBuy.length < 2) return [];

  const alt = tradePair.tokenOut;
  const base = tradePair.tokenIn;

  const reserveInByDex = await quoteService.getSellReserveInByDex(alt, base);
  const deepSellDex = pickMaxReserveInDex(reserveInByDex);
  if (!deepSellDex) return [];

  const deepSellReserveIn = reserveInByDex.get(deepSellDex) ?? 0n;

  const deepBuy = validBuy.reduce((best, q) =>
    q.liquidityScore > best.liquidityScore ? q : best
  );

  const candidates = validBuy.filter(
    (candidate) =>
      candidate.dex !== deepBuy.dex &&
      candidate.liquidityScore < deepBuy.liquidityScore
  );
  if (candidates.length === 0) return [];

  const sellQuotes = await quoteService.quoteManyOnDex(
    deepSellDex,
    alt,
    base,
    candidates.map((c) => c.amountOut)
  );

  const edges: ScanOpportunity[] = [];
  const now = Date.now();
  const key = pairKey(base, alt);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const sellQuote = sellQuotes[i];
    if (!sellQuote || sellQuote.amountOut <= 0n) continue;

    const altOut = candidate.amountOut;
    const baseBack = sellQuote.amountOut;
    const rtSigned = signedRoundTripBps(amountIn, baseBack);
    const buySpreadBps = spreadBps(candidate.amountOut, deepBuy.amountOut);
    const liquidityRatio =
      Number(deepBuy.liquidityScore) / Number(candidate.liquidityScore);

    edges.push({
      pairKey: key,
      baseSymbol: tradePair.baseSymbol,
      targetName: tradePair.targetName,
      tokenIn: base,
      tokenOut: alt,
      direction: 'forward',
      amountIn,
      candidateDex: candidate.dex,
      deepBuyDex: deepBuy.dex,
      referenceSellDex: deepSellDex,
      amountOutCandidate: altOut,
      predictedBaseOut: baseBack,
      roundTripBps: rtSigned,
      predictedWinWei: baseBack - amountIn,
      buySpreadBps,
      sellReserveIn: deepSellReserveIn,
      liquidityRatio,
      detectedAt: now,
    });
  }

  return edges;
}

/**
 * Reverse path (wallet holds alt): thin alt→base sell, Deca base→alt on deep buy.
 * Coupled bps vs deep-sell mark of starting alt inventory.
 */
export async function buildReverseCandidateEdges(
  tradePair: TradePair,
  altAmountIn: bigint,
  sellQuotes: DexQuote[],
  quoteService: DexQuoteService
): Promise<ScanOpportunity[]> {
  const validSell = sellQuotes.filter(
    (q) => q.amountOut > 0n && q.liquidityScore > 0n
  );
  if (validSell.length < 2) return [];

  const alt = tradePair.tokenOut;
  const base = tradePair.tokenIn;

  const reserveInByDex = await quoteService.getSellReserveInByDex(alt, base);
  const deepSellDex = pickMaxReserveInDex(reserveInByDex);
  if (!deepSellDex) return [];

  const deepSellReserveIn = reserveInByDex.get(deepSellDex) ?? 0n;

  const deepSell = validSell.reduce((best, q) =>
    q.liquidityScore > best.liquidityScore ? q : best
  );

  const buyQuotes = (
    await quoteService.quotePair(base, alt, 10n ** 15n)
  ).filter((q) => q.amountOut > 0n && q.liquidityScore > 0n);
  if (buyQuotes.length === 0) return [];

  const deepBuy = buyQuotes.reduce((best, q) =>
    q.liquidityScore > best.liquidityScore ? q : best
  );

  const baseStartQuotes = await quoteService.quoteManyOnDex(
    deepSellDex,
    alt,
    base,
    [altAmountIn]
  );
  const baseStartQuote = baseStartQuotes[0];
  if (!baseStartQuote || baseStartQuote.amountOut <= 0n) return [];
  const baseStart = baseStartQuote.amountOut;

  const candidates = validSell.filter(
    (candidate) =>
      candidate.dex !== deepSell.dex &&
      candidate.liquidityScore < deepSell.liquidityScore
  );
  if (candidates.length === 0) return [];

  const buyMids = await quoteService.quoteManyOnDex(
    deepBuy.dex,
    base,
    alt,
    candidates.map((c) => c.amountOut)
  );

  const altEnds = buyMids.map((q) =>
    q && q.amountOut > 0n ? q.amountOut : 0n
  );
  const finalSells = await quoteService.quoteManyOnDex(
    deepSellDex,
    alt,
    base,
    altEnds
  );

  const edges: ScanOpportunity[] = [];
  const now = Date.now();
  const key = pairKey(base, alt);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const buyQuote = buyMids[i];
    if (!buyQuote || buyQuote.amountOut <= 0n) continue;

    const finalSell = finalSells[i];
    if (!finalSell || finalSell.amountOut <= 0n) continue;

    const baseMid = candidate.amountOut;
    const baseFinal = finalSell.amountOut;
    const rtSigned = signedRoundTripBps(baseStart, baseFinal);
    const sellSpreadBps = spreadBps(candidate.amountOut, deepSell.amountOut);
    const liquidityRatio =
      Number(deepSell.liquidityScore) / Number(candidate.liquidityScore);

    edges.push({
      pairKey: key,
      baseSymbol: tradePair.baseSymbol,
      targetName: tradePair.targetName,
      tokenIn: alt,
      tokenOut: base,
      direction: 'reverse',
      amountIn: altAmountIn,
      candidateDex: candidate.dex,
      deepBuyDex: deepBuy.dex,
      referenceSellDex: deepSellDex,
      amountOutCandidate: baseMid,
      predictedBaseOut: baseFinal,
      roundTripBps: rtSigned,
      predictedWinWei: baseFinal - baseStart,
      buySpreadBps: sellSpreadBps,
      sellReserveIn: deepSellReserveIn,
      liquidityRatio,
      detectedAt: now,
    });
  }

  return edges;
}

/** Per-pair best buy-only and signed round-trip edges (no bot gates). */
export async function diagnosePairEdges(
  tradePair: TradePair,
  amountIn: bigint,
  buyQuotes: DexQuote[],
  quoteService: DexQuoteService
): Promise<PairEdgeDiagnostic | null> {
  const edges = await buildCandidateEdges(
    tradePair,
    amountIn,
    buyQuotes,
    quoteService
  );
  if (edges.length === 0) return null;

  const bestBuy = edges.reduce((a, b) =>
    b.buySpreadBps > a.buySpreadBps ? b : a
  );
  const bestRt = edges.reduce((a, b) =>
    b.roundTripBps > a.roundTripBps ? b : a
  );

  return {
    pairKey: bestRt.pairKey,
    baseSymbol: tradePair.baseSymbol,
    targetName: tradePair.targetName,
    amountIn,
    bestBuySpreadBps: bestBuy.buySpreadBps,
    bestBuySpreadDex: bestBuy.candidateDex,
    deepBuyDex: bestBuy.deepBuyDex,
    bestSignedRoundTripBps: bestRt.roundTripBps,
    bestRoundTrip: bestRt,
    bestBuySpreadEdge: bestBuy.buySpreadBps > 0 ? bestBuy : undefined,
  };
}

/**
 * Round-trip opportunity detection (phase 1):
 * - Buy candidates: base→alt on DEXes that are NOT the deepest buy book.
 * - Sell path: alt→base quoted on deepest reserveIn (StreamDaemon reserve mode).
 * - Gate on roundTripBps and optional sell-reserve usage cap (not sweetSpot).
 */
export async function detectOpportunitiesForPair(
  tradePair: TradePair,
  amountIn: bigint,
  buyQuotes: DexQuote[],
  bot: BotConfig,
  quoteService: DexQuoteService
): Promise<ScanOpportunity[]> {
  const edges = await buildCandidateEdges(
    tradePair,
    amountIn,
    buyQuotes,
    quoteService
  );

  const opportunities: ScanOpportunity[] = [];

  for (const edge of edges) {
    const rtBps = edge.roundTripBps;
    if (rtBps < bot.scan.minSpreadBps) continue;
    if (rtBps > bot.scan.maxSpreadBps) continue;

    if (edge.sellReserveIn > 0n) {
      const usageBps = Number(
        (edge.amountOutCandidate * 10_000n) / edge.sellReserveIn
      );
      if (usageBps > bot.scan.maxSellReserveUsageBps) continue;
    }

    if (edge.liquidityRatio < bot.scan.minLiquidityRatio) continue;

    opportunities.push({
      ...edge,
      roundTripBps: roundTripBps(edge.amountIn, edge.predictedBaseOut),
    });
  }

  return opportunities.sort((a, b) => b.roundTripBps - a.roundTripBps);
}
