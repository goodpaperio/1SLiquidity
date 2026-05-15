import type { BaseTokenSymbol } from './baseTokens.js';
import { BASE_TOKEN_DECIMALS } from './baseTokens.js';
import type { BotConfig } from './schema.js';

export interface PriceHints {
  ethUsd: number;
  btcUsd: number;
}

const DEFAULT_ETH_USD = 3500;
const DEFAULT_BTC_USD = 95_000;

export function getPriceHintsFromEnv(): PriceHints {
  return {
    ethUsd: parsePositiveEnv('ETH_USD', DEFAULT_ETH_USD),
    btcUsd: parsePositiveEnv('BTC_USD', DEFAULT_BTC_USD),
  };
}

function parsePositiveEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return n;
}

/** Convert nominal USD to base token amount in wei/smallest unit. */
export function nominalUsdToBaseAmount(
  baseSymbol: BaseTokenSymbol,
  nominalUsd: number,
  hints: PriceHints = getPriceHintsFromEnv()
): bigint {
  if (nominalUsd <= 0) {
    throw new Error('nominalUsd must be positive');
  }

  let amount: number;
  switch (baseSymbol) {
    case 'USDC':
    case 'USDT':
      amount = nominalUsd;
      break;
    case 'DAI':
      amount = nominalUsd;
      break;
    case 'WETH':
      amount = nominalUsd / hints.ethUsd;
      break;
    case 'WBTC':
      amount = nominalUsd / hints.btcUsd;
      break;
    default: {
      const _exhaustive: never = baseSymbol;
      throw new Error(`Unsupported base: ${_exhaustive}`);
    }
  }

  const decimals = BASE_TOKEN_DECIMALS[baseSymbol];
  return decimalToBigInt(amount, decimals);
}

export function decimalToBigInt(amount: number, decimals: number): bigint {
  const factor = 10 ** decimals;
  const scaled = Math.floor(amount * factor);
  if (!Number.isFinite(scaled) || scaled < 0) {
    throw new Error('Invalid amount for conversion');
  }
  return BigInt(scaled);
}

/**
 * effectiveIn = min(nominalUsd size, balance × balanceUsagePct / 100)
 */
export function computeEffectiveTradeAmount(
  balanceWei: bigint,
  nominalAmountWei: bigint,
  balanceUsagePct: number
): bigint {
  if (balanceWei <= 0n) {
    return 0n;
  }
  const cap = (balanceWei * BigInt(balanceUsagePct)) / 100n;
  if (nominalAmountWei <= cap) {
    return nominalAmountWei;
  }
  return cap;
}

export function computeEffectiveInForBase(
  bot: BotConfig,
  baseSymbol: BaseTokenSymbol,
  balanceWei: bigint,
  hints?: PriceHints
): bigint {
  const nominal = nominalUsdToBaseAmount(
    baseSymbol,
    bot.trade.nominalTradeUsd,
    hints
  );
  return computeEffectiveTradeAmount(
    balanceWei,
    nominal,
    bot.trade.balanceUsagePct
  );
}

/** Minimum notionally ~$1 equivalent (dust floor for scanning). */
export function isAboveDustFloor(
  amountWei: bigint,
  baseSymbol: BaseTokenSymbol,
  hints: PriceHints = getPriceHintsFromEnv()
): boolean {
  const oneUsd = nominalUsdToBaseAmount(baseSymbol, 1, hints);
  return amountWei >= oneUsd;
}
