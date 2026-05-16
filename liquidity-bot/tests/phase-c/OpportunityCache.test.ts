import { describe, expect, it, vi } from 'vitest';
import { OpportunityCache } from '../../src/scan/OpportunityCache.js';
import type { ScanOpportunity } from '../../src/scan/types.js';

function sampleOpp(overrides: Partial<ScanOpportunity> = {}): ScanOpportunity {
  return {
    pairKey: '0xa:0xb',
    baseSymbol: 'USDC',
    targetName: 'pepe',
    tokenIn: '0xa',
    tokenOut: '0xb',
    amountIn: 1n,
    candidateDex: 'uniswap-v2',
    referenceDex: 'uniswap-v3-3000',
    amountOutCandidate: 1100n,
    amountOutReference: 1000n,
    spreadBps: 1000,
    liquidityRatio: 3,
    detectedAt: Date.now(),
    ...overrides,
  };
}

describe('phase C — OpportunityCache', () => {
  it('stores and expires entries', () => {
    vi.useFakeTimers();
    const cache = new OpportunityCache(1000);
    cache.upsert(sampleOpp());
    expect(cache.list()).toHaveLength(1);
    vi.advanceTimersByTime(1500);
    cache.prune();
    expect(cache.list()).toHaveLength(0);
    vi.useRealTimers();
  });
});
