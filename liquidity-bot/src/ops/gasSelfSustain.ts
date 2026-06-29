import { Contract, formatEther, type Provider, type Signer } from 'ethers';
import { BASE_TOKEN_ADDRESSES } from '../config/baseTokens.js';
import type { BotConfig } from '../config/schema.js';
import { WETH_WITHDRAW_ABI } from '../chain/liquifier.js';
import { isDryRun } from '../chain/wallet.js';
import { computeGasRefuel } from '../execution/gasRefuel.js';
import { readPriceHints } from './priceCache.js';
import { prefixBotMessage, sendTelegram } from '../notify/telegram.js';

const WETH = BASE_TOKEN_ADDRESSES.WETH;

export interface GasSelfSustainResult {
  dryRun: boolean;
  unwrappedWei: bigint;
  ethBefore: bigint;
  ethAfter: bigint;
  message: string;
  needsOperator: boolean;
}

export async function runGasSelfSustain(
  bot: BotConfig,
  provider: Provider,
  signer: Signer
): Promise<GasSelfSustainResult> {
  const owner = await signer.getAddress();
  const ethBefore = await provider.getBalance(owner);
  const minEth = BigInt(bot.gas.minEthWei);
  const targetEth = BigInt(bot.gas.targetEthWei);

  const decision = computeGasRefuel(ethBefore, minEth, targetEth);
  if (!decision.shouldRefuel) {
    return {
      dryRun: isDryRun(),
      unwrappedWei: 0n,
      ethBefore,
      ethAfter: ethBefore,
      message: 'Native ETH above minimum — no unwrap needed.',
      needsOperator: false,
    };
  }

  const weth = new Contract(WETH, [...WETH_WITHDRAW_ABI, 'function balanceOf(address) view returns (uint256)'], provider);
  const wethBal = BigInt((await weth.balanceOf(owner)).toString());

  if (wethBal <= 0n) {
    return {
      dryRun: isDryRun(),
      unwrappedWei: 0n,
      ethBefore,
      ethAfter: ethBefore,
      message: 'Native ETH low and no WETH to unwrap.',
      needsOperator: true,
    };
  }

  const topUp = decision.topUpWei > wethBal ? wethBal : decision.topUpWei;
  if (topUp <= 0n) {
    return {
      dryRun: isDryRun(),
      unwrappedWei: 0n,
      ethBefore,
      ethAfter: ethBefore,
      message: 'Nothing to unwrap.',
      needsOperator: ethBefore < minEth,
    };
  }

  if (isDryRun()) {
    return {
      dryRun: true,
      unwrappedWei: topUp,
      ethBefore,
      ethAfter: ethBefore + topUp,
      message: `DRY_RUN would unwrap ${formatEther(topUp)} WETH → ETH`,
      needsOperator: false,
    };
  }

  const wethSigner = new Contract(WETH, WETH_WITHDRAW_ABI, signer);
  const tx = await wethSigner.withdraw(topUp);
  await tx.wait();
  const ethAfter = await provider.getBalance(owner);

  return {
    dryRun: false,
    unwrappedWei: topUp,
    ethBefore,
    ethAfter,
    message: `Unwrapped ${formatEther(topUp)} WETH → ETH for gas.`,
    needsOperator: ethAfter < minEth,
  };
}

export async function maybeAlertLowEth(
  bot: BotConfig,
  provider: Provider,
  lastAlertAt: string | undefined
): Promise<string | undefined> {
  const eth = await provider.getBalance(bot.address);
  const minEth = BigInt(bot.gas.minEthWei);
  if (eth >= minEth) return undefined;

  const hints = readPriceHints();
  const ethUsd = hints?.ethUsd ?? 0;
  const minUsd =
    ethUsd > 0
      ? (Number(formatEther(minEth)) * ethUsd).toFixed(2)
      : formatEther(minEth);

  if (lastAlertAt) {
    const elapsed = Date.now() - Date.parse(lastAlertAt);
    if (elapsed < 6 * 60 * 60 * 1000) return undefined;
  }

  const body =
    `⚠️ <b>Low native ETH</b>\n` +
    `balance: ${formatEther(eth)} ETH` +
    (ethUsd > 0 ? ` (~$${(Number(formatEther(eth)) * ethUsd).toFixed(2)})` : '') +
    `\nmin: ${formatEther(minEth)} ETH` +
    (ethUsd > 0 ? ` (~$${minUsd})` : '') +
    `\n/auto unwrap failed or insufficient WETH — fund wallet or /liquify`;

  await sendTelegram(prefixBotMessage(bot.id, body));
  return new Date().toISOString();
}

export function nativeEthBelowUsdThreshold(
  ethWei: bigint,
  minNativeEthUsd: number,
  ethUsd: number
): boolean {
  if (ethUsd <= 0) return false;
  const eth = Number(formatEther(ethWei));
  return eth * ethUsd < minNativeEthUsd;
}
