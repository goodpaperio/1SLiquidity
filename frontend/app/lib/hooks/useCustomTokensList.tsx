import { useMemo } from 'react'
import { useTokenList } from './useTokenList'
import { TOKENS_TYPE } from './useWalletTokens'
import tokensListData from '@/app/lib/utils/tokens-list-04-09-2025.json'
import { REFERENCE_TOKEN_ADDRESSES } from '@/app/lib/utils/tradeDisplay'

// Interface for test result token
interface TestResultToken {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
  success: boolean
  failureReason: string
}

// Extract and deduplicate successful tokens from test results
const extractSuccessfulTokens = (): TestResultToken[] => {
  const allTokens: TestResultToken[] = []
  const seenAddresses = new Set<string>()

  // Loop through all test result objects
  tokensListData.testResults.forEach((testResult) => {
    testResult.results.forEach((token) => {
      // Only include tokens where success is true
      if (token.success) {
        const normalizedAddress = token.tokenAddress.toLowerCase()

        // Avoid duplicates based on token address
        if (!seenAddresses.has(normalizedAddress)) {
          seenAddresses.add(normalizedAddress)
          allTokens.push(token)
        }
      }
    })
  })

  return allTokens
}

// Check if a token should be marked as popular
const isPopularToken = (symbol: string): boolean => {
  const popularTokens = ['ETH', 'WETH', 'WBTC', 'USDT', 'USDC']
  return popularTokens.includes(symbol.toUpperCase())
}

export const useCustomTokenList = () => {
  const {
    tokens: coingeckoTokens,
    ethUsd,
    livePrices,
    isLoading,
    error,
    refetch,
    chainId,
    platform,
  } = useTokenList()

  const customTokens = useMemo(() => {
    const testTokens = extractSuccessfulTokens()
    const customTokenList: TOKENS_TYPE[] = []

    testTokens.forEach((testToken) => {
      const matchingCoinGeckoToken = coingeckoTokens.find(
        (cgToken) =>
          cgToken.token_address.toLowerCase() ===
          testToken.tokenAddress.toLowerCase()
      )

      const customToken: TOKENS_TYPE = {
        name: matchingCoinGeckoToken?.name || testToken.tokenName.toUpperCase(),
        symbol: testToken.tokenSymbol,
        icon: matchingCoinGeckoToken?.icon || '/icons/default-token.svg',
        popular:
          matchingCoinGeckoToken?.popular ||
          isPopularToken(testToken.tokenSymbol),
        value: matchingCoinGeckoToken?.value || 0,
        status: matchingCoinGeckoToken?.status || 'increase',
        statusAmount: matchingCoinGeckoToken?.statusAmount || 0,
        token_address: testToken.tokenAddress.toLowerCase(),
        decimals: testToken.tokenDecimals,
        balance: matchingCoinGeckoToken?.balance || '0',
        possible_spam: matchingCoinGeckoToken?.possible_spam || false,
        usd_price: matchingCoinGeckoToken?.usd_price || 0,
        market_cap_rank: matchingCoinGeckoToken?.market_cap_rank || 999999,
      }

      customTokenList.push(customToken)
    })

    const customAddresses = new Set(
      customTokenList.map((t) => t.token_address.toLowerCase())
    )
    const referenceTokens = REFERENCE_TOKEN_ADDRESSES.map((addr) => {
      const lower = addr.toLowerCase()
      if (customAddresses.has(lower)) return null
      return coingeckoTokens.find(
        (t) => t.token_address.toLowerCase() === lower && t.usd_price > 0
      )
    }).filter(Boolean) as TOKENS_TYPE[]

    return [...referenceTokens, ...customTokenList].sort((a, b) => {
      if (a.popular && !b.popular) return -1
      if (!a.popular && b.popular) return 1
      return (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999)
    })
  }, [coingeckoTokens])

  return {
    tokens: customTokens,
    /** Full CoinGecko list — pass to trade USD helpers for WETH/stable pricing. */
    priceFeed: coingeckoTokens,
    ethUsd,
    livePrices,
    isLoading,
    error,
    refetch,
    chainId,
    platform,
  }
}
