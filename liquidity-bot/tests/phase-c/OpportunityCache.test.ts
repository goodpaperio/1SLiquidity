import { describe, expect, it, vi } from 'vitest';
import { OpportunityCache } from '../../src/scan/OpportunityCache.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('phase C — OpportunityCache', () => {
  it('stores and expires entries', () => {
    vi.useFakeTimers();
    const cache = new OpportunityCache(1000);
    cache.upsert(sampleOpportunity());
    expect(cache.list()).toHaveLength(1);
    vi.advanceTimersByTime(1500);
    cache.prune();
    expect(cache.list()).toHaveLength(0);
    vi.useRealTimers();
  });
});
