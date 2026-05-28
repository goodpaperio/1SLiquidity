import { describe, expect, it } from 'vitest';
import { computeGasRefuel } from '../../src/execution/gasRefuel.js';

describe('integration — gas refuel decision', () => {
  it('requests top-up when current ETH is below minimum', () => {
    const d = computeGasRefuel(
      500_000_000_000_000n,
      1_500_000_000_000_000n,
      3_000_000_000_000_000n
    );
    expect(d.shouldRefuel).toBe(true);
    expect(d.topUpWei).toBe(2_500_000_000_000_000n);
  });

  it('does not refuel when current ETH is at or above minimum', () => {
    const d = computeGasRefuel(
      2_000_000_000_000_000n,
      1_500_000_000_000_000n,
      3_000_000_000_000_000n
    );
    expect(d.shouldRefuel).toBe(false);
    expect(d.topUpWei).toBe(0n);
  });
});
