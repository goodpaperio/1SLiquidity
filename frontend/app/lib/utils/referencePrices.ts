import type { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { WETH_ADDRESS } from '@/app/lib/utils/knownTradeTokens'

export { WETH_ADDRESS }

export const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'
export const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'
export const WBTC_ADDRESS = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'

export const REFERENCE_TOKEN_ADDRESSES = [
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  DAI_ADDRESS,
  WBTC_ADDRESS,
] as const

export const ETH_PEGGED_SYMBOLS = new Set([
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

/** BTC-denominated / BTC-pegged alts — price as BTC/USD when list price is missing. */
export const BTC_PEGGED_SYMBOLS = new Set([
  'tbtc',
  'cbbtc',
  'lbtc',
  'solvbtc',
  'sbtc',
  'btcb',
  'renbtc',
])

/** Mainnet addresses for BTC-pegged tokens (symbol-independent). */
export const BTC_PEGGED_ADDRESSES = new Set([
  '0x18084fba666a33d37592fa2633fd49a74dd93a88', // tBTC
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf', // cbBTC
  '0x8236a87084f8b84306f72007f36f2618a5634494', // LBTC
  '0x7a56e1c57c7475ccf742a1832b028f0456652f97', // SolvBTC
])

export function isBtcPeggedToken(address?: string, symbol?: string): boolean {
  const addr = address?.toLowerCase()
  if (addr && (addr === WBTC_ADDRESS || BTC_PEGGED_ADDRESSES.has(addr))) {
    return true
  }
  const sym = symbol?.toLowerCase()
  return Boolean(
    sym &&
      (sym === 'wbtc' || sym === 'btc' || BTC_PEGGED_SYMBOLS.has(sym))
  )
}

/** USD-pegged alts — treat as ~$1 when CoinGecko has no entry. */
export const USD_PEGGED_SYMBOLS = new Set([
  'usdc',
  'usdt',
  'dai',
  'usde',
  'susde',
  'frax',
  'pyusd',
  'tusd',
  'usdp',
  'gusd',
  'lusd',
  'crvusd',
  'usd0',
  'fdusd',
])

const REFERENCE_ADDRESS_SET = new Set([
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  DAI_ADDRESS,
  WBTC_ADDRESS,
])

const STABLE_ADDRESS_SET = new Set([
  USDC_ADDRESS,
  USDT_ADDRESS,
  DAI_ADDRESS,
])

/**
 * Temporary fixed live ETH/USD until settlement pricing is validated end-to-end.
 * Override via NEXT_PUBLIC_ETH_USD; remove when live API is trusted.
 */
export const ETH_USD_OVERRIDE = 1500

/** Fallback BTC/USD when CoinGecko is unavailable. Override via NEXT_PUBLIC_BTC_USD. */
export const BTC_USD_OVERRIDE = 95_000

/** Fallback USD for DAI/USDC/USDT when CoinGecko is unavailable. */
export const STABLE_USD_OVERRIDE = 1

export function resolveLiveEthUsd(_fetchedEthUsd: number): number {
  const env = process.env.NEXT_PUBLIC_ETH_USD
  if (env) {
    const n = Number(env)
    if (Number.isFinite(n) && n > 0) return n
  }
  return ETH_USD_OVERRIDE
}

export function resolveLiveBtcUsd(fetchedBtcUsd: number): number {
  const env = process.env.NEXT_PUBLIC_BTC_USD
  if (env) {
    const n = Number(env)
    if (Number.isFinite(n) && n > 0) return n
  }
  if (fetchedBtcUsd > 0) return fetchedBtcUsd
  return BTC_USD_OVERRIDE
}

export function resolveLiveStableUsd(fetchedStableUsd: number): number {
  if (fetchedStableUsd > 0) return fetchedStableUsd
  return STABLE_USD_OVERRIDE
}

export function isStableTokenAddress(address: string): boolean {
  return STABLE_ADDRESS_SET.has(address.toLowerCase())
}

/** Live ETH/USD from CoinGecko — dedicated API call, no cache. */
export async function fetchEthUsd(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,weth&vs_currencies=usd'
    )
    if (!res.ok) return 0

    const data = await res.json()
    const ethUsd = Number(data?.weth?.usd ?? data?.ethereum?.usd ?? 0)
    return Number.isFinite(ethUsd) && ethUsd > 0 ? ethUsd : 0
  } catch {
    return 0
  }
}

/** Always fetch live WETH/WBTC/stables — bypasses stale 2h localStorage market cache. */
export async function fetchLiveReferencePrices(): Promise<
  Record<string, number>
> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,weth,bitcoin,wrapped-bitcoin,usd-coin,tether,dai&vs_currencies=usd'
    )
    if (!res.ok) {
      return {
        [WETH_ADDRESS]: resolveLiveEthUsd(0),
        [WBTC_ADDRESS]: resolveLiveBtcUsd(0),
        [USDC_ADDRESS]: STABLE_USD_OVERRIDE,
        [USDT_ADDRESS]: STABLE_USD_OVERRIDE,
        [DAI_ADDRESS]: STABLE_USD_OVERRIDE,
      }
    }

    const data = await res.json()
    const ethUsd = Number(data?.weth?.usd ?? data?.ethereum?.usd ?? 0)
    const btcUsd = Number(
      data?.['wrapped-bitcoin']?.usd ?? data?.bitcoin?.usd ?? 0
    )

    const prices: Record<string, number> = {}
    prices[WETH_ADDRESS] = resolveLiveEthUsd(ethUsd)
    prices[WBTC_ADDRESS] = resolveLiveBtcUsd(btcUsd)
    prices[USDC_ADDRESS] = resolveLiveStableUsd(
      Number(data?.['usd-coin']?.usd ?? 0)
    )
    prices[USDT_ADDRESS] = resolveLiveStableUsd(Number(data?.tether?.usd ?? 0))
    prices[DAI_ADDRESS] = resolveLiveStableUsd(Number(data?.dai?.usd ?? 0))

    return prices
  } catch {
    return {
      [WETH_ADDRESS]: resolveLiveEthUsd(0),
      [WBTC_ADDRESS]: resolveLiveBtcUsd(0),
      [USDC_ADDRESS]: STABLE_USD_OVERRIDE,
      [USDT_ADDRESS]: STABLE_USD_OVERRIDE,
      [DAI_ADDRESS]: STABLE_USD_OVERRIDE,
    }
  }
}

export function isReferenceTokenAddress(address: string): boolean {
  return REFERENCE_ADDRESS_SET.has(address.toLowerCase())
}

/** Patch WETH/WBTC/stables and ETH/BTC/USD-pegged symbols with live prices. */
export function applyLiveReferencePrices(
  tokens: TOKENS_TYPE[],
  livePrices: Record<string, number>
): TOKENS_TYPE[] {
  const ethUsd =
    livePrices[WETH_ADDRESS.toLowerCase()] ?? livePrices[WETH_ADDRESS] ?? 0
  const btcUsd =
    livePrices[WBTC_ADDRESS.toLowerCase()] ?? livePrices[WBTC_ADDRESS] ?? 0
  const usdcUsd =
    livePrices[USDC_ADDRESS.toLowerCase()] ??
    livePrices[USDC_ADDRESS] ??
    STABLE_USD_OVERRIDE
  const usdtUsd =
    livePrices[USDT_ADDRESS.toLowerCase()] ??
    livePrices[USDT_ADDRESS] ??
    STABLE_USD_OVERRIDE
  const daiUsd =
    livePrices[DAI_ADDRESS.toLowerCase()] ??
    livePrices[DAI_ADDRESS] ??
    STABLE_USD_OVERRIDE

  return tokens.map((t) => {
    const addr = t.token_address.toLowerCase()
    const sym = t.symbol?.toLowerCase()
    let live = livePrices[addr] ?? livePrices[t.token_address] ?? 0
    if (!live && addr === WETH_ADDRESS) live = ethUsd
    if (!live && addr === WBTC_ADDRESS) live = btcUsd
    if (!live && addr === USDC_ADDRESS) live = usdcUsd
    if (!live && addr === USDT_ADDRESS) live = usdtUsd
    if (!live && addr === DAI_ADDRESS) live = daiUsd

    if (live > 0 && isReferenceTokenAddress(addr)) {
      return { ...t, usd_price: live }
    }
    if (ethUsd > 0 && (addr === WETH_ADDRESS || sym === 'weth' || sym === 'eth')) {
      return { ...t, usd_price: ethUsd }
    }
    if (btcUsd > 0 && isBtcPeggedToken(addr, sym)) {
      return { ...t, usd_price: btcUsd }
    }
    if (addr === USDC_ADDRESS || sym === 'usdc') {
      return { ...t, usd_price: usdcUsd }
    }
    if (addr === USDT_ADDRESS || sym === 'usdt') {
      return { ...t, usd_price: usdtUsd }
    }
    if (addr === DAI_ADDRESS || sym === 'dai') {
      return { ...t, usd_price: daiUsd }
    }
    if (sym && ETH_PEGGED_SYMBOLS.has(sym) && t.usd_price <= 0 && ethUsd > 0) {
      return { ...t, usd_price: ethUsd }
    }
    if (sym && USD_PEGGED_SYMBOLS.has(sym) && t.usd_price <= 0) {
      return { ...t, usd_price: STABLE_USD_OVERRIDE }
    }
    return t
  })
}
