'use client'

import { useQuery } from '@apollo/client'
import { GET_TRADE_BY_ID } from '../graphql/queries/trades'
import { Trade, TradesResponse } from '../graphql/types/trade'

interface UseTradeOptions {
  tradeId: string
  skip?: boolean
}

export function useTrade(options: UseTradeOptions) {
  const { tradeId, skip = false } = options

  const { data, loading, error, refetch } = useQuery<TradesResponse>(
    GET_TRADE_BY_ID,
    {
      variables: {
        tradeId,
      },
      skip: skip || !tradeId,
      pollInterval: 30000, // Refetch every 30 seconds
    }
  )

  const trade: Trade | null = data?.trades?.[0] || null

  return {
    trade,
    isLoading: loading,
    error,
    refetch,
  }
}
