import type { DexQuoteService } from './DexQuoteService.js';
import { STREAM_DEX_IDS } from './DexQuoteService.js';
import { buildCandidateEdges, spreadBps } from './opportunityDetector.js';
import type { DexQuote, StreamDexId } from './types.js';
import type { TradePair } from '../config/loadPairs.js';

export interface PairMatrixRow {
  pairKey: string;
  baseSymbol: string;
  targetName: string;
  amountIn: bigint;
  /** Max base→alt spread vs deepest buy book (bps). */
  forwardSpreadBps: number;
  forwardBestDex?: StreamDexId;
  deepBuyDex?: StreamDexId;
  /** Alt size used for backward quotes (deep buy out at amountIn). */
  altRefWei: bigint;
  /** Max alt→base spread vs deepest sell (reserveIn) at altRef (bps). */
  backwardSpreadBps: number;
  backwardBestDex?: StreamDexId;
  deepSellDex?: StreamDexId;
  /** Best signed round-trip among thin-buy + deep-sell candidate routes. */
  coupledSpreadBps: number;
  coupledBuySpreadBps: number;
  coupledThinDex?: StreamDexId;
  /** At least one route: buy not deepest, sell on deepest reserve. */
  decaViable: boolean;
}

function pickDeepBuy(quotes: DexQuote[]): DexQuote | null {
  const valid = quotes.filter((q) => q.amountOut > 0n && q.liquidityScore > 0n);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) =>
    b.liquidityScore > a.liquidityScore ? b : a
  );
}

function maxForwardSpread(
  quotes: DexQuote[],
  deepBuy: DexQuote
): { bps: number; dex?: StreamDexId } {
  let best = 0;
  let dex: StreamDexId | undefined;
  for (const q of quotes) {
    if (q.dex === deepBuy.dex) continue;
    if (q.liquidityScore >= deepBuy.liquidityScore) continue;
    const bps = spreadBps(q.amountOut, deepBuy.amountOut);
    if (bps > best) {
      best = bps;
      dex = q.dex;
    }
  }
  return { bps: best, dex };
}

function pickDeepSellDex(
  reserveInByDex: Map<StreamDexId, bigint>
): StreamDexId | null {
  let best: StreamDexId | null = null;
  let bestR = 0n;
  for (const dex of STREAM_DEX_IDS) {
    const r = reserveInByDex.get(dex) ?? 0n;
    if (r > bestR) {
      bestR = r;
      best = dex;
    }
  }
  return best;
}

function maxBackwardSpread(
  sellQuotes: { dex: StreamDexId; amountOut: bigint }[],
  deepSellDex: StreamDexId,
  deepSellOut: bigint
): { bps: number; dex?: StreamDexId } {
  let best = 0;
  let dex: StreamDexId | undefined;
  for (const q of sellQuotes) {
    if (q.dex === deepSellDex) continue;
    const bps = spreadBps(q.amountOut, deepSellOut);
    if (bps > best) {
      best = bps;
      dex = q.dex;
    }
  }
  return { bps: best, dex };
}

export async function buildPairMatrixRow(
  tradePair: TradePair,
  amountIn: bigint,
  buyQuotes: DexQuote[],
  quoteService: DexQuoteService
): Promise<PairMatrixRow | null> {
  const alt = tradePair.tokenOut;
  const base = tradePair.tokenIn;
  const pairKey = `${base.toLowerCase()}:${alt.toLowerCase()}`;

  const deepBuy = pickDeepBuy(buyQuotes);
  if (!deepBuy) return null;

  const fwd = maxForwardSpread(buyQuotes, deepBuy);
  const altRef = deepBuy.amountOut;

  const reserveInByDex = await quoteService.getSellReserveInByDex(alt, base);
  const deepSellDex = pickDeepSellDex(reserveInByDex);
  if (!deepSellDex) return null;

  const deepSellQuote = await quoteService.quoteDex(
    deepSellDex,
    alt,
    base,
    altRef
  );
  const deepSellOut = deepSellQuote?.amountOut ?? 0n;

  const sellQuotes: { dex: StreamDexId; amountOut: bigint }[] = [];
  for (const dex of STREAM_DEX_IDS) {
    const q = await quoteService.quoteDex(dex, alt, base, altRef);
    if (q && q.amountOut > 0n) {
      sellQuotes.push({ dex, amountOut: q.amountOut });
    }
  }

  const bwd =
    deepSellOut > 0n
      ? maxBackwardSpread(sellQuotes, deepSellDex, deepSellOut)
      : { bps: 0, dex: undefined };

  const edges = await buildCandidateEdges(
    tradePair,
    amountIn,
    buyQuotes,
    quoteService
  );
  const bestEdge = edges.reduce(
    (a, b) => (b.roundTripBps > a.roundTripBps ? b : a),
    edges[0]
  );

  return {
    pairKey,
    baseSymbol: tradePair.baseSymbol,
    targetName: tradePair.targetName,
    amountIn,
    forwardSpreadBps: fwd.bps,
    forwardBestDex: fwd.dex,
    deepBuyDex: deepBuy.dex,
    altRefWei: altRef,
    backwardSpreadBps: bwd.bps,
    backwardBestDex: bwd.dex,
    deepSellDex,
    coupledSpreadBps: bestEdge?.roundTripBps ?? 0,
    coupledBuySpreadBps: bestEdge?.buySpreadBps ?? 0,
    coupledThinDex: bestEdge?.candidateDex,
    decaViable: edges.length > 0,
  };
}

export function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * q))
  );
  return sorted[idx] ?? 0;
}

export interface MidRangePick {
  bandLow: number;
  bandHigh: number;
  eligibleCount: number;
  pick: PairMatrixRow | null;
}

/** Mid-range (p25–p75) on coupled spread; pick highest coupledSpreadBps in band. */
export function selectMidRangeCoupled(
  rows: PairMatrixRow[],
  options?: {
    onlyDecaViable?: boolean;
    /** Reject coupled spread below this (e.g. -500). */
    minCoupledSpreadBps?: number;
  }
): MidRangePick {
  let pool = options?.onlyDecaViable
    ? rows.filter((r) => r.decaViable)
    : rows;
  if (options?.minCoupledSpreadBps !== undefined) {
    const floor = options.minCoupledSpreadBps;
    pool = pool.filter((r) => r.coupledSpreadBps >= floor);
  }
  const spreads = pool.map((r) => r.coupledSpreadBps).sort((a, b) => a - b);
  if (spreads.length === 0) {
    return { bandLow: 0, bandHigh: 0, eligibleCount: 0, pick: null };
  }
  const bandLow = percentile(spreads, 0.25);
  const bandHigh = percentile(spreads, 0.75);
  const eligible = pool.filter(
    (r) => r.coupledSpreadBps >= bandLow && r.coupledSpreadBps <= bandHigh
  );
  const pick =
    eligible.length > 0
      ? eligible.reduce((a, b) =>
          b.coupledSpreadBps > a.coupledSpreadBps ? b : a
        )
      : pool.reduce((a, b) =>
          b.coupledSpreadBps > a.coupledSpreadBps ? b : a
        );
  return {
    bandLow,
    bandHigh,
    eligibleCount: eligible.length,
    pick,
  };
}
