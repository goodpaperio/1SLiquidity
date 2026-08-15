/**
 * Lightweight per-cycle counters for V2 ops (RPC pressure + hot-set diagnostics).
 */

export type SkipReason =
  | 'empty_hot_set'
  | 'requirePriceNeDepth'
  | 'safety'
  | 'cooldown'
  | 'repeat_guard'
  | 'no_candidates'
  | string;

export interface CycleMetrics {
  ethCallCount: number;
  multicallChunkCount: number;
  hotPairsCount: number | null;
  hotCacheAgeMs: number | null;
  hotPairsSource: string | null;
  watchHotN: number | null;
  watchCexListedN: number | null;
  watchDexOnlyN: number | null;
  watchConfirmedN: number | null;
  skipReasons: Record<string, number>;
}

export function createCycleMetrics(): CycleMetrics {
  return {
    ethCallCount: 0,
    multicallChunkCount: 0,
    hotPairsCount: null,
    hotCacheAgeMs: null,
    hotPairsSource: null,
    watchHotN: null,
    watchCexListedN: null,
    watchDexOnlyN: null,
    watchConfirmedN: null,
    skipReasons: {},
  };
}

export function recordSkip(metrics: CycleMetrics, reason: SkipReason): void {
  metrics.skipReasons[reason] = (metrics.skipReasons[reason] ?? 0) + 1;
}

export function formatCycleMetrics(m: CycleMetrics): string {
  const skips = Object.entries(m.skipReasons)
    .map(([k, v]) => `${k}=${v}`)
    .join(',') || 'none';
  const watch =
    m.watchHotN != null
      ? ` watch=${m.watchHotN}/${m.watchCexListedN ?? 0}/${m.watchDexOnlyN ?? 0}/${m.watchConfirmedN ?? 0}`
      : '';
  return (
    `cycleMetrics ethCalls=${m.ethCallCount} multicallChunks=${m.multicallChunkCount} ` +
    `hotPairs=${m.hotPairsCount ?? 'n/a'} hotSource=${m.hotPairsSource ?? 'n/a'} ` +
    `hotAgeMs=${m.hotCacheAgeMs ?? 'n/a'}${watch} skips=${skips}`
  );
}

/** Module-level active cycle metrics (set by QuoteScanner / runner). */
let active: CycleMetrics | null = null;

export function beginCycleMetrics(): CycleMetrics {
  active = createCycleMetrics();
  return active;
}

export function getActiveCycleMetrics(): CycleMetrics | null {
  return active;
}

export function endCycleMetrics(): CycleMetrics | null {
  const m = active;
  active = null;
  return m;
}

export function bumpEthCalls(n = 1): void {
  if (active) active.ethCallCount += n;
}

export function bumpMulticallChunks(n = 1): void {
  if (active) active.multicallChunkCount += n;
}

export function remainingEthCalls(cap: number): number {
  if (cap <= 0) return Number.POSITIVE_INFINITY;
  const used = active?.ethCallCount ?? 0;
  return Math.max(0, cap - used);
}

export function ethCallBudgetExceeded(cap: number): boolean {
  if (cap <= 0) return false;
  return remainingEthCalls(cap) <= 0;
}
