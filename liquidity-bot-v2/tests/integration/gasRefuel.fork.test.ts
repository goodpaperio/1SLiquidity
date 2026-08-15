import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  parseUnits,
  formatEther,
} from 'ethers';
import { runGasSelfSustain } from '../../src/ops/gasSelfSustain.js';
import type { BotConfig } from '../../src/config/schema.js';
import {
  BASE_TOKEN_ADDRESSES,
  BASE_TOKEN_DECIMALS,
  type BaseTokenSymbol,
} from '../../src/config/baseTokens.js';

const FORK_RPC_URL = process.env.FORK_RPC_URL?.trim() || 'http://127.0.0.1:8545';
const WETH = BASE_TOKEN_ADDRESSES.WETH;
const ERC20_TRANSFER_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;
const INITIAL_ETH_WEI = 500_000_000_000_000n;
const GAS_THRESHOLD_WEI = 5_000_000_000_000_000n;
const GAS_TARGET_WEI = 9_000_000_000_000_000n;

const BASE_CASES: Array<{
  symbol: BaseTokenSymbol;
  amount: string;
  whales: readonly string[];
}> = [
  {
    symbol: 'WETH',
    amount: '0.010',
    whales: [
      '0xF977814e90dA44bFA03b6295A0616a897441aceC',
      '0x28C6c06298d514Db089934071355E5743bf21d60',
    ],
  },
  {
    symbol: 'USDC',
    amount: '30',
    whales: [
      '0x55FE002aefF02F77364de339a1292923A15844B8',
      '0x28C6c06298d514Db089934071355E5743bf21d60',
    ],
  },
  {
    symbol: 'USDT',
    amount: '30',
    whales: [
      '0x28C6c06298d514Db089934071355E5743bf21d60',
      '0xF977814e90dA44bFA03b6295A0616a897441aceC',
    ],
  },
  {
    symbol: 'DAI',
    amount: '30',
    whales: [
      '0x47ac0Fb4F2D84898e4d9e7b4DAf7B1fD0e0eD38f',
      '0x28C6c06298d514Db089934071355E5743bf21d60',
    ],
  },
  {
    symbol: 'WBTC',
    amount: '0.0002',
    whales: [
      '0x28C6c06298d514Db089934071355E5743bf21d60',
      '0xF977814e90dA44bFA03b6295A0616a897441aceC',
    ],
  },
] as const;

describe('integration — gas refuel on mainnet fork', () => {
  for (const baseCase of BASE_CASES) {
    it(
      `refuels gas from ${baseCase.symbol} up to the 0.005 ETH requirement`,
    async () => {
      process.env.DRY_RUN = '0';
      const provider = new JsonRpcProvider(FORK_RPC_URL, 1, {
        staticNetwork: true,
        batchMaxCount: 1,
      });
      await assertForkAvailable(provider);
      const wallet = new Wallet(`0x${randomBytes(32).toString('hex')}`, provider);
      const address = await wallet.getAddress();

      await provider.send('anvil_setBalance', [address, `0x${INITIAL_ETH_WEI.toString(16)}`]);
      const token = BASE_TOKEN_ADDRESSES[baseCase.symbol];
      const decimals = BASE_TOKEN_DECIMALS[baseCase.symbol];
      const fundedAmount = parseUnits(baseCase.amount, decimals);
      await fundTokenOnFork(provider, token, baseCase.whales, address, fundedAmount);

      const erc20 = new Contract(token, ERC20_TRANSFER_ABI, provider);
      const weth = new Contract(WETH, ['function balanceOf(address) view returns (uint256)'], provider);

      const ethBefore = await readNativeBalance(provider, address);
      const tokenBefore = BigInt((await erc20.balanceOf(address)).toString());
      expect(tokenBefore).toBeGreaterThan(0n);
      if (baseCase.symbol !== 'WETH') {
        expect(BigInt((await weth.balanceOf(address)).toString())).toBe(0n);
      }

      const bot: BotConfig = {
        id: 'fork-gas-refuel',
        enabled: true,
        address,
        privateKeyEnv: 'BOT_FORK_GAS_KEY',
        baseTokens: [baseCase.symbol],
        scan: {
          intervalMs: 180000,
          minSpreadBps: 300,
          minCoupledSpreadBps: -100,
          selectionMode: 'mid_range_spread',
          maxSpreadBps: 2500,
          minLiquidityRatio: 2,
          dustFloorUsd: 1,
          maxSellReserveUsageBps: 1500,
          finalistCount: 10,
          excludedTargets: [],
          skipRecentTargetsCount: 10,
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
          minEthWei: GAS_THRESHOLD_WEI.toString(),
          targetEthWei: GAS_TARGET_WEI.toString(),
          refuelDex: 'uniswap-v3-3000',
        },
        liquify: {
          enabled: false,
          contract: '0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95',
          dailySweepHourUtc: 11,
          minNativeEthUsd: 10,
          slippageBps: 300,
        },
        contracts: {
          core: '0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710',
          deploymentManifest: '../versions/deployment-addresses-mainnet-2.2.1.json',
        },
      };

      const result = await runGasSelfSustain(bot, provider, wallet);
      const ethAfter = await readNativeBalance(provider, address);
      const tokenAfter = BigInt((await erc20.balanceOf(address)).toString());
      const wethAfter = BigInt((await weth.balanceOf(address)).toString());

      expect(result.dryRun).toBe(false);
      expect(result.needsOperator).toBe(false);
      if (baseCase.symbol === 'WETH') {
        expect(result.message).toContain('Unwrapped');
      } else {
        expect(result.message).toContain(`Swapped ${baseCase.symbol}`);
      }
      expect(ethAfter).toBeGreaterThan(ethBefore);
      expect(ethAfter).toBeGreaterThanOrEqual(BigInt(bot.gas.minEthWei));
      expect(tokenAfter).toBeLessThan(tokenBefore);
      if (baseCase.symbol === 'WETH') {
        expect(wethAfter).toBe(tokenBefore - result.unwrappedWei);
      } else {
        expect(wethAfter).toBe(0n);
      }
      expect(result.unwrappedWei).toBeGreaterThan(0n);
      console.log(
        `[fork-gas:${baseCase.symbol}] ETH ${formatEther(ethBefore)} -> ${formatEther(ethAfter)}, ` +
          `${baseCase.symbol} spent ${(tokenBefore - tokenAfter).toString()}`
      );
    },
    120_000
  );
  }
});

async function assertForkAvailable(provider: JsonRpcProvider): Promise<void> {
  try {
    await provider.getBlockNumber();
    await provider.send('web3_clientVersion', []);
    await provider.send('anvil_nodeInfo', []);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Fork RPC ${FORK_RPC_URL} is not a reachable Anvil mainnet fork: ${reason}`
    );
  }
}

async function fundTokenOnFork(
  provider: JsonRpcProvider,
  token: string,
  whales: readonly string[],
  recipient: string,
  amount: bigint
): Promise<void> {
  const erc20 = new Contract(token, ERC20_TRANSFER_ABI, provider);

  for (const whale of whales) {
    try {
      const whaleBalance = BigInt((await erc20.balanceOf(whale)).toString());
      if (whaleBalance < amount) continue;

      await provider.send('anvil_impersonateAccount', [whale]);
      await provider.send('anvil_setBalance', [whale, '0x56BC75E2D63100000']);
      const whaleSigner = await provider.getSigner(whale);
      const tx = await erc20.connect(whaleSigner).transfer(recipient, amount);
      await tx.wait();
      await provider.send('anvil_stopImpersonatingAccount', [whale]);
      return;
    } catch {
      try {
        await provider.send('anvil_stopImpersonatingAccount', [whale]);
      } catch {
        /* ignore cleanup error */
      }
    }
  }

  throw new Error(`Could not fund fork wallet with token ${token} from known whale accounts`);
}

async function readNativeBalance(
  provider: JsonRpcProvider,
  address: string
): Promise<bigint> {
  return BigInt(await provider.send('eth_getBalance', [address, 'latest']));
}
