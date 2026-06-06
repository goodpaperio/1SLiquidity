import { formatUnits } from 'viem'
import type { Trade } from '@/app/lib/graphql/types/trade'
import type { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { getTradeStatus } from '@/app/lib/utils/tradeStatus'

/** Subset of trade fields used for display; loose enough for list/card trade shapes. */
export type TradeDisplayInput = {
  minAmountOut?: string
  realisedAmountOut?: string
  lastSweetSpot?: string
  status?: Trade['status'] | string
  instasettlements?: Trade['instasettlements']
  completions?: { finalRealisedAmountOut: string }[]
  cancellations?: Trade['cancellations']
  executions?: Trade['executions']
}

export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

/** Mainnet tokens we trade but may be missing from the CoinGecko/custom list. */
const KNOWN_TRADE_TOKENS: Record<
  string,
  { symbol: string; decimals: number; name: string }
> = {
  [WETH_ADDRESS]: { symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai',
  },
  '0x514910771af9ca656af840dff83e8264ecf986ca': {
    symbol: 'LINK',
    decimals: 18,
    name: 'Chainlink',
  },
  '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': {
    symbol: 'ENS',
    decimals: 18,
    name: 'Ethereum Name Service',
  },
  '0xd33526068d116ce69f19a9ee46f0bd304f21a51f': {
    symbol: 'RPL',
    decimals: 18,
    name: 'Rocket Pool',
  },
  '0xc944e90c64b2c07662a292be6244bdf05cda44a7': {
    symbol: 'GRT',
    decimals: 18,
    name: 'The Graph',
  },
  '0x00f3c42833c3170159af4e92dbb451fb3f708917': {
    symbol: 'ICP',
    decimals: 8,
    name: 'Internet Computer',
  },
  '0x467bccd9d29f223bce8043b84e8c8b282827790f': {
    symbol: 'TEL',
    decimals: 2,
    name: 'Telcoin',
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
  },
}

function syntheticToken(
  address: string,
  meta: { symbol: string; decimals: number; name: string }
): TOKENS_TYPE {
  const symbol = meta.symbol
  return {
    name: meta.name,
    symbol,
    icon:
      symbol.toLowerCase() === 'usdt'
        ? '/tokens/usdt.svg'
        : '/icons/default-token.svg',
    popular: false,
    value: 0,
    status: 'increase',
    statusAmount: 0,
    token_address: address.toLowerCase(),
    decimals: meta.decimals,
    balance: '0',
    possible_spam: false,
    usd_price: 0,
    market_cap_rank: 999999,
    usd_value: 0,
  }
}

/** Resolve USD price with WETH/ETH and same-symbol fallbacks when list entry has price 0. */
export function resolveTokenUsdPrice(
  token: TOKENS_TYPE | null | undefined,
  tokenList: TOKENS_TYPE[]
): number {
  if (!token) return 0
  if (token.usd_price > 0) return token.usd_price

  const addr = token.token_address?.toLowerCase()
  const sym = token.symbol?.toLowerCase()

  if (addr === WETH_ADDRESS) {
    const priced = tokenList.find(
      (t) =>
        t.token_address?.toLowerCase() === WETH_ADDRESS &&
        t.usd_price > 0 &&
        (t.symbol.toLowerCase() === 'weth' || t.symbol.toLowerCase() === 'eth')
    )
    if (priced) return priced.usd_price
  }

  if (sym) {
    const bySymbol = tokenList.find(
      (t) => t.symbol?.toLowerCase() === sym && t.usd_price > 0
    )
    if (bySymbol) return bySymbol.usd_price
  }

  return 0
}

export function findTokenForTrade(
  address: string,
  tokenList: TOKENS_TYPE[],
  selectedToken?: TOKENS_TYPE | null
): TOKENS_TYPE | undefined {
  if (!address) return undefined

  const lower = address.toLowerCase()
  let match: TOKENS_TYPE | undefined

  if (lower === WETH_ADDRESS) {
    if (
      selectedToken &&
      (selectedToken.symbol.toLowerCase() === 'eth' ||
        selectedToken.symbol.toLowerCase() === 'weth')
    ) {
      match = selectedToken
    } else {
      match =
        tokenList.find(
          (t) =>
            t.token_address?.toLowerCase() === lower &&
            t.symbol.toLowerCase() === 'weth'
        ) ||
        tokenList.find((t) => t.token_address?.toLowerCase() === lower)
    }
  } else {
    match = tokenList.find((t) => t.token_address?.toLowerCase() === lower)
  }

  if (!match) {
    const known = KNOWN_TRADE_TOKENS[lower]
    if (known) {
      match = syntheticToken(lower, known)
    }
  }

  if (!match) return undefined

  const knownOverride = KNOWN_TRADE_TOKENS[lower]
  const merged = knownOverride
    ? {
        ...match,
        symbol: knownOverride.symbol,
        name: knownOverride.name,
        decimals: knownOverride.decimals,
      }
    : match

  return {
    ...merged,
    usd_price: resolveTokenUsdPrice(merged, tokenList),
  }
}

/** Implied price: display output per 1 unit of input (for detail panels). */
export function getImpliedTradePrice(
  amountInWei: bigint,
  outputWei: bigint,
  tokenInDecimals: number,
  tokenOutDecimals: number
): number {
  if (amountInWei <= BigInt(0) || outputWei <= BigInt(0)) return 0
  const amountIn = Number(formatUnits(amountInWei, tokenInDecimals))
  const amountOut = Number(formatUnits(outputWei, tokenOutDecimals))
  if (!Number.isFinite(amountIn) || !Number.isFinite(amountOut) || amountIn <= 0) {
    return 0
  }
  return amountOut / amountIn
}

/** Output amount to show in tables — avoids displaying 1 wei minAmountOut as "0". */
export function getDisplayOutputAmountWei(trade: TradeDisplayInput): bigint {
  const minOut = BigInt(trade.minAmountOut || '0')
  const realised = BigInt(trade.realisedAmountOut || '0')

  if (trade.instasettlements?.length) {
    const settled = BigInt(trade.instasettlements[0].totalAmountOut || '0')
    if (settled > BigInt(0)) return settled
  }

  if (trade.completions?.length) {
    const finalOut = BigInt(trade.completions[0].finalRealisedAmountOut || '0')
    if (finalOut > BigInt(0)) return finalOut
  }

  const status = getTradeStatus(trade)
  if (status !== 'ongoing' && realised > BigInt(0)) return realised

  if (realised > BigInt(0)) return realised
  if (minOut > BigInt(1)) return minOut

  return realised
}

export function formatTradeTokenAmount(
  amountWei: bigint,
  decimals: number
): string {
  return formatUnits(amountWei, decimals)
}

export function amountUsd(
  amountWei: bigint,
  decimals: number,
  usdPrice: number
): number {
  if (usdPrice <= 0 || amountWei <= BigInt(0)) return 0
  const human = Number(formatUnits(amountWei, decimals))
  if (!Number.isFinite(human)) return 0
  return human * usdPrice
}

export function isDustMinOut(minAmountOutWei: bigint): boolean {
  return minAmountOutWei > BigInt(0) && minAmountOutWei <= BigInt(1)
}

/** Label for output column: target vs realised. */
export function getOutputAmountLabel(
  trade: TradeDisplayInput
): '' | 'target' | 'realised' {
  const status = getTradeStatus(trade)
  if (status === 'ongoing' && !isDustMinOut(BigInt(trade.minAmountOut || '0'))) {
    return 'target'
  }
  if (getDisplayOutputAmountWei(trade) > BigInt(0)) return 'realised'
  return ''
}
