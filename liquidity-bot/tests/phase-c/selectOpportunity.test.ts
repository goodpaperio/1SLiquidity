import { describe, expect, it } from 'vitest';
import {
  dedupeByPair,
  rankOpportunities,
  selectBestOpportunity,
} from '../../src/scan/selectOpportunity.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('phase C — selectOpportunity', () => {
  it('selects highest roundTripBps, then liquidity ratio', () => {
    const list = [
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: 400, liquidityRatio: 3 }),
      sampleOpportunity({ pairKey: 'c:d', roundTripBps: 500, liquidityRatio: 2 }),
      sampleOpportunity({ pairKey: 'e:f', roundTripBps: 500, liquidityRatio: 4 }),
    ];
    expect(selectBestOpportunity(list)?.pairKey).toBe('e:f');
  });

  it('dedupes to one opportunity per pair (best roundTripBps)', () => {
    const list = [
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: 400 }),
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: 600 }),
    ];
    expect(dedupeByPair(list)).toHaveLength(1);
    expect(dedupeByPair(list)[0].roundTripBps).toBe(600);
  });

  it('rankOpportunities sorts by roundTripBps desc', () => {
    const ranked = rankOpportunities([
      sampleOpportunity({ roundTripBps: 300 }),
      sampleOpportunity({ roundTripBps: 450 }),
    ]);
    expect(ranked[0].roundTripBps).toBe(450);
  });
});
