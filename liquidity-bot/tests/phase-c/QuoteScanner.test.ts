import { describe, expect, it } from 'vitest';
import { OpportunityCache } from '../../src/scan/OpportunityCache.js';
import { QuoteScanner } from '../../src/scan/QuoteScanner.js';
import { BalanceService } from '../../src/scan/BalanceService.js';
import type { BotConfig } from '../../src/config/schema.js';

const botConfig: BotConfig = {
  id: 'scan-mock',
  enabled: true,
  address: '0x1111111111111111111111111111111111111111',
  privateKeyEnv: 'BOT_SCAN_MOCK_KEY',
  baseTokens: ['USDC'],
  scan: { intervalMs: 180000, minSpreadBps: 1000, minLiquidityRatio: 2 },
  trade: {
    nominalTradeUsd: 50,
    balanceUsagePct: 45,
    maxOpenTrades: 3,
    decastreamAmountOutMinBufferBps: 160,
    directSwapSlippageBps: 50,
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
    deploymentManifest: '../versions/x.json',
  },
};

describe('phase C — QuoteScanner (mocked)', () => {
  it('returns empty when no base balances', async () => {
    const provider = {} as import('ethers').Provider;
    const cache = new OpportunityCache();
    const balanceService = {
      getBaseBalances: async () => ({ USDC: 0n }),
    } as unknown as BalanceService;

    const scanner = new QuoteScanner(
      provider,
      cache,
      { maxPairsPerRun: 1 },
      { balanceService }
    );

    const result = await scanner.scanBot(botConfig);
    expect(result.pairsScanned).toBe(0);
    expect(result.opportunities).toHaveLength(0);
    expect(result.diagnostics.mode).toBe('live');
    expect(result.diagnostics.heldBases).toHaveLength(0);
  });

  it('discover mode scans without balance', async () => {
    const provider = {} as import('ethers').Provider;
    const cache = new OpportunityCache();
    const balanceService = {
      getBaseBalances: async () => ({ USDC: 0n }),
    } as unknown as BalanceService;
    const quoteService = {
      quoteDex: async () => null,
    } as unknown as import('../../src/scan/DexQuoteService.js').DexQuoteService;

    const scanner = new QuoteScanner(
      provider,
      cache,
      { discoverMode: true, maxPairsPerRun: 2, pairDelayMs: 0 },
      { balanceService, quoteService }
    );

    const result = await scanner.scanBot(botConfig);
    expect(result.diagnostics.mode).toBe('discover');
    expect(result.diagnostics.scanBases).toContain('USDC');
    expect(result.diagnostics.pairsConsidered).toBeGreaterThan(0);
  });
});
