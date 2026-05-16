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
      intervalMs: 180_000,
      minSpreadBps: 1000,
      minLiquidityRatio: 2,
    },
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
      minEthWei: '1500000000000000',
      targetEthWei: '3000000000000000',
      refuelDex: 'uniswap-v3-3000',
    },
    contracts: {
      core: '0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710',
      deploymentManifest:
        '../versions/deployment-addresses-mainnet-2.2.1.json',
    },
  };
}
