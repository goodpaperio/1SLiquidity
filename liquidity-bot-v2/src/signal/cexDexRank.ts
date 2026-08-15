import type { BaseTokenSymbol } from '../config/baseTokens.js';
import { BASE_TOKEN_DECIMALS } from '../config/baseTokens.js';
import type { PriceHints } from '../config/sizing.js';
import type { TradePair } from '../config/loadPairs.js';
import type { WarmPairRef } from './cexBook.js';

export interface DexMidRow {
  targetAddress: string;
  targetName: string;
  baseSymbol: string;
  /** Implied USD per 1 alt token (18-dec assumption unless noted). */
  usdPerAlt: number;
  fetchedAt: string;
}

export interface DexMidCacheFile {
  fetchedAt: string;
  rows: DexMidRow[];
}

/** |a-b|/ref in bps. */
export function absGapBps(a: number, b: number): number {
  const ref = Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return (Math.abs(a - b) / ref) * 10_000;
}

/**
 * Implied USD per alt from a base→alt quote.
 * Alt decimals default to 18 (ranking only — not fill math).
 */
export function impliedUsdPerAlt(params: {
  baseSymbol: BaseTokenSymbol;
  amountIn: bigint;
  amountOut: bigint;
  hints: PriceHints;
  altDecimals?: number;
}): number | null {
  const { amountIn, amountOut, hints } = params;
  if (amountIn <= 0n || amountOut <= 0n) return null;
  const altDec = params.altDecimals ?? 18;
  const alt = Number(amountOut) / 10 ** altDec;
  if (!(alt > 0) || !Number.isFinite(alt)) return null;

  const baseDec = BASE_TOKEN_DECIMALS[params.baseSymbol];
  const baseAmt = Number(amountIn) / 10 ** baseDec;
  if (!(baseAmt > 0) || !Number.isFinite(baseAmt)) return null;

  let usdIn: number;
  switch (params.baseSymbol) {
    case 'USDC':
    case 'USDT':
    case 'DAI':
      usdIn = baseAmt;
      break;
    case 'WETH':
      usdIn = baseAmt * hints.ethUsd;
      break;
    case 'WBTC':
      usdIn = baseAmt * hints.btcUsd;
      break;
    default:
      return null;
  }
  const usdPerAlt = usdIn / alt;
  return usdPerAlt > 0 && Number.isFinite(usdPerAlt) ? usdPerAlt : null;
}

export function cexDexGapBps(cexMid: number, dexUsdPerAlt: number): number {
  if (!(cexMid > 0) || !(dexUsdPerAlt > 0)) return 0;
  return absGapBps(cexMid, dexUsdPerAlt);
}

/**
 * Quote order: largest |CEX − last DEX mid| first (pairs that moved).
 * Falls back to tight CEX books, then original order.
 */
export function rankPairsForQuote(
  pairs: TradePair[],
  warm: WarmPairRef[],
  lastMids: DexMidRow[]
): TradePair[] {
  const warmByAddr = new Map(
    warm.map((w) => [w.targetAddress.toLowerCase(), w])
  );
  const midByAddr = new Map(
    lastMids.map((r) => [r.targetAddress.toLowerCase(), r])
  );

  const scored = pairs.map((p, idx) => {
    const addr = p.targetAddress.toLowerCase();
    const w = warmByAddr.get(addr);
    const last = midByAddr.get(addr);
    let gap = 0;
    if (w?.cexMid && last?.usdPerAlt) {
      gap = cexDexGapBps(w.cexMid, last.usdPerAlt);
    }
    const tight = w?.cexSpreadBps ?? 1e9;
    return { p, idx, gap, tight, listed: Boolean(w) };
  });

  scored.sort((a, b) => {
    if (b.gap !== a.gap) return b.gap - a.gap;
    if (a.listed !== b.listed) return a.listed ? -1 : 1;
    if (a.tight !== b.tight) return a.tight - b.tight;
    return a.idx - b.idx;
  });

  return scored.map((s) => s.p);
}
