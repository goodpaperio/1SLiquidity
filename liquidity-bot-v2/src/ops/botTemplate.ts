import type { BotConfig } from '../config/schema.js';
import { privateKeyEnvForBotId } from '../config/loadBot.js';

export function createBotConfigTemplate(
  botId: string,
  address: string
): BotConfig {
  return {
    id: botId,
    enabled: false,
    address,
    privateKeyEnv: privateKeyEnvForBotId(botId),
    baseTokens: ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC'],
    scan: {
      intervalMs: 900_000,
      minSpreadBps: 300,
      minCoupledSpreadBps: -100,
      selectionMode: 'price_vs_depth',
      universeMode: 'hot_pairs',
      hotPairsLimit: 10,
      hotPairsMetric: 'slippageSavings',
      hotPairsCacheTtlMs: 3_600_000,
      requirePriceNeDepth: true,
      sellImpactBpsThreshold: 15,
      minNetBps: 0,
      decaProtocolFeeBps: 20,
      strategyMode: 'pnl',
      sizeSweepUsd: [5, 10, 25, 50],
      warmSetMode: 'prefer',
      warmSetLimit: 10,
      warmMaxCexSpreadBps: 25,
      watchMode: 'prefer',
      maxConfirmPairs: 3,
      maxCexStalenessMs: 30_000,
      maxDexMidAgeMs: 900_000,
      maxEthCallsPerCycle: 200,
      maxSpreadBps: 2500,
      minLiquidityRatio: 2,
      dustFloorUsd: 1,
      maxSellReserveUsageBps: 1500,
      finalistCount: 10,
      excludedTargets: ['ldo'],
      skipRecentTargetsCount: 10,
    },
    trade: {
      nominalTradeUsd: 50,
      balanceUsagePct: 45,
      maxOpenTrades: 3,
      decastreamAmountOutMinBufferBps: 160,
      directSwapSlippageBps: 50,
      pairCooldownMs: 15 * 60 * 1000,
      minTradesBetweenSamePair: 4,
      tradeHistoryMaxEntries: 32,
      usePriceBased: false,
      leg1UsePriceBased: true,
      leg2UsePriceBased: false,
      isInstasettlable: false,
      instasettleBps: 100,
      stuckCancelAfterCycles: 3,
    },
    gas: {
      minEthWei: '1500000000000000',
      targetEthWei: '3000000000000000',
      refuelDex: 'uniswap-v3-3000',
    },
    liquify: {
      enabled: true,
      contract: '0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95',
      dailySweepHourUtc: 11,
      minNativeEthUsd: 10,
      slippageBps: 300,
    },
    contracts: {
      core: '0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710',
      deploymentManifest:
        '../versions/deployment-addresses-mainnet-2.2.1.json',
    },
  };
}
