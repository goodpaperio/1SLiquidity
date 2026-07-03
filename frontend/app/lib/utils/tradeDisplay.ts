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

export const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'
export const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'
export const WBTC_ADDRESS = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'

/** Base tokens merged into custom lists so WETH/stables always have live prices. */
export const REFERENCE_TOKEN_ADDRESSES = [
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  DAI_ADDRESS,
  WBTC_ADDRESS,
] as const

const STABLE_ADDRESSES = new Set([USDC_ADDRESS, USDT_ADDRESS, DAI_ADDRESS])

const NOTIONAL_AGREEMENT_THRESHOLD = 0.05

export type TradeUsdBreakdown = {
  inputUsd: number
  outputUsd: number
  notionalUsd: number
}

type ReferenceLeg = 'weth' | 'stable' | false

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
  'lseth',
  'oseth',
  'frxeth',
  'eth+',
])

function fallbackEthUsd(): number {
  const env = process.env.NEXT_PUBLIC_ETH_USD
  if (env) {
    const n = Number(env)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 3500
}

/** Merge bot-universe tokens with the full CoinGecko feed for price resolution. */
export function mergePricingLists(
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): TOKENS_TYPE[] {
  if (!priceFeed?.length) return tokenList

  const byAddress = new Map<string, TOKENS_TYPE>()
  for (const t of tokenList) {
    byAddress.set(t.token_address.toLowerCase(), t)
  }
  for (const t of priceFeed) {
    const key = t.token_address.toLowerCase()
    if (!byAddress.has(key)) {
      byAddress.set(key, t)
    }
  }
  return Array.from(byAddress.values())
}

function referenceLeg(address: string): ReferenceLeg {
  const lower = address.toLowerCase()
  if (lower === WETH_ADDRESS) return 'weth'
  if (STABLE_ADDRESSES.has(lower)) return 'stable'

  const known = getKnownTradeToken(lower)
  if (known) {
    const sym = known.symbol.toLowerCase()
    if (sym === 'weth' || sym === 'eth') return 'weth'
    if (sym === 'usdc' || sym === 'usdt' || sym === 'dai') return 'stable'
  }
  return false
}

/** Live ETH/USD — prefers the full price feed over a partial custom token list. */
export function getEthUsdPrice(
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): number {
  const lists = priceFeed?.length ? [priceFeed, tokenList] : [tokenList]

  for (const list of lists) {
    for (const t of list) {
      if (t.usd_price <= 0) continue
      const sym = t.symbol?.toLowerCase()
      const addr = t.token_address?.toLowerCase()
      if (addr === WETH_ADDRESS || sym === 'weth' || sym === 'eth') {
        return t.usd_price
      }
    }
  }

  for (const list of lists) {
    for (const t of list) {
      if (t.usd_price <= 0) continue
      const sym = t.symbol?.toLowerCase()
      if (sym && ETH_PEGGED_SYMBOLS.has(sym)) {
        return t.usd_price
      }
    }
  }

  return fallbackEthUsd()
}

/** Single notional for volume/stats — avoids max(input, output) inflation. */
export function resolveCanonicalNotionalUsd(
  inputUsd: number,
  outputUsd: number,
  tokenIn: string,
  tokenOut: string
): number {
  if (inputUsd <= 0 && outputUsd <= 0) return 0
  if (inputUsd <= 0) return outputUsd
  if (outputUsd <= 0) return inputUsd

  const inRef = referenceLeg(tokenIn)
  const outRef = referenceLeg(tokenOut)

  if (outRef && !inRef) return outputUsd
  if (inRef && !outRef) return inputUsd

  const max = Math.max(inputUsd, outputUsd)
  const min = Math.min(inputUsd, outputUsd)
  if (max > 0 && (max - min) / max <= NOTIONAL_AGREEMENT_THRESHOLD) {
    return (inputUsd + outputUsd) / 2
  }

  if (outRef === 'weth' || inRef === 'weth') {
    return outRef === 'weth' ? outputUsd : inputUsd
  }
  if (outRef === 'stable' || inRef === 'stable') {
    return outRef === 'stable' ? outputUsd : inputUsd
  }

  return Math.min(inputUsd, outputUsd)
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
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): number {
  if (!token) return 0
  if (token.usd_price > 0) return token.usd_price

  const pricingList = mergePricingLists(tokenList, priceFeed)
  const addr = token.token_address?.toLowerCase()
  const sym = token.symbol?.toLowerCase()

  if (addr === WETH_ADDRESS) {
    const priced = pricingList.find(
      (t) =>
        t.token_address?.toLowerCase() === WETH_ADDRESS && t.usd_price > 0
    )
    if (priced) return priced.usd_price
  }

  if (sym) {
    const bySymbol = pricingList.find(
      (t) => t.symbol?.toLowerCase() === sym && t.usd_price > 0
    )
    if (bySymbol) return bySymbol.usd_price
  }

  const ethUsd = getEthUsdPrice(pricingList, priceFeed)
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
  selectedToken?: TOKENS_TYPE | null,
  priceFeed?: TOKENS_TYPE[]
): TOKENS_TYPE | undefined {
  if (!address) return undefined

  const pricingList = mergePricingLists(tokenList, priceFeed)
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
        pricingList.find(
          (t) =>
            t.token_address?.toLowerCase() === lower &&
            t.symbol.toLowerCase() === 'weth'
        ) ||
        pricingList.find((t) => t.token_address?.toLowerCase() === lower)
    }
  } else {
    match = pricingList.find((t) => t.token_address?.toLowerCase() === lower)
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
    usd_price: resolveTokenUsdPrice(merged, pricingList, priceFeed),
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

/** Input, output, and canonical notional USD from one shared price snapshot. */
export function getTradeUsdBreakdown(
  trade: TradeDisplayInput & {
    tokenIn: string
    tokenOut: string
    amountIn: string
  },
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): TradeUsdBreakdown {
  const tokenIn = findTokenForTrade(
    trade.tokenIn,
    tokenList,
    undefined,
    priceFeed
  )
  const tokenOut = findTokenForTrade(
    trade.tokenOut,
    tokenList,
    undefined,
    priceFeed
  )

  const inputUsd = tokenIn
    ? amountUsd(
        BigInt(trade.amountIn || '0'),
        resolveTradeTokenDecimals(tokenIn, trade.tokenIn),
        tokenIn.usd_price
      )
    : 0

  const outputUsd = tokenOut
    ? amountUsd(
        getDisplayOutputAmountWei(trade),
        resolveTradeTokenDecimals(tokenOut, trade.tokenOut),
        tokenOut.usd_price
      )
    : 0

  const notionalUsd = resolveCanonicalNotionalUsd(
    inputUsd,
    outputUsd,
    trade.tokenIn,
    trade.tokenOut
  )

  return { inputUsd, outputUsd, notionalUsd }
}

/** USD value of trade input (amountIn) for dashboard volume. */
export function tradeInputVolumeUsd(
  trade: { tokenIn: string; amountIn: string },
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): number {
  return getTradeUsdBreakdown(
    {
      ...trade,
      tokenOut: '',
      minAmountOut: '0',
      realisedAmountOut: '0',
    },
    tokenList,
    priceFeed
  ).inputUsd
}

/** USD notional for dashboard volume — single canonical value per trade. */
export function tradeNotionalVolumeUsd(
  trade: TradeDisplayInput & {
    tokenIn: string
    tokenOut: string
    amountIn: string
  },
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): number {
  return getTradeUsdBreakdown(trade, tokenList, priceFeed).notionalUsd
}

/** The USD notional users expect from trade cards. */
export function tradeDisplayNotionalUsd(
  trade: TradeDisplayInput & {
    tokenIn: string
    tokenOut: string
    amountIn: string
  },
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): number {
  return tradeNotionalVolumeUsd(trade, tokenList, priceFeed)
}

/** USD instasettle savings on remaining output for dashboard earnings. */
export function tradeInstasettleSavingsUsd(
  trade: {
    tokenOut: string
    minAmountOut: string
    realisedAmountOut: string
    instasettleBps: string | number
  },
  tokenList: TOKENS_TYPE[],
  priceFeed?: TOKENS_TYPE[]
): number {
  const tokenOut = findTokenForTrade(
    trade.tokenOut,
    tokenList,
    undefined,
    priceFeed
  )
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
