import { describe, expect, it } from 'vitest';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../../src/config/baseTokens.js';
import type { BotConfig } from '../../src/config/schema.js';
import { loadPairsForBase } from '../../src/config/loadPairs.js';
import { collectQuoteSnapshots } from '../../src/scan/collectQuotes.js';

const botConfig: BotConfig = {
  id: 'scan-collect',
  enabled: true,
  address: '0x1111111111111111111111111111111111111111',
  privateKeyEnv: 'BOT_SCAN_COLLECT_KEY',
  baseTokens: ['WETH'],
  scan: {
    intervalMs: 180000,
    minSpreadBps: 300,
    minCoupledSpreadBps: -100,
    selectionMode: 'mid_range_spread',
    maxSpreadBps: 2500,
    minLiquidityRatio: 2,
    dustFloorUsd: 1,
    maxSellReserveUsageBps: 1500,
  },
  trade: {
    nominalTradeUsd: 10,
    balanceUsagePct: 45,
    maxOpenTrades: 1,
    decastreamAmountOutMinBufferBps: 160,
    directSwapSlippageBps: 50,
    pairCooldownMs: 900000,
    minTradesBetweenSamePair: 4,
    tradeHistoryMaxEntries: 32,
    usePriceBased: false,
    isInstasettlable: false,
    instasettleBps: 100,
  },
  gas: {
    minEthWei: '1',
    targetEthWei: '2',
    refuelDex: 'uniswap-v3-3000',
  },
  contracts: {
    core: '0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710',
    deploymentManifest: '../versions/deployment-addresses-mainnet-2.2.1.json',
  },
};

describe('phase C — collectQuoteSnapshots trusted routes', () => {
  it('adds held base symbols outside configured baseTokens', async () => {
    const scanner = {
      getBaseBalances: async () =>
        ({
          WETH: 0n,
          USDC: 2_000_000n,
          USDT: 0n,
          DAI: 0n,
          WBTC: 0n,
        }) as Record<BaseTokenSymbol, bigint>,
      getTokenBalance: async () => 0n,
      getTokenBalances: async () => new Map<string, bigint>(),
      fetchQuotesForPair: async () => [],
    } as const;

    const result = await collectQuoteSnapshots(scanner as never, botConfig, {
      discoverMode: false,
      maxPairs: 1,
      provenTokenAddresses: new Set([
        BASE_TOKEN_ADDRESSES.USDC.toLowerCase(),
      ]),
    });

    expect(result.scanBases).toContain('USDC');
    expect(result.pairsConsidered).toBeGreaterThan(0);
  });

  it('uses proven alt token balances for reverse snapshots', async () => {
    const firstWethPair = loadPairsForBase('WETH')[0];
    expect(firstWethPair).toBeDefined();
    const alt = firstWethPair.address.toLowerCase();
    let quoteCalls = 0;

    const scanner = {
      getBaseBalances: async () =>
        ({
          WETH: 0n,
          USDC: 0n,
          USDT: 0n,
          DAI: 0n,
          WBTC: 0n,
        }) as Record<BaseTokenSymbol, bigint>,
      getTokenBalance: async (_holder: string, token: string) =>
        token.toLowerCase() === alt ? 1_000_000_000_000_000n : 0n,
      getTokenBalances: async (_holder: string, tokens: readonly string[]) => {
        const map = new Map<string, bigint>();
        for (const t of tokens) {
          map.set(
            t.toLowerCase(),
            t.toLowerCase() === alt ? 1_000_000_000_000_000n : 0n
          );
        }
        return map;
      },
      fetchQuotesForPair: async () => {
        quoteCalls++;
        return [
          {
            dex: 'uniswap-v2',
            amountOut: 1_000_000_000_000_000_000n,
            liquidityScore: 1_000_000n,
          },
        ];
      },
    } as const;

    const result = await collectQuoteSnapshots(scanner as never, botConfig, {
      discoverMode: false,
      maxPairs: 30,
      provenTokenAddresses: new Set([alt]),
    });

    expect(result.pairsConsidered).toBeGreaterThan(0);
    expect(result.snapshots.some((s) => s.direction === 'reverse')).toBe(true);
    // reverse path quotes once (deduped dust check + sell quotes)
    const reverseCount = result.snapshots.filter(
      (s) => s.direction === 'reverse'
    ).length;
    expect(quoteCalls).toBe(reverseCount);
  });

  it('prefers batched getTokenBalances over per-pair getTokenBalance', async () => {
    const firstWethPair = loadPairsForBase('WETH')[0];
    const alt = firstWethPair.address.toLowerCase();
    let batchCalls = 0;
    let singleCalls = 0;

    const scanner = {
      getBaseBalances: async () =>
        ({
          WETH: 0n,
          USDC: 0n,
          USDT: 0n,
          DAI: 0n,
          WBTC: 0n,
        }) as Record<BaseTokenSymbol, bigint>,
      getTokenBalance: async () => {
        singleCalls++;
        return 0n;
      },
      getTokenBalances: async () => {
        batchCalls++;
        return new Map([[alt, 1_000_000_000_000_000n]]);
      },
      fetchQuotesForPair: async () => [
        {
          dex: 'uniswap-v2',
          amountOut: 1_000_000_000_000_000_000n,
          liquidityScore: 1_000_000n,
        },
      ],
    } as const;

    await collectQuoteSnapshots(scanner as never, botConfig, {
      discoverMode: false,
      maxPairs: 5,
      provenTokenAddresses: new Set([alt]),
    });

    expect(batchCalls).toBe(1);
    expect(singleCalls).toBe(0);
  });
});
