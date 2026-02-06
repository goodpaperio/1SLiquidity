'use client'

import { ethers } from 'ethers'
import tokensListData from '@/app/lib/utils/tokens-list-04-09-2025.json'

// Types for the JSON structure (unchanged)
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

// ERC-20 Token ABI (minimal required functions)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
]

// Infura provider for Ethereum mainnet
let infuraProvider: ethers.providers.JsonRpcProvider | null = null

// Initialize Infura provider for Ethereum mainnet
export const initInfura = (): ethers.providers.JsonRpcProvider => {
  if (infuraProvider) {
    return infuraProvider
  }

  const providerUrl = `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
  infuraProvider = new ethers.providers.JsonRpcProvider(providerUrl)
  return infuraProvider
}

/**
 * Load whitelisted token addresses from the JSON file (unchanged)
 */
const getWhitelistedTokens = (): string[] => {
  try {
    const whitelistedTokens: string[] = []

    tokensListData.testResults.forEach((testResult: TestResult) => {
      testResult.results.forEach((token: TokenResult) => {
        if (token.success === true && token.tokenAddress) {
          const address = token.tokenAddress.toLowerCase()
          if (!whitelistedTokens.includes(address)) {
            whitelistedTokens.push(address)
          }
        }
      })
    })

    console.log(
      `🔍 DEBUG: Loaded ${whitelistedTokens.length} whitelisted tokens from JSON file`
    )
    return whitelistedTokens
  } catch (error) {
    console.error('💥 Error loading whitelisted tokens from JSON:', error)
    return [
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    ]
  }
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

/**
 * Cache configuration - Shorter cache for balances, longer for price data
 */
const CACHE_CONFIG = {
  BALANCE_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes for balance data
  PRICE_CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 hours for price data
  TOKEN_LIST_CACHE_DURATION: 5 * 60 * 60 * 1000, // 5 hours for token list
}

/**
 * Get cached data with TTL check (unchanged)
 */
const getCachedData = (
  cacheKey: string,
  timestampKey: string,
  duration: number
) => {
  try {
    if (typeof window === 'undefined') return null

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
    console.error('Error reading cached data:', error)
    return null
  }
}

/**
 * Set cached data with timestamp (unchanged)
 */
const setCachedData = (cacheKey: string, timestampKey: string, data: any) => {
  try {
    if (typeof window === 'undefined') return

    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(timestampKey, Date.now().toString())
  } catch (error) {
    console.error('Error setting cached data:', error)
  }
}

/**
 * Get token metadata using Infura
 */
const getTokenMetadata = async (
  tokenAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<{ name: string; symbol: string; decimals: number }> => {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => 'Unknown Token'),
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.decimals().catch(() => 18),
    ])

    return {
      name: name || 'Unknown Token',
      symbol: symbol || 'UNKNOWN',
      decimals: Number(decimals) || 18,
    }
  } catch (error) {
    console.warn(`Error fetching metadata for ${tokenAddress}:`, error)
    return {
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
    }
  }
}

/**
 * Get token balance using Infura
 */
const getTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<string> => {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
    const balance = await contract.balanceOf(walletAddress)
    return balance.toString()
  } catch (error) {
    console.warn(`Error fetching balance for ${tokenAddress}:`, error)
    return '0'
  }
}

/**
 * Get token prices from cached useTokenList data or fetch from CoinGecko
 */
const getTokenPricesFromCache = async (
  tokenAddresses: string[]
): Promise<{
  [address: string]: { usd_price: number; percent_change_24h: number }
}> => {
  try {
    // Try to get token prices from useTokenList cache first
    const tokenListCache = getCachedData(
      'tokenMarketData_1', // Ethereum chain ID
      'tokenMarketDataTimestamp_1',
      CACHE_CONFIG.TOKEN_LIST_CACHE_DURATION
    )

    const result: {
      [address: string]: { usd_price: number; percent_change_24h: number }
    } = {}

    if (tokenListCache && Array.isArray(tokenListCache)) {
      // Map token addresses to prices from cached token list
      tokenAddresses.forEach((address) => {
        const cachedToken = tokenListCache.find(
          (token: any) =>
            token.platforms?.ethereum?.toLowerCase() === address.toLowerCase()
        )

        if (cachedToken) {
          result[address.toLowerCase()] = {
            usd_price: cachedToken.current_price || 0,
            percent_change_24h: cachedToken.price_change_percentage_24h || 0,
          }
        }
      })
    }

    // For tokens not found in cache, fetch from CoinGecko
    const missingTokens = tokenAddresses.filter(
      (address) => !result[address.toLowerCase()]
    )

    if (missingTokens.length > 0) {
      console.log(
        `Fetching prices for ${missingTokens.length} tokens not found in cache`
      )

      const addressesParam = missingTokens.join(',')
      const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressesParam}&vs_currencies=usd&include_24hr_change=true`

      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          Object.entries(data).forEach(
            ([address, priceData]: [string, any]) => {
              result[address.toLowerCase()] = {
                usd_price: priceData.usd || 0,
                percent_change_24h: priceData.usd_24h_change || 0,
              }
            }
          )
        }
      } catch (error) {
        console.warn('Error fetching missing token prices:', error)
      }
    }

    return result
  } catch (error) {
    console.error('Error getting token prices from cache:', error)
    return {}
  }
}

/**
 * Get ETH price from cached useTokenList data or fetch from CoinGecko
 */
const getEthPriceFromCache = async (): Promise<{
  usd_price: number
  percent_change_24h: number
}> => {
  try {
    // Try to get ETH price from cache first
    const ethPriceCache = getCachedData(
      'eth_price_cache',
      'eth_price_timestamp',
      CACHE_CONFIG.PRICE_CACHE_DURATION
    )

    if (ethPriceCache) {
      return ethPriceCache
    }

    // Fetch from CoinGecko if not cached
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    const ethPrice = {
      usd_price: data.ethereum?.usd || 0,
      percent_change_24h: data.ethereum?.usd_24h_change || 0,
    }

    // Cache the ETH price
    setCachedData('eth_price_cache', 'eth_price_timestamp', ethPrice)

    return ethPrice
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    return { usd_price: 0, percent_change_24h: 0 }
  }
}

/**
 * Get comprehensive token list from useTokenList cache
 */
const getTokenListFromCache = (): string[] => {
  try {
    // Get token list from useTokenList cache
    const tokenListCache = getCachedData(
      'tokenMarketData_1',
      'tokenMarketDataTimestamp_1',
      CACHE_CONFIG.TOKEN_LIST_CACHE_DURATION
    )

    if (tokenListCache && Array.isArray(tokenListCache)) {
      return tokenListCache
        .filter((token: any) => token.platforms?.ethereum)
        .map((token: any) => token.platforms.ethereum.toLowerCase())
        .filter(
          (address: string) =>
            address &&
            address.startsWith('0x') &&
            address.length === 42 &&
            address !== '0x0000000000000000000000000000000000000000'
        )
    }

    // Fallback to popular tokens if cache is empty
    return [
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
      '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
      '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
      '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
      '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b', // CRO
    ]
  } catch (error) {
    console.error('Error getting token list from cache:', error)
    return [
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    ]
  }
}

/**
 * Fetch tokens for a wallet address using Infura + CoinGecko (Ethereum only)
 * @param address Wallet address
 * @param chain Chain parameter (kept for compatibility, but only 'eth' is supported)
 * @returns Array of token data
 */
export const getWalletTokens = async (
  address: string,
  chain: string = 'eth'
): Promise<TokenData[]> => {
  try {
    // Create cache keys for this specific address (shorter cache for balances)
    const balanceCacheKey = `wallet_balances_${address.toLowerCase()}_eth`
    const balanceTimestampKey = `wallet_balances_timestamp_${address.toLowerCase()}_eth`

    // Check for cached balance data (with shorter TTL)
    const cachedBalances = getCachedData(
      balanceCacheKey,
      balanceTimestampKey,
      CACHE_CONFIG.BALANCE_CACHE_DURATION
    )

    if (cachedBalances) {
      console.log(
        `🔍 DEBUG: Using cached wallet balances for ${address} (cached ${Math.round(
          (Date.now() -
            parseInt(localStorage.getItem(balanceTimestampKey) || '0')) /
            1000
        )}s ago)`
      )
      return cachedBalances
    }

    // console.log(
    //   `🔍 DEBUG: Fetching fresh wallet balances for ${address} on Ethereum`
    // )

    const provider = initInfura()

    // Get ETH balance
    const ethBalance = await provider.getBalance(address)

    // Get comprehensive token list from useTokenList cache + whitelisted tokens
    const tokenListFromCache = getTokenListFromCache()
    const whitelistedTokens = getWhitelistedTokens()

    // Combine and deduplicate token addresses
    const allTokensToCheck = [
      ...new Set([...tokenListFromCache, ...whitelistedTokens]),
    ]

    console.log(
      `🔍 DEBUG: Checking ${allTokensToCheck.length} tokens for balances`
    )

    // Check balances for all tokens in parallel (with reasonable batch size)
    const batchSize = 50 // Process in smaller batches to avoid overwhelming the provider
    const tokenBalanceResults: { tokenAddress: string; balance: string }[] = []

    for (let i = 0; i < allTokensToCheck.length; i += batchSize) {
      const batch = allTokensToCheck.slice(i, i + batchSize)
      const batchPromises = batch.map(async (tokenAddress) => {
        try {
          const balance = await getTokenBalance(tokenAddress, address, provider)
          return { tokenAddress, balance }
        } catch (error) {
          console.warn(`Error checking balance for ${tokenAddress}:`, error)
          return { tokenAddress, balance: '0' }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      tokenBalanceResults.push(...batchResults)

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allTokensToCheck.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Filter out tokens with zero balances
    const tokensWithBalance = tokenBalanceResults.filter(
      (result) =>
        result.balance !== '0' &&
        result.balance !== '0x0' &&
        parseFloat(result.balance) > 0
    )

    console.log(
      `📊 Found ${tokensWithBalance.length} tokens with non-zero balances`
    )

    // Get metadata for tokens with balances
    const tokenMetadataPromises = tokensWithBalance.map(
      async ({ tokenAddress, balance }) => {
        const metadata = await getTokenMetadata(tokenAddress, provider)
        return {
          tokenAddress,
          balance,
          ...metadata,
        }
      }
    )

    const tokensWithMetadata = await Promise.all(tokenMetadataPromises)

    // Get token addresses for price fetching
    const tokenAddressesForPricing = tokensWithMetadata.map(
      (token) => token.tokenAddress
    )

    // Get token prices from cache or CoinGecko
    let tokenPrices: {
      [address: string]: { usd_price: number; percent_change_24h: number }
    } = {}
    if (tokenAddressesForPricing.length > 0) {
      tokenPrices = await getTokenPricesFromCache(tokenAddressesForPricing)
    }

    // Get ETH price from cache or CoinGecko
    const ethPrice = await getEthPriceFromCache()

    // Create ETH token data
    const ethTokenData: TokenData = {
      token_address: '0x0000000000000000000000000000000000000000',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      balance: ethBalance.toString(),
      possible_spam: false,
      usd_price: ethPrice.usd_price,
      status: ethPrice.percent_change_24h >= 0 ? 'increase' : 'decrease',
      statusAmount: Math.abs(ethPrice.percent_change_24h),
    }

    // Process ERC-20 tokens with metadata and prices
    let tokensWithPrices = tokensWithMetadata.map((token) => {
      const priceData = tokenPrices[token.tokenAddress.toLowerCase()] || {
        usd_price: 0,
        percent_change_24h: 0,
      }

      return {
        token_address: token.tokenAddress,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: token.balance,
        possible_spam: false,
        usd_price: priceData.usd_price,
        status:
          priceData.percent_change_24h >= 0
            ? ('increase' as const)
            : ('decrease' as const),
        statusAmount: Math.abs(priceData.percent_change_24h),
      }
    })

    // Add ETH to the beginning of the array
    tokensWithPrices = [ethTokenData, ...tokensWithPrices]

    // Apply filtering logic
    const validTokens = tokensWithPrices.filter((token) => {
      // Blacklist - tokens to always exclude
      const blacklistedTokens = [
        '0xfaf87e196a29969094be35dfb0ab9d0b8518db84',
        '0xca51cf6867c156347fcc63531fb18e808f427e12',
        '0xbac4cb8e7dd60f868cbc14b21a6dc249177d8bbe',
        '0x95e8799b6c3c7942e321ff95ee0a656fefe20bda',
        '0x8328ac89bffb92c928f0d60aecc593b801ed4c0b',
      ]

      if (blacklistedTokens.includes(token.token_address.toLowerCase())) {
        return false
      }

      // Always include whitelisted tokens
      const whitelistedTokens = getWhitelistedTokens()
      if (whitelistedTokens.includes(token.token_address.toLowerCase())) {
        return true
      }

      // Skip tokens with suspicious patterns
      const suspiciousPatterns = [
        'visit',
        'swap',
        'claim',
        'airdrop',
        'http',
        '.xyz',
        '.pro',
        '.io',
        '.us',
        'get',
        'free',
        'bonus',
        'win',
        'lucky',
        'prize',
        'giveaway',
      ]

      const symbolLower = (token.symbol || '').toLowerCase()
      const nameLower = (token.name || '').toLowerCase()

      const hasSpamPattern = suspiciousPatterns.some(
        (pattern) =>
          symbolLower.includes(pattern.toLowerCase()) ||
          nameLower.includes(pattern.toLowerCase())
      )

      if (hasSpamPattern) {
        console.log(
          '🚫 DEBUG: Token has spam pattern:',
          token.symbol,
          token.name
        )
        return false
      }

      // Keep tokens with price data or ETH or tokens with balance
      const hasPrice = token.usd_price > 0
      const isEth =
        token.token_address === '0x0000000000000000000000000000000000000000'
      const hasBalance = parseFloat(token.balance) > 0

      return hasPrice || isEth || hasBalance
    })

    console.log('📈 DEBUG: Total tokens after filtering:', validTokens.length)

    // Cache the result with shorter TTL for balance data
    setCachedData(balanceCacheKey, balanceTimestampKey, validTokens)

    return validTokens
  } catch (error: any) {
    console.error('💥 Error fetching wallet tokens:', error)
    return []
  }
}

/**
 * Calculate the total wallet balance in USD (unchanged)
 */
export const calculateWalletBalance = (tokens: TokenData[]): number => {
  return tokens.reduce((total, token) => {
    const tokenBalance = parseFloat(token.balance) / 10 ** token.decimals
    const tokenValue = tokenBalance * (token.usd_price || 0)
    return total + tokenValue
  }, 0)
}

/**
 * Format tokens data to match the app's token format (unchanged)
 */
export const formatTokensData = (tokens: TokenData[]) => {
  return tokens.map((token) => {
    const tokenValue = parseFloat(token.balance) / 10 ** token.decimals

    return {
      name: token.name || 'Unknown Token',
      symbol: token.symbol || 'UNKNOWN',
      icon:
        token.thumbnail ||
        token.logo ||
        `/tokens/${token.symbol?.toLowerCase()}.svg`,
      popular: false,
      value: tokenValue,
      status: token.status || 'increase',
      statusAmount: token.statusAmount || 0,
      token_address: token.token_address,
      decimals: token.decimals,
      balance: token.balance,
      possible_spam: token.possible_spam,
      usd_price: token.usd_price || 0,
    }
  })
}

// Legacy exports for backward compatibility
export const initMoralis = async () => {
  console.log('⚠️  initMoralis called but using Infura now')
}

export const CHAIN_MAPPING = {
  eth: 'ethereum',
  ethereum: 'ethereum',
}
