import { describe, expect, it } from 'vitest';
import { sellImpactBpsFromQuotes } from '../../src/scan/opportunityDetector.js';
import { selectPriceVsDepthFromOpportunities } from '../../src/selection/priceVsDepth.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('sell impact + exit mode selection', () => {
  it('computes positive impact when full size underperforms linear probe', () => {
    // probe 1% → 10 base; linear full would be 1000; full only returns 900 → 10% impact
    expect(sellImpactBpsFromQuotes(10n, 900n, 100n)).toBe(1000);
  });

  it('zero impact when full matches or beats linear', () => {
    expect(sellImpactBpsFromQuotes(10n, 1000n, 100n)).toBe(0);
    expect(sellImpactBpsFromQuotes(10n, 1100n, 100n)).toBe(0);
  });

  it('prefers positive coupled over higher dislocation losers', () => {
    const sel = selectPriceVsDepthFromOpportunities(
      [
        sampleOpportunity({
          pairKey: 'a:neg',
          targetName: 'neg',
          roundTripBps: -9,
          netBps: -29,
          buySpreadBps: 50,
          exitMode: 'price_then_depth',
          leg2UsePriceBased: false,
          candidateDex: 'uniswap-v3-500',
          referenceSellDex: 'uniswap-v3-3000',
        }),
        sampleOpportunity({
          pairKey: 'a:pos',
          targetName: 'pos',
          roundTripBps: 45,
          netBps: 25,
          buySpreadBps: 5,
          exitMode: 'both_price',
          leg2UsePriceBased: true,
          sellImpactBps: 3,
        }),
      ],
      { requirePriceNeDepth: true, minCoupledSpreadBps: -100 }
    );
    expect(sel.pick?.targetName).toBe('pos');
    expect(sel.pick?.exitMode).toBe('both_price');
  });

  it('allows both_price when buy and sell DEX match', () => {
    const sel = selectPriceVsDepthFromOpportunities(
      [
        sampleOpportunity({
          candidateDex: 'uniswap-v3-3000',
          referenceSellDex: 'uniswap-v3-3000',
          exitMode: 'both_price',
          leg2UsePriceBased: true,
          roundTripBps: 12,
          netBps: -8,
        }),
      ],
      { requirePriceNeDepth: true, minCoupledSpreadBps: -100, minNetBps: -100 }
    );
    expect(sel.pick?.roundTripBps).toBe(12);
  });
});
