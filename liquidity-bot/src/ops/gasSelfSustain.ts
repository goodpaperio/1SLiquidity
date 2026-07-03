import { Contract, NonceManager, formatEther, type Provider, type Signer } from 'ethers';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import type { BotConfig } from '../config/schema.js';
import { WETH_WITHDRAW_ABI } from '../chain/liquifier.js';
import { isDryRun } from '../chain/wallet.js';
import { computeGasRefuel } from '../execution/gasRefuel.js';
import { swapExactOnCandidateDex } from '../execution/directSwap.js';
import { readPriceHints } from './priceCache.js';
import { prefixBotMessage, sendTelegram } from '../notify/telegram.js';
import {
  ERC20_ABI,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V3_QUOTER_V2,
  UNISWAP_V3_QUOTER_V2_ABI,
} from '../chain/contracts.js';
import { feeTierFromDexId } from '../scan/DexQuoteService.js';
import type { StreamDexId } from '../scan/types.js';
import { runLiquifySweep } from './liquifySweep.js';

const WETH = BASE_TOKEN_ADDRESSES.WETH;
const GAS_SWAP_BUFFER_BPS = 10_200n;
const BPS_DENOMINATOR = 10_000n;

export interface GasSelfSustainResult {
  dryRun: boolean;
  unwrappedWei: bigint;
  ethBefore: bigint;
  ethAfter: bigint;
  message: string;
  needsOperator: boolean;
  /** True when a gas-triggered liquify sweep ran (not the daily scheduler). */
  liquifiedForGas?: boolean;
}

export async function runGasSelfSustain(
  bot: BotConfig,
  provider: Provider,
  signer: Signer
): Promise<GasSelfSustainResult> {
  const owner = await signer.getAddress();
  const txSigner = new NonceManager(signer);
  const ethBefore = await readNativeBalance(provider, owner);
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

  const weth = new Contract(
    WETH,
    [...WETH_WITHDRAW_ABI, 'function balanceOf(address) view returns (uint256)'],
    provider
  );
  let wethBal = BigInt((await weth.balanceOf(owner)).toString());
  let liquifiedForGas = false;
  let liquifyNote: string | undefined;

  if (wethBal < decision.topUpWei) {
    const liquify = await maybeLiquifyForGasRefuel(bot, provider, signer);
    liquifyNote = liquify.message;
    if (liquify.ran) {
      liquifiedForGas = true;
      wethBal = BigInt((await weth.balanceOf(owner)).toString());
    }
  }

  const directTopUp = decision.topUpWei > wethBal ? wethBal : decision.topUpWei;

  if (directTopUp > 0n) {
    if (isDryRun()) {
      return {
        dryRun: true,
        unwrappedWei: directTopUp,
        ethBefore,
        ethAfter: ethBefore + directTopUp,
        message: formatGasRefuelMessage(
          `DRY_RUN would unwrap ${formatEther(directTopUp)} WETH → ETH`,
          liquifyNote
        ),
        needsOperator: false,
        liquifiedForGas,
      };
    }

    const wethSigner = new Contract(WETH, WETH_WITHDRAW_ABI, txSigner);
    const tx = await wethSigner.withdraw(directTopUp);
    await tx.wait();
    const ethAfter = await readNativeBalance(provider, owner);

    return {
      dryRun: false,
      unwrappedWei: directTopUp,
      ethBefore,
      ethAfter,
      message: formatGasRefuelMessage(
        `Unwrapped ${formatEther(directTopUp)} WETH → ETH for gas.`,
        liquifyNote
      ),
      needsOperator: ethAfter < minEth,
      liquifiedForGas,
    };
  }

  const fallback = await refuelFromConfiguredBase(bot, provider, owner, decision.topUpWei);
  if (!fallback) {
    return {
      dryRun: isDryRun(),
      unwrappedWei: 0n,
      ethBefore,
      ethAfter: ethBefore,
      message: formatGasRefuelMessage(
        'Native ETH low and no refuellable WETH/base token balance.',
        liquifyNote
      ),
      needsOperator: true,
      liquifiedForGas,
    };
  }

  if (isDryRun()) {
    return {
      dryRun: true,
      unwrappedWei: fallback.estimatedWethOut,
      ethBefore,
      ethAfter: ethBefore + fallback.estimatedWethOut,
      message: formatGasRefuelMessage(
        `DRY_RUN would swap ${fallback.symbol} → WETH on ${fallback.dex} ` +
          `and unwrap ≈ ${formatEther(fallback.estimatedWethOut)} ETH for gas`,
        liquifyNote
      ),
      needsOperator: false,
      liquifiedForGas,
    };
  }

  await swapExactOnCandidateDex(
    fallback.dex,
    fallback.tokenAddress,
    WETH,
    fallback.amountIn,
    fallback.minWethOut,
    owner,
    txSigner
  );

  const wethAfterSwap = BigInt((await weth.balanceOf(owner)).toString());
  if (wethAfterSwap <= 0n) {
    return {
      dryRun: false,
      unwrappedWei: 0n,
      ethBefore,
      ethAfter: ethBefore,
      message: formatGasRefuelMessage(
        `Gas refuel swap from ${fallback.symbol} completed but produced no unwrapable WETH.`,
        liquifyNote
      ),
      needsOperator: true,
      liquifiedForGas,
    };
  }

  const wethSigner = new Contract(WETH, WETH_WITHDRAW_ABI, txSigner);
  const unwrapTx = await wethSigner.withdraw(wethAfterSwap);
  await unwrapTx.wait();
  const ethAfter = await readNativeBalance(provider, owner);
  const unwrappedWei = ethAfter > ethBefore ? ethAfter - ethBefore : wethAfterSwap;

  return {
    dryRun: false,
    unwrappedWei,
    ethBefore,
    ethAfter,
    message: formatGasRefuelMessage(
      `Swapped ${fallback.symbol} → WETH on ${fallback.dex} and unwrapped ` +
        `${formatEther(unwrappedWei)} ETH for gas.`,
      liquifyNote
    ),
    needsOperator: ethAfter < minEth,
    liquifiedForGas,
  };
}

function formatGasRefuelMessage(main: string, liquifyNote?: string): string {
  if (!liquifyNote) return main;
  return `${liquifyNote}\n${main}`;
}

/**
 * When native ETH is low and WETH alone cannot top up, sweep allowlisted dust
 * alts → WETH via Liquifier before unwrap / base-token gas refuel.
 */
async function maybeLiquifyForGasRefuel(
  bot: BotConfig,
  provider: Provider,
  signer: Signer
): Promise<{ ran: boolean; message?: string }> {
  if (!bot.liquify?.enabled) {
    return { ran: false };
  }

  try {
    const sweep = await runLiquifySweep(bot, provider, signer);
    const ran = sweep.tokensAttempted > 0 && !sweep.dryRun;
    if (sweep.tokensAttempted === 0) {
      return { ran: false };
    }
    return { ran, message: sweep.message };
  } catch (err) {
    const short = err instanceof Error ? err.message : String(err);
    console.warn(`[${bot.id}] gas-refuel liquify failed:`, short);
    return { ran: false, message: `Liquify for gas failed: ${short}` };
  }
}

interface RefuelFallbackPlan {
  symbol: BaseTokenSymbol;
  tokenAddress: string;
  dex: StreamDexId;
  amountIn: bigint;
  estimatedWethOut: bigint;
  minWethOut: bigint;
}

async function refuelFromConfiguredBase(
  bot: BotConfig,
  provider: Provider,
  owner: string,
  targetWethOut: bigint
): Promise<RefuelFallbackPlan | null> {
  const dex = bot.gas.refuelDex as StreamDexId;

  for (const symbol of bot.baseTokens as BaseTokenSymbol[]) {
    if (symbol === 'WETH') continue;
    const tokenAddress = BASE_TOKEN_ADDRESSES[symbol];
    const erc20 = new Contract(tokenAddress, ERC20_ABI, provider);
    const balance = BigInt((await erc20.balanceOf(owner)).toString());
    if (balance <= 0n) continue;

    const quotedOut = await quoteGasRefuelDex(provider, dex, tokenAddress, balance);
    if (quotedOut == null || quotedOut <= 0n) continue;

    const rawAmountIn = ceilDiv(balance * targetWethOut, quotedOut);
    const bufferedAmountIn = ceilDiv(rawAmountIn * GAS_SWAP_BUFFER_BPS, BPS_DENOMINATOR);
    const amountIn = bufferedAmountIn > balance ? balance : bufferedAmountIn;
    if (amountIn <= 0n) continue;

    const estimatedWethOut = amountIn === balance
      ? quotedOut
      : (quotedOut * amountIn) / balance;
    const minWethOut = (estimatedWethOut * 9_500n) / BPS_DENOMINATOR;
    if (estimatedWethOut <= 0n || minWethOut <= 0n) continue;

    return {
      symbol,
      tokenAddress,
      dex,
      amountIn,
      estimatedWethOut,
      minWethOut,
    };
  }

  return null;
}

async function quoteGasRefuelDex(
  provider: Provider,
  dex: StreamDexId,
  tokenIn: string,
  amountIn: bigint
): Promise<bigint | null> {
  if (amountIn <= 0n) return null;

  if (dex === 'uniswap-v2' || dex === 'sushiswap') {
    const router = new Contract(UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, provider);
    try {
      const amounts = await router.getAmountsOut.staticCall(amountIn, [tokenIn, WETH]);
      return BigInt(amounts[amounts.length - 1].toString());
    } catch {
      return null;
    }
  }

  const fee = feeTierFromDexId(dex);
  if (fee == null) return null;

  const quoter = new Contract(UNISWAP_V3_QUOTER_V2, UNISWAP_V3_QUOTER_V2_ABI, provider);
  try {
    const result = await quoter.quoteExactInputSingle.staticCall({
      tokenIn,
      tokenOut: WETH,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0,
    });
    return BigInt(result[0].toString());
  } catch {
    return null;
  }
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return a === 0n ? 0n : ((a - 1n) / b) + 1n;
}

export async function maybeAlertLowEth(
  bot: BotConfig,
  provider: Provider,
  lastAlertAt: string | undefined
): Promise<string | undefined> {
  const eth = await readNativeBalance(provider, bot.address);
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
    `\n/auto refuel (liquify + unwrap) failed or insufficient balance — fund wallet or /liquify`;

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

async function readNativeBalance(
  provider: Provider,
  address: string
): Promise<bigint> {
  try {
    const raw = await (provider as Provider & {
      send(method: string, params: unknown[]): Promise<string>;
    }).send('eth_getBalance', [address, 'latest']);
    return BigInt(raw);
  } catch {
    return provider.getBalance(address);
  }
}
