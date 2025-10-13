'use client'

import Moralis from 'moralis'
import { EvmChain } from 'moralis/common-evm-utils'
import tokensListData from '@/app/lib/utils/tokens-list-04-09-2025.json'

// Types for the JSON structure
interface TokenResult {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
  success: boolean
  failureReason: string
}

interface TestResult {
  baseToken: string
  totalTests: number
  successCount: number
  failureCount: number
  results: TokenResult[]
}

interface TokensListData {
  timestamp: string
  testResults: TestResult[]
}

// Initialize Moralis
export const initMoralis = async () => {
  if (!Moralis.Core.isStarted) {
    await Moralis.start({
      apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
    })
  }
}

/**
 * Load whitelisted token addresses from the JSON file
 * @returns Array of lowercase token addresses that have success: true
 */
const getWhitelistedTokens = (): string[] => {
  try {
    // Dynamically require the JSON file
    // const tokensListData: TokensListData = require('./utils/tokens-list-04-09-2025.json')
    const whitelistedTokens: string[] = []

    // Iterate through all test results
    tokensListData.testResults.forEach((testResult: TestResult) => {
      testResult.results.forEach((token: TokenResult) => {
        // Only include tokens that have success: true
        if (token.success === true && token.tokenAddress) {
          // Convert to lowercase for consistent comparison
          const address = token.tokenAddress.toLowerCase()
          // Avoid duplicates
          if (!whitelistedTokens.includes(address)) {
            whitelistedTokens.push(address)
          }
        }
      })
    })

    return whitelistedTokens
  } catch (error) {
    console.error('💥 Error loading whitelisted tokens from JSON:', error)
    // Fallback to basic tokens if JSON loading fails
    return [
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Ethereum mainnet
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum mainnet
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    ]
  }
}

// Chain mapping to convert string identifiers to EvmChain objects
export const CHAIN_MAPPING: { [key: string]: typeof EvmChain.ETHEREUM } = {
  eth: EvmChain.ETHEREUM,
  ethereum: EvmChain.ETHEREUM,
  bsc: EvmChain.BSC,
  polygon: EvmChain.POLYGON,
  avalanche: EvmChain.AVALANCHE,
  fantom: EvmChain.FANTOM,
  cronos: EvmChain.CRONOS,
  arbitrum: EvmChain.ARBITRUM,
}

export interface TokenData {
  token_address: string
  name: string
  symbol: string
  logo?: string
  thumbnail?: string
  decimals: number
  balance: string
  possible_spam: boolean
  verified_collection?: boolean
  value?: number
  status: 'increase' | 'decrease'
  statusAmount: number
  usd_price: number
  usdPrice24hrPercentChange?: number
}

interface TokenPriceData {
  usd_price: number
  percent_change_24h: number
}

interface TokenPrices {
  [key: string]: TokenPriceData
}

/**
 * Cache configuration for Moralis API calls
 */
const MORALIS_CACHE_CONFIG = {
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  TOKEN_BALANCE_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes - check for new tokens more frequently
}

/**
 * Get cached data with TTL check
 * @param cacheKey - The key to store/retrieve cached data
 * @param timestampKey - The key to store/retrieve cache timestamp
 * @param duration - Cache duration in milliseconds
 * @returns Cached data if valid, null otherwise
 */
const getCachedWalletData = (
  cacheKey: string,
  timestampKey: string,
  duration: number
) => {
  try {
    if (typeof window === 'undefined') return null // SSR safety

    const cachedData = localStorage.getItem(cacheKey)
    const cachedTimestamp = localStorage.getItem(timestampKey)

    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp)
      if (cacheAge < duration) {
        return JSON.parse(cachedData)
      }
    }
    return null
  } catch (error) {
    console.error('Error reading cached wallet data:', error)
    return null
  }
}

/**
 * Set cached data with timestamp
 * @param cacheKey - The key to store cached data
 * @param timestampKey - The key to store cache timestamp
 * @param data - Data to cache
 */
const setCachedWalletData = (
  cacheKey: string,
  timestampKey: string,
  data: any
) => {
  try {
    if (typeof window === 'undefined') return // SSR safety

    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(timestampKey, Date.now().toString())
  } catch (error) {
    console.error('Error setting cached wallet data:', error)
  }
}

/**
 * Check if we should fetch fresh token list (for detecting new tokens)
 * @param address - Wallet address
 * @param chain - Chain identifier
 * @returns true if we should check for new tokens
 */
const shouldCheckForNewTokens = (address: string, chain: string): boolean => {
  try {
    if (typeof window === 'undefined') return true

    const lastCheckKey = `wallet_tokens_lastcheck_${address.toLowerCase()}_${chain.toLowerCase()}`
    const lastCheck = localStorage.getItem(lastCheckKey)

    if (!lastCheck) return true

    const timeSinceLastCheck = Date.now() - parseInt(lastCheck)
    return (
      timeSinceLastCheck > MORALIS_CACHE_CONFIG.TOKEN_BALANCE_CHECK_INTERVAL
    )
  } catch (error) {
    return true // Default to checking if there's an error
  }
}

/**
 * Update the last check timestamp
 * @param address - Wallet address
 * @param chain - Chain identifier
 */
const updateLastCheckTimestamp = (address: string, chain: string) => {
  try {
    if (typeof window === 'undefined') return

    const lastCheckKey = `wallet_tokens_lastcheck_${address.toLowerCase()}_${chain.toLowerCase()}`
    localStorage.setItem(lastCheckKey, Date.now().toString())
  } catch (error) {
    console.error('Error updating last check timestamp:', error)
  }
}

/**
 * Compare token lists and detect new tokens
 * @param cachedTokens - Previously cached tokens
 * @param freshTokenAddresses - Fresh token addresses from API
 * @returns true if new tokens detected
 */
const hasNewTokens = (
  cachedTokens: TokenData[],
  freshTokenAddresses: string[]
): boolean => {
  const cachedAddresses = new Set(
    cachedTokens.map((t) => t.token_address.toLowerCase())
  )

  // Check if any fresh token address is not in cached tokens
  return freshTokenAddresses.some(
    (address) =>
      !cachedAddresses.has(address.toLowerCase()) &&
      address.toLowerCase() !== '0x0000000000000000000000000000000000000000' // Exclude native token
  )
}

/**
 * Fetch tokens for a wallet address with smart caching
 * @param address Wallet address
 * @param chain Chain to fetch tokens from (e.g., 'eth', 'bsc', 'polygon')
 * @returns Array of token data
 */
export const getWalletTokens = async (
  address: string,
  chain: string = 'eth'
): Promise<TokenData[]> => {
  try {
    // Create cache keys for this specific address and chain
    const cacheKey = `wallet_tokens_${address.toLowerCase()}_${chain.toLowerCase()}`
    const timestampKey = `wallet_tokens_timestamp_${address.toLowerCase()}_${chain.toLowerCase()}`

    // Check for cached data first
    const cachedTokens = getCachedWalletData(
      cacheKey,
      timestampKey,
      MORALIS_CACHE_CONFIG.CACHE_DURATION
    )

    // Check if we should look for new tokens (every 5 minutes)
    const shouldCheckNew = shouldCheckForNewTokens(address, chain)

    if (cachedTokens && !shouldCheckNew) {
      return cachedTokens
    }

    await initMoralis()

    // Convert string chain to EvmChain object
    const evmChain = CHAIN_MAPPING[chain.toLowerCase()] || EvmChain.ETHEREUM

    // Get token balances - this is a lightweight call to check for new tokens
    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
      address,
      chain: evmChain,
    })

    const tokenBalances = response.toJSON()
    const tokenAddresses = tokenBalances.map((token) => token.token_address)

    // If we have cached tokens, check if there are new ones
    if (cachedTokens && cachedTokens.length > 0) {
      const newTokensDetected = hasNewTokens(cachedTokens, tokenAddresses)

      if (!newTokensDetected) {
        // No new tokens, update the last check timestamp and return cached data
        updateLastCheckTimestamp(address, chain)
        return cachedTokens
      }
    }

    // Either no cache exists or new tokens detected - fetch complete fresh data
    updateLastCheckTimestamp(address, chain)

    // Get native balance (ETH, BNB, MATIC, etc.) - important to include native token
    const nativeBalanceResponse = await Moralis.EvmApi.balance.getNativeBalance(
      {
        address,
        chain: evmChain,
      }
    )

    const nativeBalance = nativeBalanceResponse.toJSON()

    // Get token prices to calculate USD values
    let tokenPrices: TokenPrices = {}

    // Get native token price (e.g., ETH, BNB)
    let nativeTokenPrice = {
      usd_price: 0,
      percent_change_24h: 0,
    }

    // Native token symbols map for different chains
    const nativeTokens: { [key: string]: { symbol: string; name: string } } = {
      eth: { symbol: 'ETH', name: 'Ethereum' },
      bsc: { symbol: 'BNB', name: 'Binance Coin' },
      polygon: { symbol: 'MATIC', name: 'Polygon' },
      avalanche: { symbol: 'AVAX', name: 'Avalanche' },
      arbitrum: { symbol: 'ETH', name: 'Ethereum' }, // Arbitrum uses ETH
    }

    // Fetch native token price
    try {
      // For ETH, we use a special endpoint
      let priceResponse

      if (chain.toLowerCase() === 'eth' || chain.toLowerCase() === 'ethereum') {
        priceResponse = await Moralis.EvmApi.token.getTokenPrice({
          chain: evmChain,
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH contract address
        })
      } else {
        // For other chains, use their native wrapped token
        const nativeTokenAddresses: { [key: string]: string } = {
          bsc: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
          polygon: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
          avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
        }

        const nativeWrappedAddress = nativeTokenAddresses[chain.toLowerCase()]
        if (nativeWrappedAddress) {
          priceResponse = await Moralis.EvmApi.token.getTokenPrice({
            chain: evmChain,
            address: nativeWrappedAddress,
          })
        }
      }

      if (priceResponse) {
        const priceData = priceResponse.toJSON()
        nativeTokenPrice = {
          usd_price: priceData.usdPrice || 0,
          percent_change_24h: priceData['24hrPercentChange']
            ? parseFloat(priceData['24hrPercentChange'])
            : 0,
        }
      }
    } catch (nativePriceError) {
      console.warn(
        `Error fetching native token price for ${chain}:`,
        nativePriceError
      )
    }

    // Add native token to the list of tokens
    const nativeTokenData: TokenData = {
      token_address: '0x0000000000000000000000000000000000000000', // Use zero address for native token
      name: nativeTokens[chain.toLowerCase()]?.name || 'Native Token',
      symbol: nativeTokens[chain.toLowerCase()]?.symbol || 'NATIVE',
      decimals: 18, // Most native tokens have 18 decimals
      balance: nativeBalance.balance,
      possible_spam: false,
      usd_price: nativeTokenPrice.usd_price || 0, // Ensure it's always a number
      status:
        nativeTokenPrice.percent_change_24h >= 0 ? 'increase' : 'decrease',
      statusAmount: Math.abs(nativeTokenPrice.percent_change_24h),
    }

    if (tokenAddresses.length > 0) {
      // Using getTokenPrice for each token since getTokensPrice may not be available
      for (const tokenAddress of tokenAddresses) {
        try {
          const priceResponse = await Moralis.EvmApi.token.getTokenPrice({
            chain: evmChain,
            address: tokenAddress,
          })

          const priceData = priceResponse.toJSON()

          // Since we may not have percent change data from the API,
          // We'll set a default value
          tokenPrices[tokenAddress] = {
            usd_price: priceData.usdPrice || 0,
            percent_change_24h: priceData['24hrPercentChange']
              ? parseFloat(priceData['24hrPercentChange'])
              : 0, // Parse string to number
          }
        } catch (individualPriceError: any) {
          // Don't log 404 errors for insufficient liquidity - this is normal for many tokens
          if (
            individualPriceError?.message?.includes('404') &&
            individualPriceError?.message?.includes('Insufficient liquidity')
          ) {
            // For tokens with insufficient liquidity, set price to 0 but don't log error
            tokenPrices[tokenAddress] = {
              usd_price: 0,
              percent_change_24h: 0,
            }
          } else {
            // Log other errors
            console.warn(
              `Error fetching price for token ${tokenAddress}:`,
              individualPriceError
            )

            // Still set price to 0 for error cases
            tokenPrices[tokenAddress] = {
              usd_price: 0,
              percent_change_24h: 0,
            }
          }
        }
      }
    }

    // Combine token balances with prices and filter out tokens with no price or insufficient liquidity
    let tokensWithPrices = tokenBalances.map((token) => {
      const priceData = tokenPrices[token.token_address]
      return {
        ...token,
        usd_price: priceData?.usd_price || 0,
        status:
          (priceData?.percent_change_24h || 0) >= 0
            ? ('increase' as const)
            : ('decrease' as const),
        statusAmount: Math.abs(priceData?.percent_change_24h || 0),
      }
    })

    // Add the native token to the beginning of the array
    tokensWithPrices = [nativeTokenData, ...tokensWithPrices]

    // Filter out tokens with no price (insufficient liquidity)
    const validTokens = tokensWithPrices.filter((token) => {
      // Blacklist - tokens to always exclude
      const blacklistedTokens = [
        // Explicitly blacklist the tokens mentioned in your example
        '0xfaf87e196a29969094be35dfb0ab9d0b8518db84', // ACHIVX
        '0xca51cf6867c156347fcc63531fb18e808f427e12', // $3800
        '0xbac4cb8e7dd60f868cbc14b21a6dc249177d8bbe', // pepe
        '0x95e8799b6c3c7942e321ff95ee0a656fefe20bda', // UNI
        '0x8328ac89bffb92c928f0d60aecc593b801ed4c0b', // ETH-Tokens.us
      ]

      // Always exclude blacklisted tokens
      if (blacklistedTokens.includes(token.token_address.toLowerCase())) {
        return false
      }

      // For native token, always include
      if (
        token.token_address === '0x0000000000000000000000000000000000000000'
      ) {
        return true
      }

      // Whitelist - tokens to always include regardless of other filters
      const whitelistedTokens = getWhitelistedTokens()

      // STRICT WHITELIST CHECK - Only include tokens that are whitelisted
      if (whitelistedTokens.includes(token.token_address.toLowerCase())) {
        return true
      }

      return false
    })

    // Cache the result before returning
    setCachedWalletData(cacheKey, timestampKey, validTokens)

    return validTokens
  } catch (error: any) {
    console.error('💥 Error fetching wallet tokens:', error)
    console.error('💥 Error details:', {
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
    })
    return []
  }
}

/**
 * Calculate the total wallet balance in USD
 * @param tokens Array of token data from Moralis
 * @returns Total wallet balance in USD
 */
export const calculateWalletBalance = (tokens: TokenData[]): number => {
  return tokens.reduce((total, token) => {
    const tokenBalance = parseFloat(token.balance) / 10 ** token.decimals
    const tokenValue = tokenBalance * (token.usd_price || 0)
    return total + tokenValue
  }, 0)
}

/**
 * Format tokens data to match the app's token format
 * @param tokens Array of token data from Moralis
 * @returns Formatted token data matching the app's TOKENS_TYPE structure
 */
export const formatTokensData = (tokens: TokenData[]) => {
  return tokens.map((token) => {
    // Calculate token value in native units
    const tokenValue = parseFloat(token.balance) / 10 ** token.decimals

    return {
      name: token.name || 'Unknown Token',
      symbol: token.symbol || 'UNKNOWN',
      icon:
        token.thumbnail ||
        token.logo ||
        `/tokens/${token.symbol?.toLowerCase()}.svg`,
      popular: false, // Default value, you may want to customize this based on your app logic
      value: tokenValue, // Value in native token units (e.g., ETH, not USD)
      status: token.status || 'increase', // Use token status from price data or default
      statusAmount: token.statusAmount || 0, // Use status amount from price data or default
      token_address: token.token_address,
      decimals: token.decimals,
      balance: token.balance,
      possible_spam: token.possible_spam,
      usd_price: token.usd_price || 0,
    }
  })
}
