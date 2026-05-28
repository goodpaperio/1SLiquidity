import { describe, expect, it } from 'vitest';
import {
  percentile,
  selectMidRangeCoupled,
  type PairMatrixRow,
} from '../../src/scan/pairMatrix.js';

function row(
  target: string,
  coupled: number,
  viable = true
): PairMatrixRow {
  return {
    pairKey: `weth:${target}`,
    baseSymbol: 'WETH',
    targetName: target,
    amountIn: 1_000n,
    forwardSpreadBps: 0,
    altRefWei: 1n,
    backwardSpreadBps: 0,
    coupledSpreadBps: coupled,
    coupledBuySpreadBps: 0,
    decaViable: viable,
  };
}

describe('pairMatrix selection', () => {
  it('drops rows below coupled floor before band selection', () => {
    const rows = [row('bad', -1000), row('ok', -40), row('best', -20)];
    const sel = selectMidRangeCoupled(rows, { minCoupledSpreadBps: -500 });
    expect(sel.pick?.targetName).toBe('best');
  });

  it('picks highest coupled at or above p25 (includes positive outliers)', () => {
    const rows = [
      row('a', -100),
      row('b', -50),
      row('c', -40),
      row('d', -30),
      row('e', -20),
      row('f', -10),
      row('g', -5),
      row('h', -2),
      row('ldo', 12),
    ];
    const sel = selectMidRangeCoupled(rows);
    expect(sel.pick?.targetName).toBe('ldo');
    expect(sel.pick?.coupledSpreadBps).toBe(12);
  });

  it('percentile on sorted values', () => {
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 0.75)).toBe(4);
  });
});
