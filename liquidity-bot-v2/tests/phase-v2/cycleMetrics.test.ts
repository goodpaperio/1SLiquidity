import { describe, expect, it } from 'vitest';
import {
  beginCycleMetrics,
  bumpEthCalls,
  bumpMulticallChunks,
  createCycleMetrics,
  endCycleMetrics,
  ethCallBudgetExceeded,
  formatCycleMetrics,
  recordSkip,
  remainingEthCalls,
} from '../../src/ops/cycleMetrics.js';

describe('v2 cycle metrics', () => {
  it('records skips and formats summary', () => {
    const m = createCycleMetrics();
    m.ethCallCount = 3;
    m.multicallChunkCount = 2;
    m.hotPairsCount = 10;
    m.hotCacheAgeMs = 1200;
    m.hotPairsSource = 'cache';
    recordSkip(m, 'requirePriceNeDepth');
    recordSkip(m, 'requirePriceNeDepth');
    recordSkip(m, 'empty_hot_set');
    const line = formatCycleMetrics(m);
    expect(line).toContain('ethCalls=3');
    expect(line).toContain('hotPairs=10');
    expect(line).toContain('requirePriceNeDepth=2');
    expect(line).toContain('empty_hot_set=1');
  });

  it('active cycle bumps eth/multicall counters', () => {
    beginCycleMetrics();
    bumpEthCalls(2);
    bumpMulticallChunks(1);
    const m = endCycleMetrics();
    expect(m?.ethCallCount).toBe(2);
    expect(m?.multicallChunkCount).toBe(1);
    expect(endCycleMetrics()).toBeNull();
  });

  it('enforces eth_call budget', () => {
    beginCycleMetrics();
    bumpEthCalls(5);
    expect(remainingEthCalls(5)).toBe(0);
    expect(ethCallBudgetExceeded(5)).toBe(true);
    expect(ethCallBudgetExceeded(0)).toBe(false);
    endCycleMetrics();
  });

  it('formats watch plane counters', () => {
    const m = createCycleMetrics();
    m.watchHotN = 10;
    m.watchCexListedN = 7;
    m.watchDexOnlyN = 3;
    m.watchConfirmedN = 0;
    expect(formatCycleMetrics(m)).toContain('watch=10/7/3/0');
  });
});
