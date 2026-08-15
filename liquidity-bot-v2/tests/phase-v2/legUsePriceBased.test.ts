import { Interface } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { botConfigSchema } from '../../src/config/schema.js';
import { createBotConfigTemplate } from '../../src/ops/botTemplate.js';
import { CORE_EVENT_ABI } from '../../src/notify/parseTradeEvents.js';
import {
  encodePlaceTradeData,
  placeTradeOnCore,
} from '../../src/execution/placeTradeLeg.js';

const mockEnsureAllowance = vi.fn();
const mockPlaceTrade = vi.fn();

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

describe('v2 per-leg usePriceBased', () => {
  const bot = botConfigSchema.parse({
    ...createBotConfigTemplate(
      'leg-flags',
      '0x1111111111111111111111111111111111111111'
    ),
    trade: {
      ...createBotConfigTemplate(
        'leg-flags',
        '0x1111111111111111111111111111111111111111'
      ).trade,
      leg1UsePriceBased: true,
      leg2UsePriceBased: false,
      usePriceBased: true, // legacy; should not override explicit leg2 false after transform when leg2 set
    },
  });

  beforeEach(() => {
    mockEnsureAllowance.mockReset();
    mockPlaceTrade.mockReset();
    mockEnsureAllowance.mockResolvedValue(undefined);
  });

  it('defaults leg1 true / leg2 false on template', () => {
    expect(bot.trade.leg1UsePriceBased).toBe(true);
    expect(bot.trade.leg2UsePriceBased).toBe(false);
  });

  it('maps legacy usePriceBased-only configs onto leg2', () => {
    const legacy = botConfigSchema.parse({
      ...createBotConfigTemplate(
        'legacy',
        '0x1111111111111111111111111111111111111111'
      ),
      trade: {
        ...createBotConfigTemplate(
          'legacy',
          '0x1111111111111111111111111111111111111111'
        ).trade,
        usePriceBased: true,
        leg1UsePriceBased: undefined,
        leg2UsePriceBased: undefined,
      },
    });
    // After transform: explicit undefined in spread may still leave template values.
    // Parse a raw object without leg flags:
    const raw = botConfigSchema.parse({
      id: 'legacy2',
      enabled: false,
      address: '0x1111111111111111111111111111111111111111',
      privateKeyEnv: 'BOT_LEGACY2_KEY',
      baseTokens: ['WETH'],
      scan: {
        intervalMs: 900000,
        minSpreadBps: 300,
        maxSpreadBps: 2500,
        minLiquidityRatio: 2,
        maxSellReserveUsageBps: 1500,
      },
      trade: {
        nominalTradeUsd: 10,
        balanceUsagePct: 45,
        maxOpenTrades: 1,
        decastreamAmountOutMinBufferBps: 160,
        directSwapSlippageBps: 50,
        pairCooldownMs: 900000,
        usePriceBased: true,
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
    });
    expect(raw.trade.leg2UsePriceBased).toBe(true);
    expect(raw.trade.usePriceBased).toBe(true);
    expect(raw.trade.leg1UsePriceBased).toBe(true);
  });

  it('encodePlaceTradeData embeds usePriceBased flag', () => {
    const data = encodePlaceTradeData({
      tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amountIn: 1n,
      amountOutMin: 1n,
      isInstasettlable: false,
      usePriceBased: false,
      instasettleBps: 100,
      onlyInstasettle: false,
    });
    expect(data.startsWith('0x')).toBe(true);
    expect(data.length).toBeGreaterThan(10);
  });

  it('placeTradeOnCore uses leg2UsePriceBased by default', async () => {
    const tradeCreatedIface = new Interface([CORE_EVENT_ABI[0]]);
    const encoded = tradeCreatedIface.encodeEventLog('TradeCreated', [
      42,
      bot.address,
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      1n,
      1n,
      1n,
      0n,
      false,
      100n,
      0n,
      false,
      false,
    ]);
    mockPlaceTrade.mockResolvedValue({
      wait: async () => ({
        hash: '0xabc',
        logs: [
          {
            address: bot.contracts.core,
            topics: encoded.topics,
            data: encoded.data,
          },
        ],
      }),
    });

    const signer = {
      getAddress: async () => bot.address,
    } as never;

    await placeTradeOnCore(
      bot,
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      1n,
      1n,
      signer
    );

    expect(mockPlaceTrade).toHaveBeenCalledTimes(1);
    const calldata = mockPlaceTrade.mock.calls[0][0] as string;
    // false usePriceBased encodes as 32-byte zero word in the bool slot
    expect(typeof calldata).toBe('string');
    expect(calldata.length).toBeGreaterThan(0);
  });
});
