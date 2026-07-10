import { describe, expect, it, vi } from 'vitest';
import {
  detectOpportunitiesForPair,
  roundTripBps,
  signedRoundTripBps,
  spreadBps,
} from '../../src/scan/opportunityDetector.js';
import type { BotConfig } from '../../src/config/schema.js';
import type { DexQuoteService } from '../../src/scan/DexQuoteService.js';
import type { DexQuote, StreamDexId } from '../../src/scan/types.js';
import type { TradePair } from '../../src/config/loadPairs.js';

const botStub = {
  scan: {
    minSpreadBps: 300,
    dustFloorUsd: 1,
    maxSpreadBps: 2500,
    minLiquidityRatio: 2,
    maxSellReserveUsageBps: 1500,
    intervalMs: 180000,
  },
} as BotConfig;

const tradePair: TradePair = {
  baseSymbol: 'USDC',
  baseAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  targetName: 'pepe',
  targetAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenOut: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
};

function mockQuoteService(opts: {
  sellReserveIn: Partial<Record<StreamDexId, bigint>>;
  sellBaseOut: bigint;
}): DexQuoteService {
  const sellReserveIn = new Map(
    Object.entries(opts.sellReserveIn) as [StreamDexId, bigint][]
  );
  const quoteDex = vi.fn(
    async (dex: StreamDexId, tokenIn: string, tokenOut: string) => {
      if (
        tokenIn === tradePair.tokenOut &&
        tokenOut === tradePair.tokenIn
      ) {
        return {
          dex,
          amountOut: opts.sellBaseOut,
          liquidityScore: 1n,
        } satisfies DexQuote;
      }
      return null;
    }
  );
  return {
    getSellReserveInByDex: vi.fn(async () => sellReserveIn),
    quoteDex,
    quotePair: vi.fn(async (tokenIn: string, tokenOut: string, amountIn: bigint) => {
      const out: DexQuote[] = [];
      for (const dex of [
        'uniswap-v2',
        'uniswap-v3-100',
        'uniswap-v3-500',
        'uniswap-v3-3000',
        'uniswap-v3-10000',
        'sushiswap',
      ] as StreamDexId[]) {
        const q = await quoteDex(dex, tokenIn, tokenOut, amountIn);
        if (q) out.push(q);
      }
      return out;
    }),
    quoteManyOnDex: vi.fn(
      async (
        dex: StreamDexId,
        tokenIn: string,
        tokenOut: string,
        amountsIn: readonly bigint[]
      ) => {
        const out: (DexQuote | null)[] = [];
        for (const amountIn of amountsIn) {
          out.push(await quoteDex(dex, tokenIn, tokenOut, amountIn));
        }
        return out;
      }
    ),
  } as unknown as DexQuoteService;
}

describe('phase C — opportunityDetector (round-trip)', () => {
  it('computes round-trip bps', () => {
    expect(roundTripBps(1_000_000n, 1_100_000n)).toBe(1000);
    expect(roundTripBps(1_000_000n, 1_000_000n)).toBe(0);
    expect(roundTripBps(1_000_000n, 900_000n)).toBe(0);
  });

  it('computes signed round-trip bps', () => {
    expect(signedRoundTripBps(1_000_000n, 900_000n)).toBe(-1000);
  });

  it('computes buy-only spread bps (diagnostic)', () => {
    expect(spreadBps(1100n, 1000n)).toBe(1000);
  });

  it('flags round-trip edge when sell quote on deepest reserve', async () => {
    const buyQuotes: DexQuote[] = [
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
    const qs = mockQuoteService({
      sellReserveIn: {
        'uniswap-v3-3000': 500_000n,
        'uniswap-v2': 1_000_000n,
        'uniswap-v3-10000': 20_000_000n,
      },
      sellBaseOut: 1_080_000n,
    });
    const opps = await detectOpportunitiesForPair(
      tradePair,
      1_000_000n,
      buyQuotes,
      botStub,
      qs
    );
    expect(opps.length).toBe(1);
    expect(opps[0].candidateDex).toBe('uniswap-v2');
    expect(opps[0].referenceSellDex).toBe('uniswap-v3-10000');
    expect(opps[0].roundTripBps).toBe(800);
    expect(opps[0].predictedWinWei).toBe(80_000n);
    expect(opps[0].buySpreadBps).toBe(1500);
  });

  it('rejects when round-trip below threshold', async () => {
    const buyQuotes: DexQuote[] = [
      { dex: 'uniswap-v3-3000', amountOut: 1_000_000n, liquidityScore: 10_000_000n },
      { dex: 'uniswap-v2', amountOut: 1_050_000n, liquidityScore: 2_000_000n },
    ];
    const qs = mockQuoteService({
      sellReserveIn: { 'uniswap-v3-10000': 20_000_000n },
      sellBaseOut: 1_020_000n,
    });
    expect(
      await detectOpportunitiesForPair(
        tradePair,
        1_000_000n,
        buyQuotes,
        botStub,
        qs
      )
    ).toHaveLength(0);
  });

  it('rejects when alt size vs sell reserve too large', async () => {
    const buyQuotes: DexQuote[] = [
      { dex: 'uniswap-v3-3000', amountOut: 1_000_000n, liquidityScore: 10_000_000n },
      { dex: 'uniswap-v2', amountOut: 1_500_000n, liquidityScore: 2_000_000n },
    ];
    const qs = mockQuoteService({
      sellReserveIn: { 'uniswap-v3-10000': 100_000n },
      sellBaseOut: 2_000_000n,
    });
    expect(
      await detectOpportunitiesForPair(
        tradePair,
        1_000_000n,
        buyQuotes,
        botStub,
        qs
      )
    ).toHaveLength(0);
  });
});
