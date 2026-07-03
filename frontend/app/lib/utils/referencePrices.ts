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

const REFERENCE_ADDRESS_SET = new Set([
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  DAI_ADDRESS,
])

/**
 * Temporary fixed live ETH/USD until settlement pricing is validated end-to-end.
 * Override via NEXT_PUBLIC_ETH_USD; remove when live API is trusted.
 */
export const ETH_USD_OVERRIDE = 1500

export function resolveLiveEthUsd(_fetchedEthUsd: number): number {
  const env = process.env.NEXT_PUBLIC_ETH_USD
  if (env) {
    const n = Number(env)
    if (Number.isFinite(n) && n > 0) return n
  }
  return ETH_USD_OVERRIDE
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

/** Always fetch live WETH/stables — bypasses stale 2h localStorage market cache. */
export async function fetchLiveReferencePrices(): Promise<
  Record<string, number>
> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,weth,usd-coin,tether,dai&vs_currencies=usd'
    )
    if (!res.ok) {
      return { [WETH_ADDRESS]: resolveLiveEthUsd(0) }
    }

    const data = await res.json()
    const ethUsd = Number(data?.weth?.usd ?? data?.ethereum?.usd ?? 0)

    const prices: Record<string, number> = {}
    const resolvedEth = resolveLiveEthUsd(ethUsd)
    prices[WETH_ADDRESS] = resolvedEth
    const usdc = Number(data?.['usd-coin']?.usd ?? 0)
    if (usdc > 0) prices[USDC_ADDRESS] = usdc
    const usdt = Number(data?.tether?.usd ?? 0)
    if (usdt > 0) prices[USDT_ADDRESS] = usdt
    const dai = Number(data?.dai?.usd ?? 0)
    if (dai > 0) prices[DAI_ADDRESS] = dai

    return prices
  } catch {
    return { [WETH_ADDRESS]: resolveLiveEthUsd(0) }
  }
}

export function isReferenceTokenAddress(address: string): boolean {
  return REFERENCE_ADDRESS_SET.has(address.toLowerCase())
}

/** Patch WETH/stables (and ETH-symbol duplicates) with live prices. */
export function applyLiveReferencePrices(
  tokens: TOKENS_TYPE[],
  livePrices: Record<string, number>
): TOKENS_TYPE[] {
  const ethUsd = livePrices[WETH_ADDRESS.toLowerCase()] ?? livePrices[WETH_ADDRESS]
  if (!ethUsd || ethUsd <= 0) return tokens

  return tokens.map((t) => {
    const addr = t.token_address.toLowerCase()
    const sym = t.symbol?.toLowerCase()
    const live =
      livePrices[addr] ??
      livePrices[t.token_address] ??
      (addr === WETH_ADDRESS ? ethUsd : 0)

    if (live > 0 && isReferenceTokenAddress(addr)) {
      return { ...t, usd_price: live }
    }
    if (addr === WETH_ADDRESS || sym === 'weth' || sym === 'eth') {
      return { ...t, usd_price: ethUsd }
    }
    if (sym && ETH_PEGGED_SYMBOLS.has(sym) && t.usd_price <= 0) {
      return { ...t, usd_price: ethUsd }
    }
    return t
  })
}
