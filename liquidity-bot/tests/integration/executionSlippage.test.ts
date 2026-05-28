import { describe, expect, it } from 'vitest';
import { applySlippageBps } from '../../src/execution/slippage.js';
import { encodePlaceTradeData } from '../../src/execution/placeTradeLeg.js';

describe('integration — execution slippage and encoding', () => {
  it('applies bps haircut to quoted amounts', () => {
    expect(applySlippageBps(10_000n, 50)).toBe(9950n);
    expect(applySlippageBps(1_000_000n, 160)).toBe(984_000n);
  });

  it('encodes eight-field placeTrade tuple for Core', () => {
    const data = encodePlaceTradeData({
      tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amountIn: 1_000_000_000_000_000n,
      amountOutMin: 2_000_000n,
      isInstasettlable: false,
      usePriceBased: false,
      instasettleBps: 100,
      onlyInstasettle: false,
    });
    expect(data.startsWith('0x')).toBe(true);
    expect(data.length).toBeGreaterThan(10);
  });
});
