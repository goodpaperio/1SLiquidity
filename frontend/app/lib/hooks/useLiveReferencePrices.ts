import { useQuery } from '@tanstack/react-query'
import { WETH_ADDRESS } from '@/app/lib/utils/knownTradeTokens'
import {
  fetchLiveReferencePrices,
  resolveLiveBtcUsd,
  resolveLiveEthUsd,
  WBTC_ADDRESS,
} from '@/app/lib/utils/referencePrices'

export const LIVE_REFERENCE_PRICES_QUERY_KEY = [
  'live-reference-prices',
] as const

/** Re-fetch live ETH/BTC/stables every 5 minutes (never uses localStorage). */
const LIVE_PRICE_STALE_MS = 5 * 60 * 1000

/**
 * Dedicated live price feed for WETH / WBTC / stables.
 * Always calls CoinGecko — independent of the token-list cache.
 */
export function useLiveReferencePrices() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: LIVE_REFERENCE_PRICES_QUERY_KEY,
    queryFn: fetchLiveReferencePrices,
    staleTime: LIVE_PRICE_STALE_MS,
    gcTime: LIVE_PRICE_STALE_MS * 2,
    refetchOnWindowFocus: true,
    refetchInterval: LIVE_PRICE_STALE_MS,
    retry: 2,
  })

  const prices = data ?? {}
  const fetchedEth = prices[WETH_ADDRESS] ?? 0
  const fetchedBtc = prices[WBTC_ADDRESS] ?? 0
  const ethUsd = resolveLiveEthUsd(fetchedEth)
  const btcUsd = resolveLiveBtcUsd(fetchedBtc)

  return {
    prices: {
      ...prices,
      [WETH_ADDRESS]: ethUsd,
      [WBTC_ADDRESS]: btcUsd,
    },
    ethUsd,
    btcUsd,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}
