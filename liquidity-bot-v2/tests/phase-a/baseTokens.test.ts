import { describe, expect, it } from 'vitest';
import {
  BASE_TOKEN_ADDRESSES,
  baseTokenFromAddress,
  isBaseTokenSymbol,
} from '../../src/config/baseTokens.js';

describe('phase A — base tokens', () => {
  it('recognises base symbols', () => {
    expect(isBaseTokenSymbol('WETH')).toBe(true);
    expect(isBaseTokenSymbol('PEPE')).toBe(false);
  });

  it('maps WETH address to symbol', () => {
    expect(baseTokenFromAddress(BASE_TOKEN_ADDRESSES.WETH)).toBe('WETH');
  });
});
