import { describe, expect, it } from 'vitest';
import { publishedDexFeeBps } from '../../src/scan/feeModel.js';

// Size sweep unit coverage is light (RPC integration via dry-run).
// This guards the fee helper still used when sweeping.
describe('WP2 size sweep prerequisites', () => {
  it('keeps published fee map stable for swept venues', () => {
    expect(publishedDexFeeBps('uniswap-v3-500')).toBe(5);
    expect(publishedDexFeeBps('sushiswap')).toBe(30);
  });
});
