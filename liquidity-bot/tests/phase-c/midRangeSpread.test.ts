import { describe, expect, it } from 'vitest';
import {
  dedupeByPairBestCoupled,
  selectMidRangeFromOpportunities,
} from '../../src/selection/midRangeSpread.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('midRangeSpread selection', () => {
  it('dedupes to best coupled per pair', () => {
    const list = [
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: -50 }),
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: -30 }),
      sampleOpportunity({ pairKey: 'c:d', roundTripBps: -40 }),
    ];
    const d = dedupeByPairBestCoupled(list);
    expect(d).toHaveLength(2);
    expect(d.find((o) => o.pairKey === 'a:b')?.roundTripBps).toBe(-30);
  });

  it('picks highest coupled at or above p25 (includes positive outliers)', () => {
    const list = [
      sampleOpportunity({ targetName: 'a', roundTripBps: -100 }),
      sampleOpportunity({ targetName: 'b', roundTripBps: -50 }),
      sampleOpportunity({ targetName: 'c', roundTripBps: -40 }),
      sampleOpportunity({ targetName: 'd', roundTripBps: -30 }),
      sampleOpportunity({ targetName: 'e', roundTripBps: -20 }),
      sampleOpportunity({ targetName: 'f', roundTripBps: -18 }),
      sampleOpportunity({ targetName: 'g', roundTripBps: -15 }),
      sampleOpportunity({ targetName: 'ldo', roundTripBps: 12 }),
    ];
    const sel = selectMidRangeFromOpportunities(list);
    expect(sel.pick?.targetName).toBe('ldo');
    expect(sel.pick?.roundTripBps).toBe(12);
    expect(sel.eligibleCount).toBeGreaterThan(0);
  });

  it('respects -100 bps floor before banding', () => {
    const list = [
      sampleOpportunity({ roundTripBps: -200 }),
      sampleOpportunity({ roundTripBps: -80 }),
      sampleOpportunity({ roundTripBps: -60 }),
    ];
    const sel = selectMidRangeFromOpportunities(list, {
      minCoupledSpreadBps: -100,
    });
    expect(sel.pick?.roundTripBps).toBe(-60);
    expect(sel.pick?.roundTripBps).toBeGreaterThanOrEqual(-100);
  });
});
