import { describe, expect, it, vi } from 'vitest';
import type { BotConfig } from '../../src/config/schema.js';

vi.mock('../../src/chain/core.js', () => ({
  getCoreContract: vi.fn(() => ({})),
  listOutstandingTradesForOwner: vi.fn(),
}));

import * as core from '../../src/chain/core.js';
import { BotRunner } from '../../src/runner/BotRunner.js';

const botConfig: BotConfig = {
  id: 'runner-cycle',
  enabled: true,
  address: '0x1111111111111111111111111111111111111111',
  privateKeyEnv: 'BOT_RUNNER_CYCLE_KEY',
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

describe('phase B — BotRunner cycle guards', () => {
  it('skips scan when outstanding trades reached', async () => {
    vi.mocked(core.listOutstandingTradesForOwner).mockResolvedValueOnce([
      {
        owner: botConfig.address,
        attempts: 0,
        tokenIn: '0x0',
        tokenOut: '0x0',
        amountIn: 0n,
        amountRemaining: 1n,
        targetAmountOut: 0n,
        realisedAmountOut: 0n,
        tradeId: 1n,
        instasettleBps: 0n,
        lastSweetSpot: 0n,
        isInstasettlable: false,
        usePriceBased: false,
        onlyInstasettle: false,
      },
    ]);

    const scanBot = vi.fn();
    const runner = new BotRunner(botConfig);
    await (runner as any).runCycle(
      botConfig.id,
      { scanBot } as unknown as { scanBot: () => Promise<unknown> },
      {} as never
    );

    expect(scanBot).not.toHaveBeenCalled();
  });

  it('runs scan when no outstanding trades', async () => {
    vi.mocked(core.listOutstandingTradesForOwner).mockResolvedValueOnce([]);

    const scanBot = vi.fn().mockResolvedValue({
      pairsScanned: 0,
      pairsSkipped: 0,
      opportunities: [],
      errors: 0,
      diagnostics: {
        mode: 'live',
        totalPairsInUniverse: 0,
        pairsConsidered: 0,
        heldBases: [],
        scanBases: [],
        baseBalances: {},
      },
      durationMs: 1,
    });
    const runner = new BotRunner(botConfig);
    await (runner as any).runCycle(
      botConfig.id,
      { scanBot } as unknown as { scanBot: () => Promise<unknown> },
      {} as never
    );

    expect(scanBot).toHaveBeenCalledTimes(1);
  });
});
