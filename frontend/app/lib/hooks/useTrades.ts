'use client'

import { useQuery } from '@apollo/client'
import { GET_TRADES } from '../graphql/queries/trades'
import { TradesResponse } from '../graphql/types/trade'
import { useEffect } from 'react'

interface UseTradesOptions {
  first?: number
  skip?: number
}

export function useTrades(options: UseTradesOptions = {}) {
  const { first = 10, skip = 0 } = options

  const { data, loading, error, refetch, fetchMore, networkStatus } =
    useQuery<TradesResponse>(GET_TRADES, {
      variables: {
        first,
        skip,
      },
      // Refetch every 60 seconds to keep data fresh
      pollInterval: 120000,
      notifyOnNetworkStatusChange: true, // This will help us track when polling happens
    })

  const loadMore = () => {
    if (!data?.trades?.length) return

    return fetchMore({
      variables: {
        first,
        skip: data.trades.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          trades: [...prev.trades, ...fetchMoreResult.trades],
        }
      },
    })
  }

  return {
    trades: data?.trades || [],
    isLoading: loading,
    error,
    refetch,
    loadMore,
    isRefetching: loading && data?.trades && data.trades.length > 0, // True when polling/refetching with existing data
  }
}
