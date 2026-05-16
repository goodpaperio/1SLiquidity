import { describe, expect, it } from 'vitest';
import { detectOpportunitiesForPair, spreadBps } from '../../src/scan/opportunityDetector.js';
import type { BotConfig } from '../../src/config/schema.js';
import type { DexQuote } from '../../src/scan/types.js';
import type { TradePair } from '../../src/config/loadPairs.js';

const botStub = {
  scan: { minSpreadBps: 1000, minLiquidityRatio: 2, intervalMs: 180000 },
} as BotConfig;

const tradePair: TradePair = {
  baseSymbol: 'USDC',
  baseAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  targetName: 'pepe',
  targetAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenOut: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
};

describe('phase C — opportunityDetector', () => {
  it('computes spread bps', () => {
    expect(spreadBps(1100n, 1000n)).toBe(1000);
    expect(spreadBps(1000n, 1000n)).toBe(0);
  });

  it('flags thin DEX with better output vs deep reference', () => {
    const quotes: DexQuote[] = [
      {
        dex: 'uniswap-v3-3000',
        amountOut: 1_000_000n,
        liquidityScore: 10_000_000n,
      },
      {
        dex: 'uniswap-v2',
        amountOut: 1_150_000n,
        liquidityScore: 2_000_000n,
      },
    ];
    const opps = detectOpportunitiesForPair(
      tradePair,
      50_000_000n,
      quotes,
      botStub
    );
    expect(opps.length).toBe(1);
    expect(opps[0].candidateDex).toBe('uniswap-v2');
    expect(opps[0].referenceDex).toBe('uniswap-v3-3000');
    expect(opps[0].spreadBps).toBe(1500);
  });

  it('rejects when spread below threshold', () => {
    const quotes: DexQuote[] = [
      {
        dex: 'uniswap-v3-3000',
        amountOut: 1_000_000n,
        liquidityScore: 10_000_000n,
      },
      {
        dex: 'sushiswap',
        amountOut: 1_050_000n,
        liquidityScore: 3_000_000n,
      },
    ];
    expect(
      detectOpportunitiesForPair(tradePair, 50_000_000n, quotes, botStub)
    ).toHaveLength(0);
  });

  it('rejects when candidate is deeper than reference', () => {
    const quotes: DexQuote[] = [
      {
        dex: 'uniswap-v2',
        amountOut: 1_000_000n,
        liquidityScore: 5_000_000n,
      },
      {
        dex: 'sushiswap',
        amountOut: 1_200_000n,
        liquidityScore: 8_000_000n,
      },
    ];
    expect(
      detectOpportunitiesForPair(tradePair, 50_000_000n, quotes, botStub)
    ).toHaveLength(0);
  });
});
