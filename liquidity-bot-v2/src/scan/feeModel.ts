import type { StreamDexId } from './types.js';
import { feeTierFromDexId } from './dexQuoteUtils.js';

/** DecaStream protocol take on placeTrade / stream path (bps). */
export const DECA_PROTOCOL_FEE_BPS = 20;

/**
 * Published pool fee for a stream DEX id (bps).
 * Uni V3 tier numbers are hundredths of a bip (3000 → 30 bps).
 * V2 / Sushi classic = 30 bps.
 *
 * Note: Quoter / getAmountsOut outputs are already fee-inclusive.
 * These values are for fee-stack diagnostics and net EV accounting vs Deca,
 * not a second subtraction from quoted amountOut.
 */
export function publishedDexFeeBps(dex: StreamDexId): number {
  const v3 = feeTierFromDexId(dex);
  if (v3 != null) return Math.round(v3 / 100);
  if (dex === 'uniswap-v2' || dex === 'sushiswap') return 30;
  return 30;
}

export interface FeeStack {
  /** Round-trip bps from quotes (DEX fees already embedded in amounts). */
  grossCoupledBps: number;
  /** Diagnostic: published buy-leg pool fee. */
  buyDexFeeBps: number;
  /** Diagnostic: published sell-leg pool fee. */
  sellDexFeeBps: number;
  /** Sum of published buy+sell pool fees (already in quotes). */
  dexFeesInQuoteBps: number;
  /** Deca protocol fee to subtract from gross for Deca placeTrade path. */
  decaFeeBps: number;
  /**
   * Net after Deca on the quoted round-trip.
   * = grossCoupledBps − decaFeeBps
   */
  netBps: number;
}

export function computeFeeStack(params: {
  grossCoupledBps: number;
  buyDex: StreamDexId;
  sellDex: StreamDexId;
  decaFeeBps?: number;
}): FeeStack {
  const buyDexFeeBps = publishedDexFeeBps(params.buyDex);
  const sellDexFeeBps = publishedDexFeeBps(params.sellDex);
  const decaFeeBps = params.decaFeeBps ?? DECA_PROTOCOL_FEE_BPS;
  const grossCoupledBps = params.grossCoupledBps;
  return {
    grossCoupledBps,
    buyDexFeeBps,
    sellDexFeeBps,
    dexFeesInQuoteBps: buyDexFeeBps + sellDexFeeBps,
    decaFeeBps,
    netBps: grossCoupledBps - decaFeeBps,
  };
}

/**
 * PnL mode: honor minNetBps (default 0 = refuse after Deca).
 * Throughput: allow at least the Deca take as a loss (net ≥ −20) unless the
 * operator set an even lower floor.
 */
export function effectiveMinNetBps(bot: {
  scan: { strategyMode: 'pnl' | 'throughput'; minNetBps: number };
}): number {
  if (bot.scan.strategyMode === 'pnl') return bot.scan.minNetBps;
  return Math.min(bot.scan.minNetBps, -DECA_PROTOCOL_FEE_BPS);
}

export function formatFeeStack(s: FeeStack): string {
  return (
    `gross=${s.grossCoupledBps}bps ` +
    `(dexFeesInQuote≈${s.dexFeesInQuoteBps}=${s.buyDexFeeBps}+${s.sellDexFeeBps}) ` +
    `deca=-${s.decaFeeBps} → net=${s.netBps}bps`
  );
}
