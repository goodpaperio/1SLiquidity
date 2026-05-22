import type { ScanOpportunity } from './types.js';

/**
 * Rank opportunities that pass spread guardrails (detector already filters min/max).
 * Prefer highest spread in band, then higher liquidity ratio (deeper vs thin gap).
 */
export function rankOpportunities(
  opportunities: ScanOpportunity[]
): ScanOpportunity[] {
  return [...opportunities].sort((a, b) => {
    if (b.roundTripBps !== a.roundTripBps) return b.roundTripBps - a.roundTripBps;
    return b.liquidityRatio - a.liquidityRatio;
  });
}

/**
 * Pick a single opportunity to trade when multiple are cached.
 * Returns null if none.
 */
export function selectBestOpportunity(
  opportunities: ScanOpportunity[]
): ScanOpportunity | null {
  const ranked = rankOpportunities(opportunities);
  return ranked[0] ?? null;
}

/**
 * At most one opportunity per pairKey (best spread for that pair).
 */
export function dedupeByPair(
  opportunities: ScanOpportunity[]
): ScanOpportunity[] {
  const byPair = new Map<string, ScanOpportunity>();
  for (const o of rankOpportunities(opportunities)) {
    const existing = byPair.get(o.pairKey);
    if (!existing || o.roundTripBps > existing.roundTripBps) {
      byPair.set(o.pairKey, o);
    }
  }
  return rankOpportunities([...byPair.values()]);
}
