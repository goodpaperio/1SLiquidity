import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BotConfig } from '../../src/config/schema.js';

const mockEnsureAllowance = vi.fn();
const mockPlaceTrade = vi.fn();
const mockWait = vi.fn();

vi.mock('../../src/chain/erc20.js', () => ({
  ensureAllowance: (...args: unknown[]) => mockEnsureAllowance(...args),
}));

vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers');
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(() => ({
      placeTrade: mockPlaceTrade,
    })),
  };
});

const bot: BotConfig = {
  id: 'integration-place-trade',
  enabled: true,
  address: '0x1111111111111111111111111111111111111111',
  privateKeyEnv: 'BOT_INTEGRATION_KEY',
  baseTokens: ['WETH'],
  scan: {
    intervalMs: 900000,
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

describe('integration — leg 2 placeTrade on Core', () => {
  beforeEach(() => {
    mockWait.mockResolvedValue({ hash: '0xdef' });
    mockPlaceTrade.mockResolvedValue({ wait: mockWait });
    mockEnsureAllowance.mockResolvedValue(undefined);
  });

  it('approves token and calls core.placeTrade with encoded trade data', async () => {
    const { placeTradeOnCore } = await import(
      '../../src/execution/placeTradeLeg.js'
    );
    const signer = {
      getAddress: vi.fn().mockResolvedValue(bot.address),
    } as unknown as import('ethers').Signer;

    const res = await placeTradeOnCore(
      bot,
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      1_000_000_000_000_000n,
      2_000_000n,
      signer
    );

    expect(res.txHash).toBe('0xdef');
    expect(mockEnsureAllowance).toHaveBeenCalledOnce();
    expect(mockPlaceTrade).toHaveBeenCalledOnce();
  });
});
