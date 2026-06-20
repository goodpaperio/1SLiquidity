import { formatUnits } from 'viem'
import type { Trade } from '@/app/lib/graphql/types/trade'
import type { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import {
  getKnownTradeToken,
  KNOWN_TRADE_TOKENS,
  WETH_ADDRESS,
} from '@/app/lib/utils/knownTradeTokens'
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

export { WETH_ADDRESS }

/** LSTs / ETH derivatives — USD ≈ ETH when CoinGecko has no entry for the alt. */
const ETH_PEGGED_SYMBOLS = new Set([
  'wsteth',
  'steth',
  'reth',
  'cbeth',
  'sweth',
  'ethx',
  'sfrxeth',
  'weeth',
])

function fallbackEthUsd(): number {
  const env = process.env.NEXT_PUBLIC_ETH_USD
  if (env) {
    const n = Number(env)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function ethUsdFromList(tokenList: TOKENS_TYPE[]): number {
  for (const t of tokenList) {
    if (t.usd_price <= 0) continue
    const sym = t.symbol?.toLowerCase()
    const addr = t.token_address?.toLowerCase()
    if (addr === WETH_ADDRESS || sym === 'weth' || sym === 'eth') {
      return t.usd_price
    }
  }
  return fallbackEthUsd()
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

  const ethUsd = ethUsdFromList(tokenList)
  if (ethUsd > 0) {
    if (addr === WETH_ADDRESS || sym === 'weth' || sym === 'eth') {
      return ethUsd
    }
    if (sym && ETH_PEGGED_SYMBOLS.has(sym)) {
      return ethUsd
    }
  }

  return 0
}

/** Decimals for display — known map, then token, then 18. */
export function resolveTradeTokenDecimals(
  token: TOKENS_TYPE | undefined,
  address?: string
): number {
  const known = getKnownTradeToken(address)
  if (known) return known.decimals
  if (token?.decimals != null) return token.decimals
  return 18
}

/** Symbol for display — known map, then token, then '?'. */
export function resolveTradeTokenSymbol(
  token: TOKENS_TYPE | undefined,
  address?: string
): string {
  if (token?.symbol) return token.symbol
  const known = getKnownTradeToken(address)
  if (known) return known.symbol
  return '?'
}

export function formatTradeAmountForDisplay(
  amountWei: bigint,
  token: TOKENS_TYPE | undefined,
  address?: string
): string {
  return formatTradeTokenAmount(
    amountWei,
    resolveTradeTokenDecimals(token, address)
  )
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

/** USD value of trade input (amountIn) for dashboard volume. */
export function tradeInputVolumeUsd(
  trade: { tokenIn: string; amountIn: string },
  tokenList: TOKENS_TYPE[]
): number {
  const tokenIn = findTokenForTrade(trade.tokenIn, tokenList)
  if (!tokenIn) return 0
  return amountUsd(
    BigInt(trade.amountIn || '0'),
    resolveTradeTokenDecimals(tokenIn, trade.tokenIn),
    tokenIn.usd_price
  )
}

/** USD instasettle savings on remaining output for dashboard earnings. */
export function tradeInstasettleSavingsUsd(
  trade: {
    tokenOut: string
    minAmountOut: string
    realisedAmountOut: string
    instasettleBps: string | number
  },
  tokenList: TOKENS_TYPE[]
): number {
  const tokenOut = findTokenForTrade(trade.tokenOut, tokenList)
  if (!tokenOut) return 0

  const remainingAmountOut =
    BigInt(trade.minAmountOut || '0') - BigInt(trade.realisedAmountOut || '0')
  const savingsWei =
    remainingAmountOut > BigInt(0) ? remainingAmountOut : BigInt(0)
  const savingsTokens =
    (Number(formatUnits(savingsWei, resolveTradeTokenDecimals(tokenOut, trade.tokenOut))) *
      Number(trade.instasettleBps)) /
    10000

  if (!Number.isFinite(savingsTokens) || savingsTokens <= 0) return 0
  return savingsTokens * tokenOut.usd_price
}

export function formatUsdCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
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
