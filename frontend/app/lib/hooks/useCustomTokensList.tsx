import { useMemo } from 'react'
import { useTokenList } from './useTokenList'
import { TOKENS_TYPE } from './useWalletTokens'
import tokensListData from '@/app/lib/utils/tokens-list-04-09-2025.json'

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
      // Only include successful tokens
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

// Get default token icon based on symbol
const getDefaultTokenIcon = (symbol: string): string => {
  return `/tokens/${symbol.toLowerCase()}.svg`
}

// Check if a token should be marked as popular
const isPopularToken = (symbol: string): boolean => {
  const popularTokens = ['ETH', 'WETH', 'WBTC', 'USDT', 'USDC']
  return popularTokens.includes(symbol.toUpperCase())
}

export const useCustomTokenList = () => {
  // Get tokens from CoinGecko via useTokenList
  const {
    tokens: coingeckoTokens,
    isLoading,
    error,
    refetch,
    chainId,
    platform,
  } = useTokenList()

  // Extract successful tokens from test results
  const customTokens = useMemo(() => {
    const testTokens = extractSuccessfulTokens()
    const customTokenList: TOKENS_TYPE[] = []

    testTokens.forEach((testToken) => {
      // Try to find matching token in CoinGecko data
      const matchingCoinGeckoToken = coingeckoTokens.find(
        (cgToken) =>
          cgToken.token_address.toLowerCase() ===
            testToken.tokenAddress.toLowerCase() ||
          cgToken.symbol.toLowerCase() === testToken.tokenSymbol.toLowerCase()
      )

      // Create the token object with CoinGecko data if available, otherwise use defaults
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

    // Sort by market cap rank (popular tokens first)
    return customTokenList.sort((a, b) => {
      if (a.popular && !b.popular) return -1
      if (!a.popular && b.popular) return 1
      return (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999)
    })
  }, [coingeckoTokens])

  return {
    tokens: customTokens,
    isLoading,
    error,
    refetch,
    chainId,
    platform,
  }
}
