import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  buildSettlementPriceBatches,
  fetchHistoricalTokenPrices,
  mapSettlementPricesToTrades,
  type TradeWithSettlementMeta,
} from '@/app/lib/utils/historicalPrices'

const HISTORICAL_PRICE_GC_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Settlement-time USD prices for completed trades (DefiLlama @ settlement timestamp).
 * Ongoing trades are excluded — use live ETH for those.
 */
export function useSettlementPricesMap(trades: TradeWithSettlementMeta[]) {
  const batches = useMemo(
    () => buildSettlementPriceBatches(trades),
    [trades]
  )

  const queries = useQueries({
    queries: batches.map((batch) => ({
      queryKey: [
        'settlement-prices',
        batch.timestamp,
        [...batch.addresses].sort().join(','),
      ] as const,
      queryFn: () =>
        fetchHistoricalTokenPrices(batch.timestamp, batch.addresses),
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: HISTORICAL_PRICE_GC_MS,
      retry: 2,
    })),
  })

  const pricesByTradeId = useMemo(() => {
    const byTimestamp = new Map<number, Record<string, number>>()
    batches.forEach((batch, i) => {
      const data = queries[i]?.data
      if (data && Object.keys(data).length > 0) {
        byTimestamp.set(batch.timestamp, data)
      }
    })
    return mapSettlementPricesToTrades(trades, byTimestamp)
  }, [batches, queries, trades])

  const isLoading = queries.some((q) => q.isLoading)
  const isFetching = queries.some((q) => q.isFetching)

  return {
    pricesByTradeId,
    isLoading,
    isFetching,
  }
}

/** Single-trade helper — wraps the map hook. */
export function useTradeSettlementPrices(trade: TradeWithSettlementMeta) {
  const trades = useMemo(() => [trade], [trade])
  const { pricesByTradeId, isLoading, isFetching } =
    useSettlementPricesMap(trades)

  const settlementPrices = trade.id
    ? pricesByTradeId.get(trade.id)
    : undefined

  return { settlementPrices, isLoading, isFetching }
}
