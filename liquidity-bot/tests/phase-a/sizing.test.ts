import { describe, expect, it } from 'vitest';
import {
  computeEffectiveTradeAmount,
  isAboveDustFloor,
  nominalUsdToBaseAmount,
} from '../../src/config/sizing.js';

const hints = { ethUsd: 2500, btcUsd: 100_000 };

describe('phase A — sizing', () => {
  it('converts nominal USD to USDC wei', () => {
    expect(nominalUsdToBaseAmount('USDC', 50, hints)).toBe(50_000_000n);
  });

  it('converts nominal USD to WETH wei', () => {
    const weth = nominalUsdToBaseAmount('WETH', 50, hints);
    expect(weth).toBeGreaterThan(0n);
    expect(weth).toBeLessThan(10n ** 18n);
  });

  it('effectiveIn is min of nominal and balance cap', () => {
    const nominal = 1000n;
    const balance = 100n;
    expect(computeEffectiveTradeAmount(balance, nominal, 45)).toBe(45n);
    expect(computeEffectiveTradeAmount(1_000_000n, nominal, 45)).toBe(
      nominal
    );
  });

  it('returns zero when balance is zero', () => {
    expect(computeEffectiveTradeAmount(0n, 1000n, 45)).toBe(0n);
  });

  it('dust floor rejects tiny amounts', () => {
    expect(isAboveDustFloor(100n, 'USDC', hints)).toBe(false);
    expect(isAboveDustFloor(1_000_000n, 'USDC', hints)).toBe(true);
  });
});
