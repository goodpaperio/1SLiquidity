// hooks/useWalletTokens.ts (Enhanced version)
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  formatTokensData,
  getWalletTokens,
  TokenData,
  calculateWalletBalance,
} from '../wallet-details/moralis'
import { useQuery } from '@tanstack/react-query'
import { useTransactionListener } from './useTransactionListener'

export interface TOKENS_TYPE {
  name: string
  symbol: string
  icon: string
  popular: boolean
  value?: number
  status: 'increase' | 'decrease'
  statusAmount: number
  token_address: string
  decimals: number
  balance: string
  possible_spam: boolean
  usd_price: number
  usd_value?: number
  market_cap_rank?: number
}

interface UseWalletTokensResult {
  tokens: TOKENS_TYPE[]
  rawTokens: TokenData[]
  totalBalance: number
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isFetching: boolean
  isConnected: boolean
  lastUpdated: Date | null
}

// Cache configuration
const CACHE_TIME = 5 * 60 * 1000 // 5 minutes
const STALE_TIME = 1 * 60 * 1000 // 1 minute

/**
 * Enhanced hook that combines your existing useWalletTokens with real-time transaction listening
 */
export const useWalletTokens = (
  address?: string,
  chain: string = 'eth',
  enableAutoRefresh: boolean = true
): UseWalletTokensResult => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const isRefreshingRef = useRef(false)

  // Your existing React Query setup
  const queryKey = ['wallet-tokens', address, chain]

  const {
    data: rawTokens = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!address) return []

      // Clear the last check timestamp to force fresh data on manual refetch
      const lastCheckKey = `wallet_tokens_lastcheck_${address.toLowerCase()}_${chain.toLowerCase()}`
      if (typeof window !== 'undefined') {
        localStorage.removeItem(lastCheckKey)
      }

      const tokens = await getWalletTokens(address, chain)
      setLastUpdated(new Date())
      return tokens
    },
    enabled: !!address,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
  })

  // Debounced refresh function with transaction details
  const debouncedRefresh = useCallback(
    (transactionDetails?: any) => {
      if (isRefreshingRef.current) return

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Determine delay based on transaction type
      let delay = 2000 // Default 2 seconds
      if (transactionDetails) {
        // Shorter delay for incoming transactions or token transfers
        if (
          transactionDetails.type === 'incoming' ||
          transactionDetails.isTokenTransfer
        ) {
          delay = 1000 // 1 second for important transactions
        } else {
          delay = 3000 // 3 seconds for outgoing ETH transactions
        }
      }

      // Set a delay to batch multiple transaction events
      refreshTimeoutRef.current = setTimeout(async () => {
        if (!address || isRefreshingRef.current) return

        try {
          isRefreshingRef.current = true
          console.log(
            '🔄 Auto-refreshing tokens due to transaction:',
            transactionDetails?.hash || 'unknown'
          )
          await refetch()
        } catch (error) {
          console.error('❌ Auto-refresh failed:', error)
        } finally {
          isRefreshingRef.current = false
        }
      }, delay)
    },
    [address, refetch]
  )

  // Transaction listener
  const { isConnected } = useTransactionListener({
    walletAddress: address || '',
    chain,
    onTransaction: debouncedRefresh,
    enabled: enableAutoRefresh && !!address,
  })

  // Calculate total balance
  const totalBalance =
    rawTokens.length > 0 ? calculateWalletBalance(rawTokens) : 0

  // Format tokens (your existing logic)
  const tokens =
    rawTokens.length > 0 ? (formatTokensData(rawTokens) as TOKENS_TYPE[]) : []

  // Manual refetch function that forces fresh data
  const manualRefetch = useCallback(async () => {
    if (!address) return

    console.log('🔄 Manual refresh triggered')
    // Clear cache to force fresh fetch
    const lastCheckKey = `wallet_tokens_lastcheck_${address.toLowerCase()}_${chain.toLowerCase()}`
    if (typeof window !== 'undefined') {
      localStorage.removeItem(lastCheckKey)
    }

    await refetch()
  }, [address, chain, refetch])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return {
    tokens,
    rawTokens,
    totalBalance,
    isLoading,
    error: isError ? (error as Error) : null,
    refetch: manualRefetch,
    isFetching,
    isConnected,
    lastUpdated,
  }
}

// import { useState, useEffect } from 'react'
// import {
//   formatTokensData,
//   getWalletTokens,
//   TokenData,
// } from '../wallet-details/moralis'
// // import {
// //   formatTokensData,
// //   getWalletTokens,
// //   TokenData,
// // } from '../wallet-details/infura'
// import { useQuery } from '@tanstack/react-query'

// // Define the TOKENS_TYPE interface here since we can't import it from constant-types.tsx
// export interface TOKENS_TYPE {
//   name: string
//   symbol: string
//   icon: string
//   popular: boolean
//   value?: number
//   status: 'increase' | 'decrease'
//   statusAmount: number
//   // Additional properties from TokenData
//   token_address: string
//   decimals: number
//   balance: string
//   possible_spam: boolean
//   usd_price: number
//   usd_value?: number
//   market_cap_rank?: number // Added market cap rank for better sorting
// }

// interface UseWalletTokensResult {
//   tokens: TOKENS_TYPE[]
//   rawTokens: TokenData[]
//   isLoading: boolean
//   error: Error | null
//   refetch: () => Promise<void>
//   isFetching: boolean
// }

// // Cache time in milliseconds (5 minutes)
// const CACHE_TIME = 5 * 60 * 1000

// // Stale time in milliseconds (1 minute)
// const STALE_TIME = 1 * 60 * 1000

// /**
//  * Hook to fetch wallet tokens using Blockchain API with React Query for caching
//  * @param address Wallet address
//  * @param chain Chain to fetch tokens from (e.g., 'eth', 'bsc', 'polygon')
//  * @returns Object containing tokens, loading state, error, and refetch function
//  */
// export const useWalletTokens = (
//   address?: string,
//   chain: string = 'eth'
// ): UseWalletTokensResult => {
//   // Use React Query to fetch and cache token data
//   const queryKey = ['wallet-tokens', address, chain]

//   const {
//     data: rawTokens = [],
//     isLoading,
//     isError,
//     error,
//     refetch,
//     isFetching,
//   } = useQuery({
//     queryKey,
//     queryFn: async () => {
//       if (!address) return []
//       return await getWalletTokens(address, chain)
//     },
//     enabled: !!address, // Only fetch if address is provided
//     staleTime: STALE_TIME, // Consider data stale after 1 minute
//     gcTime: CACHE_TIME, // Keep cache for 5 minutes
//     retry: 2, // Retry failed requests twice
//     refetchOnWindowFocus: false, // Don't refetch when window regains focus
//   })

//   // Format tokens data and filter out tokens with insufficient liquidity
//   // except for native tokens (token_address = 0x0...)
//   const tokens =
//     rawTokens.length > 0 ? (formatTokensData(rawTokens) as TOKENS_TYPE[]) : []

//   return {
//     tokens,
//     rawTokens,
//     isLoading,
//     error: isError ? (error as Error) : null,
//     refetch: async () => {
//       await refetch()
//     },
//     isFetching,
//   }
// }
