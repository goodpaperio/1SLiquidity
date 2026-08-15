import type { ScanOpportunity } from '../scan/types.js';
import type { MidRangeSelection } from './midRangeSpread.js';

export type PriceVsDepthSelection = MidRangeSelection;

/**
 * Rank by netBps (after Deca). Prefer net≥0; tie-break gross coupled / dislocation.
 */
export function selectPriceVsDepthFromOpportunities(
  opportunities: ScanOpportunity[],
  options?: {
    minCoupledSpreadBps?: number;
    minNetBps?: number;
    requirePriceNeDepth?: boolean;
  }
): PriceVsDepthSelection {
  let pool = opportunities;
  if (options?.minCoupledSpreadBps !== undefined) {
    const floor = options.minCoupledSpreadBps;
    pool = pool.filter((o) => o.roundTripBps >= floor);
  }
  if (options?.minNetBps !== undefined) {
    const netFloor = options.minNetBps;
    pool = pool.filter((o) => o.netBps >= netFloor);
  }

  const requireNe = options?.requirePriceNeDepth ?? true;
  if (requireNe) {
    pool = pool.filter(
      (o) =>
        o.exitMode === 'both_price' ||
        o.candidateDex !== o.referenceSellDex
    );
  }

  if (pool.length === 0) {
    return { bandLow: 0, bandHigh: 0, eligibleCount: 0, pick: null };
  }

  const pick = pool.reduce((a, b) => {
    const aPos = a.netBps >= 0;
    const bPos = b.netBps >= 0;
    if (aPos !== bPos) return bPos ? b : a;
    if (b.netBps !== a.netBps) return b.netBps > a.netBps ? b : a;
    if (b.roundTripBps !== a.roundTripBps) {
      return b.roundTripBps > a.roundTripBps ? b : a;
    }
    return b.buySpreadBps > a.buySpreadBps ? b : a;
  });

  const nets = pool.map((o) => o.netBps).sort((a, b) => a - b);
  return {
    bandLow: nets[0] ?? 0,
    bandHigh: nets[nets.length - 1] ?? 0,
    eligibleCount: pool.length,
    pick,
  };
}

export function dislocationBps(o: ScanOpportunity): number {
  return o.buySpreadBps;
}
