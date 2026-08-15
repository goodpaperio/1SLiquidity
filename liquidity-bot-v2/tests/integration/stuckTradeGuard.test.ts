import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BotConfig } from '../../src/config/schema.js';
import type { CoreTradeView } from '../../src/chain/core.js';

vi.mock('../../src/chain/wallet.js', () => ({
  createBotWallet: vi.fn(() => ({ address: '0x1111111111111111111111111111111111111111' })),
  isDryRun: vi.fn(() => false),
}));

vi.mock('../../src/notify/tradeLedger.js', () => ({
  TradeLedger: vi.fn().mockImplementation(() => ({
    openTrades: vi.fn(() => []),
    updateOpen: vi.fn(),
  })),
}));

vi.mock('../../src/ops/tokenIssues.js', () => ({
  recordTokenIssue: vi.fn(),
  targetNameFromPairLabel: vi.fn(() => 'reth'),
}));

import * as core from '../../src/chain/core.js';
import { isDryRun } from '../../src/chain/wallet.js';
import {
  clearStuckTradeState,
  maybeCancelStuckTrade,
  stuckSettlementAttemptCycle,
} from '../../src/ops/stuckTradeGuard.js';

const botId = 'stuck-guard-int';
const TOKEN_IN = '0xae78736cd836f7ef08b085aa74545b5d2f4380df';
const TOKEN_OUT = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const PAIR_ID = '0x3153ac740000000000000000000000000000000000000000000000000000000001';

const botConfig: BotConfig = {
  id: botId,
  enabled: true,
  address: '0xfa59F5143CE0d3AEe8D63Adb56bDd756e14BF2d3',
  privateKeyEnv: 'BOT_STUCK_KEY',
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
    stuckCancelAfterCycles: 3,
  },
  gas: {
    minEthWei: '1',
    targetEthWei: '2',
    refuelDex: 'uniswap-v3-3000',
  },
  liquify: { enabled: false, contract: '0x0', dailySweepHourUtc: 11, minNativeEthUsd: 10, slippageBps: 300 },
  contracts: {
    core: '0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710',
    deploymentManifest: '../versions/deployment-addresses-mainnet-2.2.1.json',
  },
};

function openTrade(tradeId: number): CoreTradeView {
  return {
    owner: botConfig.address,
    attempts: 0,
    tokenIn: TOKEN_IN,
    tokenOut: TOKEN_OUT,
    amountIn: 5_000_000_000_000_000n,
    amountRemaining: 2_500_000_000_000_000n,
    targetAmountOut: 5_750_000_000_000_000n,
    realisedAmountOut: 2_900_000_000_000_000n,
    tradeId: BigInt(tradeId),
    instasettleBps: 0n,
    lastSweetSpot: 1n,
    isInstasettlable: false,
    usePriceBased: false,
    onlyInstasettle: false,
  };
}

function mockCore(): object {
  return {
    connect: vi.fn().mockReturnThis(),
    runner: {
      getFeeData: vi.fn().mockResolvedValue({
        maxFeePerGas: 1_000_000_000n,
        maxPriorityFeePerGas: 100_000_000n,
        gasPrice: 1_000_000_000n,
      }),
    },
    executeTrades: Object.assign(
      vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xsettle' }),
      }),
      {
        estimateGas: vi.fn().mockResolvedValue(600_000n),
      }
    ),
    cancelTrade: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ hash: '0xcancel' }),
    }),
  };
}

function loadPersisted(id: string) {
  const path = `${process.cwd()}/bots/${id}.stuck-trade.json`;
  if (!fs.existsSync(path)) return null;
  return JSON.parse(fs.readFileSync(path, 'utf8')) as {
    settlementAttempted?: boolean;
    cyclesSeen?: number;
  };
}

describe('integration — stuckTradeGuard settlement + cancel', () => {
  afterEach(() => {
    clearStuckTradeState(botId);
    vi.clearAllMocks();
    vi.mocked(isDryRun).mockReturnValue(false);
  });

  it('attempts executeTrades once at half the cancel threshold', async () => {
    const trade = openTrade(275);
    vi.spyOn(core, 'listOutstandingTradesForOwner').mockResolvedValue([trade]);
    vi.spyOn(core, 'fetchTrade').mockImplementation(async (_c, id) =>
      Number(id) === 275 ? trade : null
    );
    vi.spyOn(core, 'pairIdFromTokens').mockReturnValue(PAIR_ID);
    const executeSpy = vi
      .spyOn(core, 'executeTradesOnCore')
      .mockResolvedValue({ txHash: '0xsettle' });

    await maybeCancelStuckTrade(botConfig, mockCore() as never, {} as never);
    const result = await maybeCancelStuckTrade(
      botConfig,
      mockCore() as never,
      {} as never
    );

    expect(result.settlementAttempted).toBe(true);
    expect(result.settlementTxHash).toBe('0xsettle');
    expect(result.cancelled).toBe(false);
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(executeSpy).toHaveBeenCalledWith(expect.anything(), PAIR_ID);
    expect(loadPersisted(botId)?.settlementAttempted).toBe(true);
  });

  it('auto-cancels on the final cycle without a second executeTrades', async () => {
    const trade = openTrade(275);
    vi.spyOn(core, 'listOutstandingTradesForOwner').mockResolvedValue([trade]);
    vi.spyOn(core, 'fetchTrade').mockImplementation(async (_c, id) =>
      Number(id) === 275 ? trade : null
    );
    vi.spyOn(core, 'pairIdFromTokens').mockReturnValue(PAIR_ID);
    const executeSpy = vi
      .spyOn(core, 'executeTradesOnCore')
      .mockResolvedValue({ txHash: '0xsettle' });
    const cancelSpy = vi
      .spyOn(core, 'cancelTradeOnCore')
      .mockResolvedValue({ txHash: '0xcancel' });

    await maybeCancelStuckTrade(botConfig, mockCore() as never, {} as never);
    await maybeCancelStuckTrade(botConfig, mockCore() as never, {} as never);
    const result = await maybeCancelStuckTrade(
      botConfig,
      mockCore() as never,
      {} as never
    );

    expect(result.cancelled).toBe(true);
    expect(result.txHash).toBe('0xcancel');
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(loadPersisted(botId)).toBeNull();
  });

  it('skips executeTrades in DRY_RUN but records the attempt', async () => {
    vi.mocked(isDryRun).mockReturnValue(true);
    const trade = openTrade(275);
    vi.spyOn(core, 'listOutstandingTradesForOwner').mockResolvedValue([trade]);
    const executeSpy = vi.spyOn(core, 'executeTradesOnCore');

    await maybeCancelStuckTrade(botConfig, mockCore() as never, {} as never);
    const result = await maybeCancelStuckTrade(
      botConfig,
      mockCore() as never,
      {} as never
    );

    expect(result.dryRun).toBe(true);
    expect(result.settlementAttempted).toBe(true);
    expect(executeSpy).not.toHaveBeenCalled();
  });
});

describe('stuckSettlementAttemptCycle', () => {
  it('returns half-threshold cycle for cancel thresholds above 1', () => {
    expect(stuckSettlementAttemptCycle(3)).toBe(2);
    expect(stuckSettlementAttemptCycle(4)).toBe(2);
    expect(stuckSettlementAttemptCycle(5)).toBe(3);
  });

  it('returns null when threshold is 0 or 1', () => {
    expect(stuckSettlementAttemptCycle(0)).toBeNull();
    expect(stuckSettlementAttemptCycle(1)).toBeNull();
  });
});
