import type { ScanOpportunity } from '../scan/types.js';
import { percentile } from '../scan/pairMatrix.js';

export interface MidRangeSelection {
  bandLow: number;
  bandHigh: number;
  eligibleCount: number;
  pick: ScanOpportunity | null;
}

/** One best coupled route per pair. */
export function dedupeByPairBestCoupled(
  opportunities: ScanOpportunity[]
): ScanOpportunity[] {
  const byPair = new Map<string, ScanOpportunity>();
  for (const o of opportunities) {
    const existing = byPair.get(o.pairKey);
    if (!existing || o.roundTripBps > existing.roundTripBps) {
      byPair.set(o.pairKey, o);
    }
  }
  return [...byPair.values()];
}

/**
 * p25–p75 band on coupled (roundTrip) bps; pick highest in band.
 * Pool must already satisfy minCoupledSpreadBps and other safety filters.
 */
export function selectMidRangeFromOpportunities(
  opportunities: ScanOpportunity[],
  options?: { minCoupledSpreadBps?: number }
): MidRangeSelection {
  let pool = opportunities;
  if (options?.minCoupledSpreadBps !== undefined) {
    const floor = options.minCoupledSpreadBps;
    pool = pool.filter((o) => o.roundTripBps >= floor);
  }

  const spreads = pool.map((o) => o.roundTripBps).sort((a, b) => a - b);
  if (spreads.length === 0) {
    return { bandLow: 0, bandHigh: 0, eligibleCount: 0, pick: null };
  }

  const bandLow = percentile(spreads, 0.25);
  const bandHigh = percentile(spreads, 0.75);
  const eligible = pool.filter(
    (o) => o.roundTripBps >= bandLow && o.roundTripBps <= bandHigh
  );
  const pickPool = eligible.length > 0 ? eligible : pool;
  const pick = pickPool.reduce((a, b) =>
    b.roundTripBps > a.roundTripBps ? b : a
  );

  return {
    bandLow,
    bandHigh,
    eligibleCount: eligible.length,
    pick,
  };
}
