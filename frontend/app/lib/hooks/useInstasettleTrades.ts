'use client'

import { useQuery } from '@apollo/client'
import { GET_INSTASETTLE_TRADES } from '../graphql/queries/trades'

interface InstasettleTrade {
  id: string
  isInstasettlable: boolean
  tokenIn: string
  tokenOut: string
  settlements: { id: string }[]
  cancellations: { id: string }[]
}

interface InstasettleTradesResponse {
  trades: InstasettleTrade[]
}

export function useInstasettleTrades() {
  const { data, loading, error, refetch } = useQuery<InstasettleTradesResponse>(
    GET_INSTASETTLE_TRADES,
    {
      variables: {
        first: 200,
        skip: 0,
      },
      // Refetch every 2 minutes to keep data fresh
      pollInterval: 120000,
      notifyOnNetworkStatusChange: true,
    }
  )

  // Filter trades to get only those that are instasettlable and not settled/cancelled
  const getAvailableTrades = () => {
    if (!data?.trades) return []

    return data.trades.filter(
      (trade) =>
        trade.isInstasettlable &&
        trade.settlements.length === 0 &&
        trade.cancellations.length === 0
    )
  }

  // Get unique token addresses from available trades
  const getAvailableTokenAddresses = () => {
    const availableTrades = getAvailableTrades()
    const tokenAddresses = new Set<string>()

    availableTrades.forEach((trade) => {
      tokenAddresses.add(trade.tokenIn.toLowerCase())
      tokenAddresses.add(trade.tokenOut.toLowerCase())
    })

    return Array.from(tokenAddresses)
  }

  // Get first trade for auto-selection
  const getFirstTrade = () => {
    const availableTrades = getAvailableTrades()
    return availableTrades.length > 0 ? availableTrades[0] : null
  }

  return {
    trades: data?.trades || [],
    availableTrades: getAvailableTrades(),
    availableTokenAddresses: getAvailableTokenAddresses(),
    firstTrade: getFirstTrade(),
    isLoading: loading,
    error,
    refetch,
  }
}
