import { describe, expect, it } from 'vitest';
import {
  absGapBps,
  cexDexGapBps,
  impliedUsdPerAlt,
  rankPairsForQuote,
} from '../../src/signal/cexDexRank.js';
import type { TradePair } from '../../src/config/loadPairs.js';

const pair = (
  name: string,
  addr: string,
  base: TradePair['baseSymbol'] = 'WETH'
): TradePair => ({
  baseSymbol: base,
  baseAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  targetName: name,
  targetAddress: addr,
  tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  tokenOut: addr,
});

describe('WP5 CEX–DEX rank', () => {
  it('computes gap bps', () => {
    expect(absGapBps(100, 101)).toBeCloseTo(99.01, 0);
    expect(cexDexGapBps(1, 1.01)).toBeCloseTo(99.01, 0);
  });

  it('implies USD per alt from USDC quote', () => {
    const usd = impliedUsdPerAlt({
      baseSymbol: 'USDC',
      amountIn: 10_000_000n, // $10
      amountOut: 5n * 10n ** 18n, // 5 alt
      hints: { ethUsd: 3000, btcUsd: 60000 },
    });
    expect(usd).toBeCloseTo(2, 6);
  });

  it('quotes largest CEX–DEX gap first', () => {
    const a = pair('aaa', '0x0000000000000000000000000000000000000001');
    const b = pair('bbb', '0x0000000000000000000000000000000000000002');
    const c = pair('ccc', '0x0000000000000000000000000000000000000003');
    const ranked = rankPairsForQuote(
      [a, b, c],
      [
        {
          targetName: 'aaa',
          baseSymbol: 'WETH',
          targetAddress: a.targetAddress,
          cexMid: 1,
          cexSpreadBps: 5,
          reason: 'x',
        },
        {
          targetName: 'bbb',
          baseSymbol: 'WETH',
          targetAddress: b.targetAddress,
          cexMid: 10,
          cexSpreadBps: 2,
          reason: 'x',
        },
      ],
      [
        {
          targetAddress: a.targetAddress,
          targetName: 'aaa',
          baseSymbol: 'WETH',
          usdPerAlt: 1.001,
          fetchedAt: '',
        },
        {
          targetAddress: b.targetAddress,
          targetName: 'bbb',
          baseSymbol: 'WETH',
          usdPerAlt: 12,
          fetchedAt: '',
        },
      ]
    );
    expect(ranked[0].targetName).toBe('bbb');
    expect(ranked[1].targetName).toBe('aaa');
    expect(ranked[2].targetName).toBe('ccc');
  });
});
