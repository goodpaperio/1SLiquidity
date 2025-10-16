import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_TYPE } from './useWalletTokens'
import { useAppKitState } from '@reown/appkit/react'
import tokensListData from '../utils/tokens-list-04-09-2025.json'

// Update the CoinGeckoToken interface to better match our needs
interface CoinGeckoToken {
  id: string
  symbol: string
  name: string
  platforms?: {
    [key: string]: string
  }
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap_rank?: number
  detail_platforms?: {
    [key: string]: {
      decimal_place?: number
      contract_address: string
    }
  }
}

// Add a type for our essential tokens
interface EssentialToken {
  id: string
  symbol: string
  name: string
  platforms: {
    [key: string]: string
  }
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap_rank: number
  detail_platforms: {
    [key: string]: {
      decimal_place: number
      contract_address: string
    }
  }
}

// Types for JSON data
interface JsonTokenResult {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
  success: boolean
  failureReason: string
}

interface JsonBaseTokenData {
  baseToken: string
  totalTests: number
  successCount: number
  failureCount: number
  results: JsonTokenResult[]
}

// Mapping from chain IDs to CoinGecko platform identifiers
const CHAIN_ID_TO_PLATFORM: Record<string, string> = {
  '1': 'ethereum',
  // '42161': 'arbitrum-one',
  // '137': 'polygon-pos',
  // '56': 'binance-smart-chain',
  // Add more chains as needed
}

// Known token decimals mapping - addresses should be lowercase
const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  // Ethereum Mainnet
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // USDC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8, // WBTC
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 18, // ETH (virtual)
  '0x0000000000000000000000000000000000000000': 18, // ETH (native)
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 18, // UNI
  '0x514910771af9ca656af840dff83e8264ecf986ca': 18, // LINK
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 18, // AAVE
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 18, // BAT
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': 18, // BUSD

  // Arbitrum
  // '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 6, // USDT on Arbitrum
  // '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 6, // USDC on Arbitrum
  // '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 18, // WETH on Arbitrum
  // '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 8, // WBTC on Arbitrum
}

// Function to check if a token is an ERC20 token
const NATIVE_TOKEN_ADDRESSES = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH (virtual)
  '0x0000000000000000000000000000000000000000', // ETH (native)
]

// Improved function to check if a token is an ERC20 token on a specific platform
const isERC20Token = (
  tokenAddress: string,
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string,
  tokenSymbol?: string // Add optional tokenSymbol parameter
): boolean => {
  // No address or no platforms object means it's not a valid ERC20 token
  if (!tokenAddress || !platforms) {
    return false
  }

  // Check if the token has a valid address on the target platform
  const platformAddress = platforms[targetPlatform]
  if (!platformAddress) {
    return false
  }

  // Special handling for ETH - allow it even though it uses WETH address
  if (tokenSymbol?.toLowerCase() === 'eth') {
    return true
  }

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (tokenAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase().includes('binance'))
  ) {
    return false
  }

  // Native tokens (ETH) are not ERC20
  if (NATIVE_TOKEN_ADDRESSES.includes(platformAddress.toLowerCase())) {
    // console.log(
    //   `Token address ${platformAddress} is a native token, not an ERC20`
    // )
    return false
  }

  // Valid ERC20 tokens have a proper address format
  const isValid =
    platformAddress !== '' &&
    platformAddress !== '0x' &&
    platformAddress.startsWith('0x') &&
    platformAddress.length === 42

  if (!isValid) {
    console.log(
      `Token address ${platformAddress} is not a valid ERC20 address format`
    )
  }

  return isValid
}

// Helper function to get all unique tokens from JSON results (only successful ones)
const getAllTokensFromJson = (): {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
}[] => {
  const allTokens: {
    tokenName: string
    tokenAddress: string
    tokenDecimals: number
    tokenSymbol: string
  }[] = []
  const seenAddresses = new Set<string>()

  tokensListData.testResults.forEach((baseTokenData: JsonBaseTokenData) => {
    baseTokenData.results.forEach((token: JsonTokenResult) => {
      // Only include tokens where success is true
      if (token.success) {
        const lowerAddress = token.tokenAddress.toLowerCase()
        if (!seenAddresses.has(lowerAddress)) {
          seenAddresses.add(lowerAddress)
          allTokens.push({
            tokenName: token.tokenName,
            tokenAddress: token.tokenAddress,
            tokenDecimals: token.tokenDecimals,
            tokenSymbol: token.tokenSymbol,
          })
        }
      }
    })
  })

  return allTokens
}

// Helper function to create fallback tokens from JSON data
const createFallbackTokensFromJson = (
  jsonTokens: {
    tokenName: string
    tokenAddress: string
    tokenDecimals: number
    tokenSymbol: string
  }[],
  targetPlatform: string
): TOKENS_TYPE[] => {
  return jsonTokens.map((jsonToken) => ({
    name:
      jsonToken.tokenName.charAt(0).toUpperCase() +
      jsonToken.tokenName.slice(1),
    symbol: jsonToken.tokenSymbol,
    icon: `/tokens/${jsonToken.tokenName.toLowerCase()}.svg`,
    popular: false,
    value: 0,
    status: 'increase' as const,
    statusAmount: 0,
    token_address: jsonToken.tokenAddress,
    decimals: jsonToken.tokenDecimals,
    balance: '0',
    possible_spam: false,
    usd_price: 0,
    market_cap_rank: 999999,
    usd_value: 0,
  }))
}

// Function to get token decimals from detail_platforms object
const getTokenDecimalsForPlatform = (
  detailPlatforms:
    | { [key: string]: { decimal_place?: number; contract_address: string } }
    | undefined,
  targetPlatform: string
): number => {
  if (!detailPlatforms || !detailPlatforms[targetPlatform]) return 18 // Default to 18 if not found

  const decimalPlace = detailPlatforms[targetPlatform].decimal_place
  // console.log(
  //   `Found decimal place from API: ${decimalPlace} for platform ${targetPlatform}`
  // )
  return decimalPlace || 18
}

// Function to get token decimals based on symbol, with fallback to address
const getTokenDecimalsBySymbolOrAddress = (
  symbol: string,
  address: string
): number => {
  // First try by address (most reliable)
  const lowerCaseAddress = address.toLowerCase()
  if (KNOWN_TOKEN_DECIMALS[lowerCaseAddress]) {
    // console.log(
    //   `Found decimals by address for ${symbol}: ${KNOWN_TOKEN_DECIMALS[lowerCaseAddress]}`
    // )
    return KNOWN_TOKEN_DECIMALS[lowerCaseAddress]
  }

  // Then try by symbol (less reliable but good fallback)
  const lowerCaseSymbol = symbol.toLowerCase()

  // Common ERC20 tokens
  if (lowerCaseSymbol === 'usdt') return 6
  if (lowerCaseSymbol === 'usdc') return 6
  if (lowerCaseSymbol === 'wbtc') return 8
  if (lowerCaseSymbol === 'btc') return 8
  if (lowerCaseSymbol === 'dai') return 18
  if (lowerCaseSymbol === 'weth') return 18
  if (lowerCaseSymbol === 'eth') return 18

  // Default to 18 if not found
  return 18
}

// Function to format tokens to our app's structure
const formatCoingeckoTokens = (
  tokens: CoinGeckoToken[],
  targetPlatform: string
): TOKENS_TYPE[] => {
  return tokens
    .map((token) => {
      // Get the token address for the specific platform/chain
      let tokenAddress = getTokenAddressForPlatform(
        token.platforms,
        targetPlatform,
        token.symbol
      )

      // Skip tokens that don't have an address on the target platform
      if (!tokenAddress) {
        return null
      }

      // Skip non-ERC20 tokens using improved function
      if (
        !isERC20Token(
          tokenAddress,
          token.platforms,
          targetPlatform,
          token.symbol
        )
      ) {
        // console.log(
        //   `Skipping non-ERC20 token: ${token.symbol} (${tokenAddress}) on platform ${targetPlatform}`
        // )
        return null
      }

      // Get token decimals from detail_platforms if available
      let decimals = getTokenDecimalsForPlatform(
        token.detail_platforms,
        targetPlatform
      )

      // Apply known token decimals override - this takes precedence over API data
      const knownDecimals = getTokenDecimalsBySymbolOrAddress(
        token.symbol,
        tokenAddress
      )

      if (decimals !== knownDecimals) {
        decimals = knownDecimals
      }

      // Determine if token is popular based on market cap rank and symbol
      const isPopularToken =
        token.symbol.toLowerCase() === 'eth' ||
        token.symbol.toLowerCase() === 'weth' ||
        token.symbol.toLowerCase() === 'wbtc' ||
        token.symbol.toLowerCase() === 'usdt' ||
        token.symbol.toLowerCase() === 'usdc' ||
        token.symbol.toLowerCase() === 'dai' ||
        (token.market_cap_rank && token.market_cap_rank <= 15) // Increased priority for top 15 tokens

      // console.log('market_cap_rank ===================>', token.market_cap_rank)
      // Format the token data to match our app's token structure
      return {
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        icon: token.image || `/tokens/${token.symbol.toLowerCase()}.svg`,
        popular: isPopularToken,
        value: 0, // Default value, will be updated when wallet balance is available
        status:
          token.price_change_percentage_24h >= 0 ? 'increase' : 'decrease',
        statusAmount: Math.abs(token.price_change_percentage_24h || 0),
        token_address: tokenAddress.toLowerCase(),
        decimals: decimals,
        balance: '0',
        possible_spam: false,
        usd_price: token.current_price || 0,
        market_cap_rank: token.market_cap_rank || 999999, // Add market cap rank for sorting
      }
    })
    .filter(Boolean) as TOKENS_TYPE[] // Filter out null values
}

// Helper function to check if a token has an address on a specific platform
const tokenHasAddressOnPlatform = (
  token: CoinGeckoToken,
  platform: string
): boolean => {
  return !!(token.platforms && token.platforms[platform])
}

// Update the configuration for token fetching
const TOKEN_CONFIG = {
  TOKENS_PER_PAGE: 250, // Maximum allowed by CoinGecko API
  MARKET_DATA_CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  PLATFORM_LIST_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  INITIAL_RETRY_DELAY: 2000, // 2 seconds initial delay between retries
  MAX_RETRY_DELAY: 32000, // Maximum delay of 32 seconds
  MAX_RETRIES: 3,
  MAX_PAGES: 4, // Maximum number of pages to fetch
}

// Interface for platform list response
interface PlatformListToken {
  id: string
  symbol: string
  name: string
  platforms: {
    [key: string]: string
  }
}

// Function to fetch and filter platform tokens
const fetchPlatformTokens = async (
  targetPlatform: string
): Promise<{ id: string; address: string }[]> => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch platform list: ${response.status}`)
    }

    const tokens: PlatformListToken[] = await response.json()
    console.log(`Fetched ${tokens.length} total tokens from /coins/list`)

    // Filter tokens that exist on the target platform and have valid addresses
    const filteredTokens = tokens
      .filter((token) => {
        // Check if token has the target platform
        if (!token.platforms || !token.platforms[targetPlatform]) {
          return false
        }

        const platformAddress = token.platforms[targetPlatform].toLowerCase()

        // Validate the address
        const isValidAddress =
          platformAddress &&
          platformAddress.startsWith('0x') &&
          platformAddress.length === 42 &&
          !NATIVE_TOKEN_ADDRESSES.includes(platformAddress) &&
          platformAddress !== '0x' &&
          // Special handling for BNB which is not an ERC20 token on Ethereum
          !(
            targetPlatform === 'ethereum' &&
            (platformAddress === 'bnb' || platformAddress.includes('binance'))
          )

        return isValidAddress
      })
      .map((token) => ({
        id: token.id,
        address: token.platforms[targetPlatform].toLowerCase(),
      }))

    console.log(
      `Found ${filteredTokens.length} tokens for platform ${targetPlatform}`
    )
    return filteredTokens
  } catch (error) {
    console.error('Error fetching platform tokens:', error)
    throw error
  }
}

// Function to fetch market data with pagination and exponential backoff
const fetchMarketData = async (
  platformTokens: { id: string; address: string }[],
  targetPlatform: string,
  currency = 'usd'
): Promise<CoinGeckoToken[]> => {
  const results: CoinGeckoToken[] = []
  let delay = TOKEN_CONFIG.INITIAL_RETRY_DELAY

  // Get just the IDs for the API request
  const tokenIds = platformTokens.map((t) => t.id)

  for (let page = 1; page <= TOKEN_CONFIG.MAX_PAGES; page++) {
    let retryCount = 0

    while (retryCount <= TOKEN_CONFIG.MAX_RETRIES) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${TOKEN_CONFIG.TOKENS_PER_PAGE}&page=${page}&sparkline=false&locale=en&precision=full`
        )

        if (response.status === 429) {
          retryCount++

          if (retryCount > TOKEN_CONFIG.MAX_RETRIES) {
            break
          }

          await new Promise((resolve) => setTimeout(resolve, delay))
          delay = Math.min(delay * 2, TOKEN_CONFIG.MAX_RETRY_DELAY)
          continue
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch market data: ${response.status}`)
        }

        const data = await response.json()

        // Filter the response to only include our platform tokens
        const filteredData = data
          .filter((token: CoinGeckoToken) => tokenIds.includes(token.id))
          .map((token: CoinGeckoToken) => {
            // Find the matching platform token to get the correct address
            const platformToken = platformTokens.find((t) => t.id === token.id)
            return {
              ...token,
              platforms: {
                [targetPlatform]: platformToken?.address || '',
              },
            }
          })

        results.push(...filteredData)

        // If we got less than TOKENS_PER_PAGE tokens, we've reached the end
        if (data.length < TOKEN_CONFIG.TOKENS_PER_PAGE) {
          return results
        }

        // Add delay between pages to avoid rate limits
        if (page < TOKEN_CONFIG.MAX_PAGES) {
          await new Promise((resolve) =>
            setTimeout(resolve, TOKEN_CONFIG.INITIAL_RETRY_DELAY)
          )
        }

        break // Success, exit retry loop
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error)
        retryCount++

        if (retryCount > TOKEN_CONFIG.MAX_RETRIES) {
          break
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 2, TOKEN_CONFIG.MAX_RETRY_DELAY)
      }
    }
  }

  return results
}

// Function to safely get a token address from platforms object
const getTokenAddressForPlatform = (
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string,
  tokenSymbol?: string // Add optional tokenSymbol parameter
): string => {
  if (!platforms || !platforms[targetPlatform]) return ''

  const address = platforms[targetPlatform].toLowerCase()

  // Special handling for ETH - allow it to use WETH address
  if (tokenSymbol?.toLowerCase() === 'eth') {
    return address
  }

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (address === 'bnb' || address.includes('binance'))
  ) {
    return ''
  }

  // Exclude native tokens and special cases
  if (
    NATIVE_TOKEN_ADDRESSES.includes(address) ||
    address === 'bnb' || // sometimes BNB is listed like this
    address === '0x0000000000000000000000000000000000000000' ||
    address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
    !address.startsWith('0x') ||
    address === '0x' ||
    address.length !== 42
  ) {
    return ''
  }

  return address
}

// Add more essential tokens to our default list
const topTokens: EssentialToken[] = [
  // ETH first, then WETH - this order matters for find() operations
  {
    id: 'eth',
    symbol: 'eth',
    name: 'Ethereum',
    platforms: {
      ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
    image: '/tokens/eth-blue.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 1,
    detail_platforms: {
      ethereum: {
        decimal_place: 18,
        contract_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      },
    },
  },
  {
    id: 'weth',
    symbol: 'weth',
    name: 'Wrapped Ethereum',
    platforms: {
      ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      'arbitrum-one': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
    image: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 1,
    detail_platforms: {
      ethereum: {
        decimal_place: 18,
        contract_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      },
      'arbitrum-one': {
        decimal_place: 18,
        contract_address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      },
    },
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    platforms: {
      ethereum: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      'arbitrum-one': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    },
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 2,
    detail_platforms: {
      ethereum: {
        decimal_place: 6,
        contract_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
      'arbitrum-one': {
        decimal_place: 6,
        contract_address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      },
    },
  },
  {
    id: 'usd-coin',
    symbol: 'usdc',
    name: 'USD Coin',
    platforms: {
      ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'arbitrum-one': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    image:
      'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 3,
    detail_platforms: {
      ethereum: {
        decimal_place: 6,
        contract_address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      },
      'arbitrum-one': {
        decimal_place: 6,
        contract_address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      },
    },
  },
  {
    id: 'wrapped-bitcoin',
    symbol: 'wbtc',
    name: 'Wrapped Bitcoin',
    platforms: {
      ethereum: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      'arbitrum-one': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    },
    image:
      'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 4,
    detail_platforms: {
      ethereum: {
        decimal_place: 8,
        contract_address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      },
      'arbitrum-one': {
        decimal_place: 8,
        contract_address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
      },
    },
  },
  // {
  //   id: 'dai',
  //   symbol: 'dai',
  //   name: 'Dai',
  //   platforms: {
  //     ethereum: '0x6b175474e89094c44da98b954eedeac495271d0f',
  //     'arbitrum-one': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  //   },
  //   image: 'https://assets.coingecko.com/coins/images/9956/large/4943.png',
  //   current_price: 1,
  //   price_change_percentage_24h: 0,
  //   market_cap_rank: 5,
  //   detail_platforms: {
  //     ethereum: {
  //       decimal_place: 18,
  //       contract_address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  //     },
  //     'arbitrum-one': {
  //       decimal_place: 18,
  //       contract_address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  //     },
  //   },
  // },
]

export const useTokenList = () => {
  const stateData = useAppKitState()
  const chainId = stateData?.selectedNetworkId?.split(':')[1] || '1'
  const targetPlatform = CHAIN_ID_TO_PLATFORM[chainId] || 'ethereum'

  // Cache keys for both platform list and market data
  const platformListCacheKey = `tokenPlatformList_${chainId}`
  const platformListTimestampKey = `tokenPlatformListTimestamp_${chainId}`
  const marketDataCacheKey = `tokenMarketData_${chainId}`
  const marketDataTimestampKey = `tokenMarketDataTimestamp_${chainId}`

  // Function to get cached data with TTL check
  const getCachedData = (
    cacheKey: string,
    timestampKey: string,
    duration: number
  ) => {
    const cachedData = localStorage.getItem(cacheKey)
    const cachedTimestamp = localStorage.getItem(timestampKey)

    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp)
      if (cacheAge < duration) {
        return JSON.parse(cachedData)
      }
    }
    return null
  }

  // Modify the queryFn to use our new approach
  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['token-list', chainId, 'erc20'],
    queryFn: async () => {
      try {
        // Start with essential tokens that match the current chain
        let essentialTokens = topTokens.filter((t) => {
          const tokenAddress = getTokenAddressForPlatform(
            t.platforms,
            targetPlatform,
            t.symbol
          )
          return (
            tokenAddress &&
            isERC20Token(tokenAddress, t.platforms, targetPlatform, t.symbol)
          )
        })

        // Check platform list cache
        let platformTokens = getCachedData(
          platformListCacheKey,
          platformListTimestampKey,
          TOKEN_CONFIG.PLATFORM_LIST_CACHE_DURATION
        )

        // Fetch platform list if not cached
        if (!platformTokens) {
          try {
            platformTokens = await fetchPlatformTokens(targetPlatform)
            localStorage.setItem(
              platformListCacheKey,
              JSON.stringify(platformTokens)
            )
            localStorage.setItem(
              platformListTimestampKey,
              Date.now().toString()
            )
          } catch (error) {
            console.error('Error fetching platform tokens:', error)
            // If platform list fetch fails, fall back to essential tokens + JSON fallbacks
            const essentialTokensFormatted = formatCoingeckoTokens(
              essentialTokens,
              targetPlatform
            )

            // Add JSON tokens as fallbacks
            const jsonTokens = getAllTokensFromJson()
            const fallbackTokens = createFallbackTokensFromJson(
              jsonTokens,
              targetPlatform
            )

            const mergedTokens = [...essentialTokensFormatted]
            const essentialAddresses = new Set(
              essentialTokensFormatted.map((t) => t.token_address.toLowerCase())
            )

            fallbackTokens.forEach((fallbackToken) => {
              if (
                !essentialAddresses.has(
                  fallbackToken.token_address.toLowerCase()
                )
              ) {
                mergedTokens.push(fallbackToken)
              }
            })

            return mergedTokens
          }
        }

        // Check market data cache
        let marketData = getCachedData(
          marketDataCacheKey,
          marketDataTimestampKey,
          TOKEN_CONFIG.MARKET_DATA_CACHE_DURATION
        )

        // Fetch market data if not cached
        if (!marketData) {
          try {
            // Add essential token IDs to the platform tokens
            const essentialPlatformTokens = essentialTokens.map((t) => ({
              id: t.id,
              address: t.platforms[targetPlatform].toLowerCase(),
            }))

            // Combine and deduplicate tokens by ID
            const allPlatformTokens = [
              ...essentialPlatformTokens,
              ...platformTokens.filter(
                (pt: { id: string; address: string }) =>
                  !essentialPlatformTokens.some((et) => et.id === pt.id)
              ),
            ]

            marketData = await fetchMarketData(
              allPlatformTokens,
              targetPlatform
            )
            localStorage.setItem(marketDataCacheKey, JSON.stringify(marketData))
            localStorage.setItem(marketDataTimestampKey, Date.now().toString())
          } catch (error) {
            console.error('Error fetching market data:', error)
            // If market data fetch fails, fall back to essential tokens + JSON fallbacks
            const essentialTokensFormatted = formatCoingeckoTokens(
              essentialTokens,
              targetPlatform
            )

            // Add JSON tokens as fallbacks
            const jsonTokens = getAllTokensFromJson()
            const fallbackTokens = createFallbackTokensFromJson(
              jsonTokens,
              targetPlatform
            )

            const mergedTokens = [...essentialTokensFormatted]
            const essentialAddresses = new Set(
              essentialTokensFormatted.map((t) => t.token_address.toLowerCase())
            )

            fallbackTokens.forEach((fallbackToken) => {
              if (
                !essentialAddresses.has(
                  fallbackToken.token_address.toLowerCase()
                )
              ) {
                mergedTokens.push(fallbackToken)
              }
            })

            return mergedTokens
          }
        }

        // Combine essential tokens with market data
        const combinedTokens = [...essentialTokens].map((essentialToken) => {
          // Find matching market data for essential token
          const marketToken = marketData.find(
            (t: CoinGeckoToken) => t.id === essentialToken.id
          )
          if (marketToken) {
            // Update essential token with real market data
            return {
              ...essentialToken,
              current_price:
                marketToken.current_price || essentialToken.current_price,
              price_change_percentage_24h:
                marketToken.price_change_percentage_24h ||
                essentialToken.price_change_percentage_24h,
            }
          }
          return essentialToken
        })

        // Add market data tokens that aren't in essential tokens
        const essentialTokenIds = new Set(essentialTokens.map((t) => t.id))
        const additionalTokens = marketData
          .filter((t: CoinGeckoToken) => !essentialTokenIds.has(t.id))
          .map((token: CoinGeckoToken) => ({
            ...token,
            platforms: token.platforms || {},
            market_cap_rank: token.market_cap_rank || 999999,
            detail_platforms: {
              [targetPlatform]: {
                decimal_place:
                  token.detail_platforms?.[targetPlatform]?.decimal_place || 18,
                contract_address: token.platforms?.[targetPlatform] || '',
              },
            },
          })) as EssentialToken[]

        combinedTokens.push(...additionalTokens)

        // Format and return the final token list
        const coingeckoTokens = formatCoingeckoTokens(
          combinedTokens,
          targetPlatform
        )

        // Get JSON tokens and merge with CoinGecko tokens
        const jsonTokens = getAllTokensFromJson()
        const fallbackTokens = createFallbackTokensFromJson(
          jsonTokens,
          targetPlatform
        )

        // Merge tokens: use CoinGecko data if available, otherwise use JSON fallback
        const mergedTokens = [...coingeckoTokens]
        const coingeckoAddresses = new Set(
          coingeckoTokens.map((t) => t.token_address.toLowerCase())
        )

        fallbackTokens.forEach((fallbackToken) => {
          if (
            !coingeckoAddresses.has(fallbackToken.token_address.toLowerCase())
          ) {
            mergedTokens.push(fallbackToken)
          }
        })

        return mergedTokens
      } catch (error) {
        console.error('Error in token list fetch:', error)
        // If everything fails, return essential tokens + JSON fallbacks
        const essentialTokens = formatCoingeckoTokens(
          topTokens.filter((t: EssentialToken) => {
            const tokenAddress = getTokenAddressForPlatform(
              t.platforms,
              targetPlatform,
              t.symbol
            )
            return (
              tokenAddress &&
              isERC20Token(tokenAddress, t.platforms, targetPlatform, t.symbol)
            )
          }),
          targetPlatform
        )

        // Add JSON tokens as fallbacks
        const jsonTokens = getAllTokensFromJson()
        const fallbackTokens = createFallbackTokensFromJson(
          jsonTokens,
          targetPlatform
        )

        const mergedTokens = [...essentialTokens]
        const essentialAddresses = new Set(
          essentialTokens.map((t) => t.token_address.toLowerCase())
        )

        fallbackTokens.forEach((fallbackToken) => {
          if (
            !essentialAddresses.has(fallbackToken.token_address.toLowerCase())
          ) {
            mergedTokens.push(fallbackToken)
          }
        })

        return mergedTokens
      }
    },
    staleTime: TOKEN_CONFIG.MARKET_DATA_CACHE_DURATION / 2,
    gcTime: TOKEN_CONFIG.MARKET_DATA_CACHE_DURATION,
    refetchOnWindowFocus: false,
    retry: false,
  })

  return {
    tokens,
    isLoading,
    error,
    refetch,
    chainId,
    platform: targetPlatform,
  }
}
