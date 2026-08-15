import type { BotConfig } from '../config/schema.js';
import type { DexQuoteService } from './DexQuoteService.js';
import { STREAM_DEX_IDS } from './DexQuoteService.js';
import { computeFeeStack } from './feeModel.js';
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

/**
 * Sell impact on one venue: full-size base out vs linear scale of a 1% probe.
 * Positive = full size got worse than linear (impact).
 */
export function sellImpactBpsFromQuotes(
  probeBaseOut: bigint,
  fullBaseOut: bigint,
  probeScale: bigint = 100n
): number {
  if (probeBaseOut <= 0n || fullBaseOut <= 0n || probeScale <= 0n) return 0;
  const expectedFull = probeBaseOut * probeScale;
  if (expectedFull <= fullBaseOut) return 0;
  return Number(((expectedFull - fullBaseOut) * 10_000n) / expectedFull);
}

/** Forward edges: best-price buy, then price-exit vs deep-exit by sell impact. */
export async function buildCandidateEdges(
  tradePair: TradePair,
  amountIn: bigint,
  buyQuotes: DexQuote[],
  quoteService: DexQuoteService,
  options?: {
    sellImpactBpsThreshold?: number;
    decaProtocolFeeBps?: number;
  }
): Promise<ScanOpportunity[]> {
  const validBuy = buyQuotes.filter(
    (q) => q.amountOut > 0n && q.liquidityScore > 0n
  );
  if (validBuy.length === 0) return [];

  const alt = tradePair.tokenOut;
  const base = tradePair.tokenIn;
  const impactThreshold = options?.sellImpactBpsThreshold ?? 15;

  const reserveInByDex = await quoteService.getSellReserveInByDex(alt, base);
  const deepSellDex = pickMaxReserveInDex(reserveInByDex);
  if (!deepSellDex) return [];

  const bestBuy = validBuy.reduce((best, q) =>
    q.amountOut > best.amountOut ? q : best
  );
  const deepBuy = validBuy.reduce((best, q) =>
    q.liquidityScore > best.liquidityScore ? q : best
  );

  const altOut = bestBuy.amountOut;
  if (altOut <= 0n) return [];

  const probeAlt = altOut / 100n;
  if (probeAlt <= 0n) return [];

  const sellQuotesFull = (
    await quoteService.quotePair(alt, base, altOut)
  ).filter((q) => q.amountOut > 0n);
  if (sellQuotesFull.length === 0) return [];

  const bestPriceSell = sellQuotesFull.reduce((a, b) =>
    b.amountOut > a.amountOut ? b : a
  );
  const deepSellQuote = sellQuotesFull.find((q) => q.dex === deepSellDex);
  const deepBaseOut = deepSellQuote?.amountOut ?? 0n;

  const probeOnPriceVenue = await quoteService.quoteManyOnDex(
    bestPriceSell.dex,
    alt,
    base,
    [probeAlt]
  );
  const priceSellProbe = probeOnPriceVenue[0];
  if (!priceSellProbe || priceSellProbe.amountOut <= 0n) return [];

  const impactBps = sellImpactBpsFromQuotes(
    priceSellProbe.amountOut,
    bestPriceSell.amountOut,
    100n
  );

  const priceBaseOut = bestPriceSell.amountOut;

  let exitMode: 'both_price' | 'price_then_depth';
  let predictedBaseOut: bigint;
  let referenceSellDex: StreamDexId;
  let leg2UsePriceBased: boolean;
  let sellReserveIn: bigint;

  if (impactBps < impactThreshold) {
    exitMode = 'both_price';
    predictedBaseOut = priceBaseOut;
    referenceSellDex = bestPriceSell.dex;
    leg2UsePriceBased = true;
    sellReserveIn = reserveInByDex.get(bestPriceSell.dex) ?? 0n;
  } else if (deepBaseOut > priceBaseOut) {
    exitMode = 'price_then_depth';
    predictedBaseOut = deepBaseOut;
    referenceSellDex = deepSellDex;
    leg2UsePriceBased = false;
    sellReserveIn = reserveInByDex.get(deepSellDex) ?? 0n;
  } else {
    return [];
  }

  const rtSigned = signedRoundTripBps(amountIn, predictedBaseOut);
  const buySpreadBps =
    bestBuy.dex === deepBuy.dex
      ? 0
      : spreadBps(bestBuy.amountOut, deepBuy.amountOut);
  const liquidityRatio =
    bestBuy.liquidityScore > 0n
      ? Number(deepBuy.liquidityScore) / Number(bestBuy.liquidityScore)
      : 0;

  const fees = computeFeeStack({
    grossCoupledBps: rtSigned,
    buyDex: bestBuy.dex,
    sellDex: referenceSellDex,
    decaFeeBps: options?.decaProtocolFeeBps,
  });

  return [
    {
      pairKey: pairKey(base, alt),
      baseSymbol: tradePair.baseSymbol,
      targetName: tradePair.targetName,
      tokenIn: base,
      tokenOut: alt,
      direction: 'forward',
      amountIn,
      candidateDex: bestBuy.dex,
      deepBuyDex: deepBuy.dex,
      referenceSellDex,
      amountOutCandidate: altOut,
      predictedBaseOut,
      roundTripBps: rtSigned,
      predictedWinWei: predictedBaseOut - amountIn,
      buySpreadBps,
      sellReserveIn,
      liquidityRatio: Number.isFinite(liquidityRatio) ? liquidityRatio : 0,
      detectedAt: Date.now(),
      sellImpactBps: impactBps,
      exitMode,
      leg2UsePriceBased,
      netBps: fees.netBps,
      dexFeesInQuoteBps: fees.dexFeesInQuoteBps,
      decaFeeBps: fees.decaFeeBps,
    },
  ];
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

    const fees = computeFeeStack({
      grossCoupledBps: rtSigned,
      buyDex: candidate.dex,
      sellDex: deepSellDex,
    });

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
      sellImpactBps: 0,
      exitMode: 'price_then_depth',
      leg2UsePriceBased: false,
      netBps: fees.netBps,
      dexFeesInQuoteBps: fees.dexFeesInQuoteBps,
      decaFeeBps: fees.decaFeeBps,
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
