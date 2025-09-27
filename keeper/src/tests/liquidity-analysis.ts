import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from keeper/.env
const envPath = path.join(__dirname, '../../.env')
dotenv.config({ path: envPath })

import { createProvider } from '../utils/provider'
import { ReservesAggregator } from '../services/reserves-aggregator'
import { TokenService } from '../services/token-service'
import DatabaseService from '../services/database-service'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import {
  CONTRACT_ABIS,
  CONTRACT_ADDRESSES,
  CURVE_POOL_METADATA,
  BALANCER_POOL_METADATA,
} from '../config/dex'
import { ethers } from 'ethers'

// Create provider
const provider = createProvider()
const reservesAggregator = new ReservesAggregator(provider)
const tokenService = TokenService.getInstance(provider)

// Initialize Curve and Balancer smart filtering
reservesAggregator.initializeCurvePoolFilter(CURVE_POOL_METADATA)
reservesAggregator.initializeBalancerPoolFilter(BALANCER_POOL_METADATA)

// Base tokens to test against (Ethereum addresses)
const BASE_TOKENS = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum USDT
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // Ethereum WBTC
}

// Function to check if a token is an ERC20 token
const NATIVE_TOKEN_ADDRESSES = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH (virtual)
  '0x0000000000000000000000000000000000000000', // ETH (native)
]

// New interfaces for JSON file structure
interface JsonTokenResult {
  tokenName: string
  tokenAddress: string
  success: boolean
  failureReason: string
}

interface JsonTestResult {
  baseToken: string
  totalTests: number
  successCount: number
  failureCount: number
  results: JsonTokenResult[]
}

interface JsonFileStructure {
  timestamp: string
  testResults: JsonTestResult[]
}

interface TokenPair {
  baseTokenSymbol: string
  baseTokenAddress: string
  tokenSymbol: string
  tokenAddress: string
  tokenName: string
}

// Utility function to convert wei to normal value
function weiToNormal(weiValue: string | null, decimals: number): number {
  if (!weiValue || weiValue === '0') return 0
  try {
    const bigIntValue = BigInt(weiValue)
    const divisor = BigInt(10) ** BigInt(decimals)
    // Convert to number with proper decimal places
    return Number(bigIntValue) / Number(divisor)
  } catch (error) {
    console.warn(
      `Error converting wei value ${weiValue} with decimals ${decimals}:`,
      error
    )
    return 0
  }
}

// Function to calculate total reserves for a token across all DEXes
function calculateTotalReserves(
  reserves: any,
  isTokenA: boolean,
  decimals: number
): { weiTotal: string; normalTotal: number } {
  const reserveFields = isTokenA
    ? [
        'reservesAUniswapV2',
        'reservesASushiswap',
        'reservesACurve',
        'reservesABalancer',
        // 'reservesAUniswapV3_500',
        // 'reservesAUniswapV3_3000',
        // 'reservesAUniswapV3_10000',
      ]
    : [
        'reservesBUniswapV2',
        'reservesBSushiswap',
        'reservesBCurve',
        'reservesBBalancer',
        // 'reservesBUniswapV3_500',
        // 'reservesBUniswapV3_3000',
        // 'reservesBUniswapV3_10000',
      ]

  let totalWei = BigInt(0)

  reserveFields.forEach((field) => {
    const reserveValue = reserves[field]
    if (reserveValue && reserveValue !== '0') {
      try {
        totalWei += BigInt(reserveValue)
      } catch (error) {
        console.warn(
          `Error adding reserve value ${reserveValue} for field ${field}:`,
          error
        )
      }
    }
  })

  const weiTotalStr = totalWei.toString()
  const normalTotal = weiToNormal(weiTotalStr, decimals)

  return {
    weiTotal: weiTotalStr,
    normalTotal: normalTotal,
  }
}

// Improved function to check if a token is an ERC20 token on a specific platform
const isERC20Token = (
  tokenAddress: string,
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
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

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (tokenAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase().includes('binance'))
  ) {
    console.log(`BNB is not an ERC20 token on Ethereum: ${platformAddress}`)
    return false
  }

  // Native tokens (ETH) are not ERC20
  if (NATIVE_TOKEN_ADDRESSES.includes(platformAddress.toLowerCase())) {
    console.log(
      `Token address ${platformAddress} is a native token, not an ERC20`
    )
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

// Function to safely get a token address from platforms object
const getTokenAddressForPlatform = (
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
): string => {
  if (!platforms || !platforms[targetPlatform]) return ''

  const address = platforms[targetPlatform].toLowerCase()

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (address === 'bnb' || address.includes('binance'))
  ) {
    console.log(`Excluded BNB token on Ethereum: ${address}`)
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
    console.log(`Excluded token with invalid or native address: ${address}`)
    return ''
  }

  return address
}

interface TokenInfo {
  id: string
  symbol: string
  name: string
  market_cap_rank: number
  market_cap: number
  current_price: number
  platforms: {
    [key: string]: string
  }
}

interface LiquidityResult {
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  marketCap: number
  baseToken: string
  baseTokenSymbol: string
  dex: string
  reserves: {
    token0: string
    token1: string
  }
  decimals: {
    token0: number
    token1: number
  }
  timestamp: number
}

interface TokenLiquiditySummary {
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  marketCap: number
  liquidityPairs: LiquidityResult[]
}

// New function to load tokens from JSON file
async function loadTokensFromJsonFile(jsonPath: string): Promise<TokenPair[]> {
  console.log(`Loading tokens from JSON file: ${jsonPath}`)

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON file not found: ${jsonPath}`)
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf8')
  const jsonData: JsonFileStructure = JSON.parse(fileContent)

  const tokenPairs: TokenPair[] = []
  const seenPairs = new Set<string>() // Track unique pairs to avoid duplicates

  // Process each base token's results
  for (const testResult of jsonData.testResults) {
    const baseTokenSymbol = testResult.baseToken.toUpperCase()
    const baseTokenAddress =
      BASE_TOKENS[baseTokenSymbol as keyof typeof BASE_TOKENS]

    if (!baseTokenAddress) {
      console.warn(`Unknown base token: ${baseTokenSymbol}`)
      continue
    }

    // Skip if no results for this base token
    if (!testResult.results || testResult.results.length === 0) {
      console.log(`No results for base token ${baseTokenSymbol}, skipping...`)
      continue
    }

    // Process only successful tokens
    const successfulTokens = testResult.results.filter(
      (result) => result.success === true
    )

    console.log(
      `Found ${successfulTokens.length} successful tokens for base token ${baseTokenSymbol}`
    )

    for (const token of successfulTokens) {
      // Create a unique key for this pair (base-token combination)
      // baseTokenAddress is tokenA, token.tokenAddress is tokenB
      const pairKey = `${baseTokenAddress.toLowerCase()}-${token.tokenAddress.toLowerCase()}`

      // Skip if we've already seen this pair
      if (seenPairs.has(pairKey)) {
        console.log(
          `  Skipping duplicate pair: ${baseTokenSymbol}/${token.tokenName.toUpperCase()}`
        )
        continue
      }

      // Add to seen pairs set
      seenPairs.add(pairKey)

      // Create the pair with correct logic:
      // baseToken -> resultToken (e.g., USDT -> LINK)
      tokenPairs.push({
        baseTokenSymbol: baseTokenSymbol, // e.g., "USDT"
        baseTokenAddress: baseTokenAddress, // e.g., USDT address
        tokenSymbol: token.tokenName.toUpperCase(), // e.g., "LINK"
        tokenAddress: token.tokenAddress.toLowerCase(), // e.g., LINK address
        tokenName: token.tokenName,
      })

      console.log(
        `  Added pair: ${baseTokenSymbol} -> ${token.tokenName.toUpperCase()}`
      )
    }
  }

  console.log(`Total unique token pairs loaded: ${tokenPairs.length}`)
  if (seenPairs.size !== tokenPairs.length) {
    console.log(`Skipped ${seenPairs.size - tokenPairs.length} duplicate pairs`)
  }
  return tokenPairs
}

// New function to fetch token details from CoinGecko for specific addresses
async function fetchTokenDetailsFromCoinGecko(
  addresses: string[]
): Promise<Map<string, TokenInfo>> {
  console.log(
    `Fetching token details from CoinGecko for ${addresses.length} tokens...`
  )

  const tokenDetailsMap = new Map<string, TokenInfo>()
  const targetPlatform = 'ethereum'

  try {
    // Fetch tokens by market cap from CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&locale=en&precision=full`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`)
    }

    const allTokens = (await response.json()) as TokenInfo[]
    console.log(
      `Successfully fetched ${allTokens.length} tokens from CoinGecko`
    )

    // Fetch token platforms (addresses) for the tokens
    let platformsData = []
    try {
      const platformsResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/list?include_platform=true',
        {
          signal: AbortSignal.timeout(10000), // 10 second timeout
          headers: { Accept: 'application/json' },
        }
      )

      if (!platformsResponse.ok) {
        throw new Error(
          `Failed to fetch token platforms: ${platformsResponse.status}`
        )
      }

      platformsData = (await platformsResponse.json()) as any[]
      console.log(
        `Successfully fetched platform data for ${platformsData.length} tokens`
      )
    } catch (error) {
      console.error('Error fetching token platforms:', error)
      throw error
    }

    // Merge platforms data with token data
    const enrichedTokens = allTokens.map((token) => {
      const platformInfo = platformsData.find((p: any) => p.id === token.id)
      return {
        ...token,
        platforms: platformInfo?.platforms || {},
      }
    })

    // Create a map of address to token info for our specific addresses
    const addressSet = new Set(addresses.map((addr) => addr.toLowerCase()))

    for (const token of enrichedTokens) {
      const tokenAddress = getTokenAddressForPlatform(
        token.platforms,
        targetPlatform
      )
      if (tokenAddress && addressSet.has(tokenAddress.toLowerCase())) {
        tokenDetailsMap.set(tokenAddress.toLowerCase(), token)
      }
    }

    console.log(
      `Found details for ${tokenDetailsMap.size} out of ${addresses.length} requested tokens`
    )

    // Log missing tokens
    const foundAddresses = new Set(tokenDetailsMap.keys())
    const missingAddresses = addresses.filter(
      (addr) => !foundAddresses.has(addr.toLowerCase())
    )
    if (missingAddresses.length > 0) {
      console.warn(
        `Missing token details for ${missingAddresses.length} addresses:`
      )
      missingAddresses.forEach((addr) => console.warn(`  - ${addr}`))
    }

    return tokenDetailsMap
  } catch (error) {
    console.error('Error fetching token details:', error)
    throw error
  }
}

async function fetchTopTokensByMarketCap(
  limit: number = 100
): Promise<TokenInfo[]> {
  console.log(
    `Fetching top ${limit} ERC20 tokens by market cap from CoinGecko...`
  )

  const tokens: TokenInfo[] = []
  const targetPlatform = 'ethereum' // Focus on Ethereum only

  try {
    // Fetch tokens by market cap from CoinGecko API
    console.log('Fetching tokens by market cap...')
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&locale=en&precision=full`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`)
    }

    const allTokens = (await response.json()) as TokenInfo[]
    console.log(`Successfully fetched ${allTokens.length} tokens`)

    // Fetch token platforms (addresses) for the tokens
    let platformsData = []
    try {
      const platformsResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/list?include_platform=true',
        {
          signal: AbortSignal.timeout(5000), // 5 second timeout
          headers: { Accept: 'application/json' },
        }
      )

      if (!platformsResponse.ok) {
        throw new Error(
          `Failed to fetch token platforms: ${platformsResponse.status}`
        )
      }

      platformsData = (await platformsResponse.json()) as any[]
      console.log(
        `Successfully fetched platform data for ${platformsData.length} tokens`
      )
    } catch (error) {
      console.error('Error fetching token platforms:', error)
      throw error
    }

    // Merge platforms data with token data
    const enrichedTokens = allTokens.map((token) => {
      const platformInfo = platformsData.find((p: any) => p.id === token.id)
      return {
        ...token,
        platforms: platformInfo?.platforms || {},
      }
    })

    // Filter for ERC20 tokens specifically with addresses on Ethereum
    const erc20Tokens = enrichedTokens.filter((token) => {
      const tokenAddress = getTokenAddressForPlatform(
        token.platforms,
        targetPlatform
      )
      // Use improved function to check if it's an ERC20 token on Ethereum
      return (
        tokenAddress &&
        isERC20Token(tokenAddress, token.platforms, targetPlatform)
      )
    })

    console.log(
      `Filtered ${
        enrichedTokens.length - erc20Tokens.length
      } non-ERC20 tokens out of ${enrichedTokens.length} total tokens`
    )

    console.log(
      `Found ${erc20Tokens.length} ERC20 tokens available on ${targetPlatform}`
    )

    return erc20Tokens.slice(0, limit)
  } catch (error) {
    console.error('Error fetching token list:', error)
    throw error
  }
}

async function getTokenAddressForChain(
  token: TokenInfo,
  chain: string = 'ethereum'
): Promise<string | null> {
  // Get token address from platforms
  const tokenAddress = getTokenAddressForPlatform(token.platforms, chain)

  if (!tokenAddress) {
    console.log(`No ${chain} address found for ${token.symbol}`)
    return null
  }

  // Check if it's a valid ERC20 token
  if (!isERC20Token(tokenAddress, token.platforms, chain)) {
    console.log(`${token.symbol} is not a valid ERC20 token on ${chain}`)
    return null
  }

  return tokenAddress.toLowerCase()
}

// New function to analyze liquidity for a specific token pair
async function analyzeTokenPairLiquidity(
  pair: TokenPair,
  tokenDetails: TokenInfo | undefined
): Promise<TokenLiquiditySummary | null> {
  console.log(
    `\nAnalyzing liquidity for ${pair.baseTokenSymbol}/${pair.tokenSymbol} (${pair.baseTokenAddress}/${pair.tokenAddress})...`
  )

  const liquidityPairs: LiquidityResult[] = []

  try {
    // Get reserves from all DEXes for this specific token pair
    // tokenA = baseToken, tokenB = resultToken
    const allReserves = await getAllReservesForPair(
      pair.baseTokenAddress, // tokenA = base token (USDC, USDT, etc.)
      pair.tokenAddress, // tokenB = result token (LINK, WBTC, etc.)
      pair.baseTokenSymbol, // tokenA symbol
      pair.tokenSymbol // tokenB symbol
    )

    if (allReserves.length > 0) {
      liquidityPairs.push(...allReserves)
      console.log(
        `    Found ${allReserves.length} DEX pools for ${pair.baseTokenSymbol}/${pair.tokenSymbol}`
      )
    } else {
      console.log(
        `    No liquidity found for ${pair.baseTokenSymbol}/${pair.tokenSymbol}`
      )
    }
  } catch (error) {
    console.warn(
      `    Error getting reserves for ${pair.baseTokenSymbol}/${pair.tokenSymbol}:`,
      error
    )
  }

  if (liquidityPairs.length === 0) {
    console.log(
      `  No liquidity found for ${pair.baseTokenSymbol}/${pair.tokenSymbol}`
    )
    return null
  }

  // Use token details from CoinGecko if available, otherwise use fallback values
  const marketCap = tokenDetails?.market_cap || 0
  const tokenName = tokenDetails?.name || pair.tokenName

  return {
    tokenAddress: pair.tokenAddress, // This should be the result token (tokenB)
    tokenSymbol: pair.tokenSymbol, // This should be the result token symbol
    tokenName: tokenName,
    marketCap: marketCap,
    liquidityPairs,
  }
}

async function analyzeTokenLiquidity(
  token: TokenInfo
): Promise<TokenLiquiditySummary | null> {
  const tokenAddress = await getTokenAddressForChain(token, 'ethereum')
  if (!tokenAddress) {
    console.log(`No Ethereum address found for ${token.symbol}, skipping...`)
    return null
  }

  console.log(`\nAnalyzing liquidity for ${token.symbol} (${tokenAddress})...`)

  const liquidityPairs: LiquidityResult[] = []

  // Test against each base token
  for (const [baseSymbol, baseAddress] of Object.entries(BASE_TOKENS)) {
    console.log(`  Testing against ${baseSymbol}...`)

    try {
      // Get reserves from all DEXes for this token pair
      const allReserves = await getAllReservesForPair(
        tokenAddress,
        baseAddress,
        token.symbol,
        baseSymbol
      )

      if (allReserves.length > 0) {
        liquidityPairs.push(...allReserves)
        console.log(
          `    Found ${allReserves.length} DEX pools for ${token.symbol}/${baseSymbol}`
        )
      } else {
        console.log(`    No liquidity found for ${token.symbol}/${baseSymbol}`)
      }
    } catch (error) {
      console.warn(
        `    Error getting reserves for ${token.symbol}/${baseSymbol}:`,
        error
      )
    }

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  if (liquidityPairs.length === 0) {
    console.log(`  No liquidity found for ${token.symbol}`)
    return null
  }

  return {
    tokenAddress,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    marketCap: token.market_cap,
    liquidityPairs,
  }
}

async function getAllReservesForPair(
  tokenA: string,
  tokenB: string,
  tokenSymbol: string,
  baseSymbol: string
): Promise<LiquidityResult[]> {
  const results: LiquidityResult[] = []

  // Get token decimals
  const [token0Info, token1Info] = await Promise.all([
    tokenService.getTokenInfo(tokenA),
    tokenService.getTokenInfo(tokenB),
  ])

  // Test each DEX individually
  const dexes = [
    // { name: 'uniswap-v3-500', fee: 500 },
    // { name: 'uniswap-v3-3000', fee: 3000 },
    // { name: 'uniswap-v3-10000', fee: 10000 },
    { name: 'uniswap-v2', fee: null },
    { name: 'sushiswap', fee: null },
    { name: 'curve', fee: null },
    { name: 'balancer', fee: null },
  ]

  for (const dex of dexes) {
    try {
      let reserves
      if (dex.fee) {
        // Uniswap V3 with specific fee
        reserves = await reservesAggregator.getReservesFromDex(
          tokenA,
          tokenB,
          `uniswap-v3-${dex.fee}` as any
        )
      } else {
        // Uniswap V2, SushiSwap, Curve, or Balancer
        reserves = await reservesAggregator.getReservesFromDex(
          tokenA,
          tokenB,
          dex.name as any
        )
      }

      if (reserves) {
        const liquidityResult: LiquidityResult = {
          tokenAddress: tokenB, // Result token address (e.g., USDC address)
          tokenSymbol: baseSymbol, // Result token symbol (e.g., "USDC")
          tokenName: baseSymbol, // Result token name (e.g., "USDC")
          marketCap: 0, // Will be set by parent function
          baseToken: tokenA, // Base token address (e.g., USDT address)
          baseTokenSymbol: tokenSymbol, // Base token symbol (e.g., "USDT")
          dex: dex.name,
          reserves: reserves.reserves,
          decimals: reserves.decimals,
          timestamp: reserves.timestamp,
        }

        results.push(liquidityResult)
        console.log(`      Found ${dex.name} liquidity`)
      }
    } catch (error) {
      console.warn(`      Error getting reserves from ${dex.name}:`, error)
    }

    // Small delay between DEX calls
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return results
}

async function saveTokenToJson(
  tokenResult: TokenLiquiditySummary,
  timestamp: string
): Promise<void> {
  const jsonFilepath = path.join(
    __dirname,
    `liquidity-analysis-${timestamp}.json`
  )

  // Read existing data if file exists
  let existingData: TokenLiquiditySummary[] = []
  if (fs.existsSync(jsonFilepath)) {
    try {
      const fileContent = fs.readFileSync(jsonFilepath, 'utf8')
      existingData = JSON.parse(fileContent)
    } catch (error) {
      console.warn('Error reading existing JSON file, starting fresh:', error)
    }
  }

  // Add new token result (or update if it already exists)
  const existingIndex = existingData.findIndex(
    (item) => item.tokenAddress === tokenResult.tokenAddress
  )
  if (existingIndex >= 0) {
    existingData[existingIndex] = tokenResult
  } else {
    existingData.push(tokenResult)
  }

  // Save updated data with BigInt serialization support
  const jsonString = JSON.stringify(
    existingData,
    (key, value) => {
      // Convert BigInt to string for JSON serialization
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    },
    2
  )
  fs.writeFileSync(jsonFilepath, jsonString)
  console.log(`  💾 Saved ${tokenResult.tokenSymbol} data to JSON`)
}

// Database saving function - transforms row-based data to column-based format with upsert functionality
async function saveToDatabase(
  results: TokenLiquiditySummary[],
  timestamp: string
): Promise<void> {
  console.log('\nSaving liquidity data to database...')

  const dbService = DatabaseService.getInstance()

  try {
    await dbService.connect()

    // Transform data from row-based (one row per DEX) to column-based (one row per token pair)
    const transformedData = await transformToColumnFormat(results, timestamp)

    console.log('transformedData =====>', transformedData)
    console.log(
      `📊 Transformed ${results.length} token summaries into ${transformedData.length} database records`
    )

    // Save data in batches with upsert functionality
    const batchSize = 50
    let saved = 0

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize)

      console.log(
        `💾 Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          transformedData.length / batchSize
        )} (${batch.length} records)`
      )

      // Use upsert functionality to update existing records or create new ones
      await dbService.upsertBatchLiquidityData(batch)
      saved += batch.length

      // Small delay between batches
      if (i + batchSize < transformedData.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(
      `✅ Successfully upserted ${saved} liquidity records to database`
    )
  } catch (error) {
    console.error('❌ Error saving to database:', error)
    throw error
  } finally {
    await dbService.disconnect()
  }
}

// Transform the liquidity data from row-based format to column-based format for database
async function transformToColumnFormat(
  results: TokenLiquiditySummary[],
  timestamp: string
): Promise<any[]> {
  const transformedRecords: any[] = []

  // Define stable coin addresses for filtering - ensure all are lowercase
  const STABLE_COIN_ADDRESSES = new Set([
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  ])

  // Group by token pair (tokenA + tokenB combination)
  const tokenPairMap = new Map<string, any>()

  results.forEach((tokenSummary) => {
    tokenSummary.liquidityPairs.forEach((pair) => {
      // Create a unique key for each token pair
      // baseToken-resultToken (tokenA-tokenB)
      const pairKey = `${pair.baseToken}-${pair.tokenAddress}`

      // Filter out stable coin pairs (USDC, USDT, WBTC, WETH)
      const tokenAAddress = pair.baseToken.toLowerCase()
      const tokenBAddress = pair.tokenAddress.toLowerCase()

      // Debug logging
      console.log(`Checking pair: ${pair.baseTokenSymbol}/${pair.tokenSymbol}`)
      console.log(
        `TokenA: ${tokenAAddress} (stable: ${STABLE_COIN_ADDRESSES.has(
          tokenAAddress
        )})`
      )
      console.log(
        `TokenB: ${tokenBAddress} (stable: ${STABLE_COIN_ADDRESSES.has(
          tokenBAddress
        )})`
      )

      // FIXED: Check if BOTH tokens are stable coins - if so, skip this pair
      if (
        STABLE_COIN_ADDRESSES.has(tokenAAddress) &&
        STABLE_COIN_ADDRESSES.has(tokenBAddress)
      ) {
        console.log(
          `🚫 Filtering out stable coin pair: ${pair.baseTokenSymbol}/${pair.tokenSymbol}`
        )
        return // Skip this pair
      }

      if (!tokenPairMap.has(pairKey)) {
        // Initialize the record for this token pair
        tokenPairMap.set(pairKey, {
          timestamp: new Date(pair.timestamp),
          tokenAAddress: pair.baseToken, // tokenA = base token (USDT, USDC, etc.)
          tokenASymbol: pair.baseTokenSymbol, // tokenA symbol
          tokenAName: pair.baseTokenSymbol, // tokenA name
          tokenADecimals: pair.decimals.token0, // Assuming token0 is the base token (tokenA)
          tokenBAddress: pair.tokenAddress, // tokenB = result token (LINK, WBTC, etc.)
          tokenBSymbol: pair.tokenSymbol, // tokenB symbol
          tokenBDecimals: pair.decimals.token1, // Assuming token1 is the result token (tokenB)
          marketCap: tokenSummary.marketCap,
          // Initialize all DEX reserves as null
          reservesAUniswapV2: null,
          reservesBUniswapV2: null,
          reservesASushiswap: null,
          reservesBSushiswap: null,
          reservesACurve: null,
          reservesBCurve: null,
          reservesABalancer: null,
          reservesBBalancer: null,
          reservesAUniswapV3_500: null,
          reservesBUniswapV3_500: null,
          reservesAUniswapV3_3000: null,
          reservesBUniswapV3_3000: null,
          reservesAUniswapV3_10000: null,
          reservesBUniswapV3_10000: null,
        })
      }

      const record = tokenPairMap.get(pairKey)!

      // Map DEX names to column names and set the reserves
      switch (pair.dex) {
        case 'uniswap-v2':
          record.reservesAUniswapV2 = pair.reserves.token0
          record.reservesBUniswapV2 = pair.reserves.token1
          break
        case 'sushiswap':
          record.reservesASushiswap = pair.reserves.token0
          record.reservesBSushiswap = pair.reserves.token1
          break
        case 'curve':
          // Handle generic 'curve' format
          record.reservesACurve = pair.reserves.token0
          record.reservesBCurve = pair.reserves.token1
          break
        case 'balancer':
          // Handle generic 'balancer' format
          record.reservesABalancer = pair.reserves.token0
          record.reservesBBalancer = pair.reserves.token1
          break
        // case 'uniswap-v3-500':
        //   record.reservesAUniswapV3_500 = pair.reserves.token0
        //   record.reservesBUniswapV3_500 = pair.reserves.token1
        //   break
        // case 'uniswap-v3-3000':
        //   record.reservesAUniswapV3_3000 = pair.reserves.token0
        //   record.reservesBUniswapV3_3000 = pair.reserves.token1
        //   break
        // case 'uniswap-v3-10000':
        //   record.reservesAUniswapV3_10000 = pair.reserves.token0
        //   record.reservesBUniswapV3_10000 = pair.reserves.token1
        //   break
        default:
          // Handle Curve and Balancer pools with specific addresses
          if (pair.dex.startsWith('curve-')) {
            record.reservesACurve = pair.reserves.token0
            record.reservesBCurve = pair.reserves.token1
          } else if (pair.dex.startsWith('balancer-')) {
            record.reservesABalancer = pair.reserves.token0
            record.reservesBBalancer = pair.reserves.token1
          } else {
            console.warn(`⚠️  Unknown DEX: ${pair.dex}`)
          }
      }
    })
  })

  // Convert map to array and calculate total depths
  for (const record of tokenPairMap.values()) {
    // Calculate total depth for token A
    const tokenATotals = calculateTotalReserves(
      record,
      true,
      record.tokenADecimals
    )
    record.reserveAtotaldepthWei = tokenATotals.weiTotal
    record.reserveAtotaldepth = tokenATotals.normalTotal

    // Calculate total depth for token B
    const tokenBTotals = calculateTotalReserves(
      record,
      false,
      record.tokenBDecimals
    )
    record.reserveBtotaldepthWei = tokenBTotals.weiTotal
    record.reserveBtotaldepth = tokenBTotals.normalTotal

    // Find highest liquidity reserves across all supported DEXes
    // const reservesA = [
    //   { dex: 'uniswap-v2', reserve: record.reservesAUniswapV2 },
    //   { dex: 'sushiswap', reserve: record.reservesASushiswap },
    //   { dex: 'curve', reserve: record.reservesACurve },
    //   { dex: 'balancer', reserve: record.reservesABalancer },
    //   // { dex: 'uniswap-v3-500', reserve: record.reservesAUniswapV3_500 },
    //   // { dex: 'uniswap-v3-3000', reserve: record.reservesAUniswapV3_3000 },
    //   // { dex: 'uniswap-v3-10000', reserve: record.reservesAUniswapV3_10000 },
    // ].filter((r) => r.reserve !== null)

    // const reservesB = [
    //   { dex: 'uniswap-v2', reserve: record.reservesBUniswapV2 },
    //   { dex: 'sushiswap', reserve: record.reservesBSushiswap },
    //   { dex: 'curve', reserve: record.reservesBCurve },
    //   { dex: 'balancer', reserve: record.reservesBBalancer },
    //   // { dex: 'uniswap-v3-500', reserve: record.reservesBUniswapV3_500 },
    //   // { dex: 'uniswap-v3-3000', reserve: record.reservesBUniswapV3_3000 },
    //   // { dex: 'uniswap-v3-10000', reserve: record.reservesBUniswapV3_10000 },
    // ].filter((r) => r.reserve !== null)

    // // Compare using BigInt, but don't store as BigInt
    // const highestA = reservesA.reduce((prev, curr) =>
    //   BigInt(prev.reserve!) > BigInt(curr.reserve!) ? prev : curr
    // )

    // const highestB = reservesB.reduce((prev, curr) =>
    //   BigInt(prev.reserve!) > BigInt(curr.reserve!) ? prev : curr
    // )

    // const highestLiquidityAReserve = highestA.reserve
    // const highestLiquidityADex = highestA.dex
    // const highestLiquidityBReserve = highestB.reserve
    // const highestLiquidityBDex = highestB.dex

    // record.highestLiquidityADex = highestLiquidityADex

    const dexPairs = [
      {
        dex: 'uniswap-v2',
        reserveA: record.reservesAUniswapV2,
        reserveB: record.reservesBUniswapV2,
      },
      {
        dex: 'sushiswap',
        reserveA: record.reservesASushiswap,
        reserveB: record.reservesBSushiswap,
      },
      {
        dex: 'curve',
        reserveA: record.reservesACurve,
        reserveB: record.reservesBCurve,
      },
      {
        dex: 'balancer',
        reserveA: record.reservesABalancer,
        reserveB: record.reservesBBalancer,
      },
      // {
      //   dex: 'uniswap-v3-500',
      //   reserveA: record.reservesAUniswapV3_500,
      //   reserveB: record.reservesBUniswapV3_500,
      // },
      // {
      //   dex: 'uniswap-v3-3000',
      //   reserveA: record.reservesAUniswapV3_3000,
      //   reserveB: record.reservesBUniswapV3_3000,
      // },
      // {
      //   dex: 'uniswap-v3-10000',
      //   reserveA: record.reservesAUniswapV3_10000,
      //   reserveB: record.reservesBUniswapV3_10000,
      // },
    ].filter((pair) => pair.reserveA !== null && pair.reserveB !== null)

    // Calculate total liquidity for each DEX (sum of both token reserves in normal units)
    const dexWithLiquidity = dexPairs.map((pair) => ({
      ...pair,
      totalLiquidity:
        weiToNormal(pair.reserveA!, record.tokenADecimals) +
        weiToNormal(pair.reserveB!, record.tokenBDecimals),
    }))

    // Find best DEX with highest total liquidity
    const bestDex = dexWithLiquidity.reduce((prev, curr) =>
      curr.totalLiquidity > prev.totalLiquidity ? curr : prev
    )

    const highestLiquidityADex = bestDex.dex
    const highestLiquidityAReserve = bestDex.reserveA // Individual DEX reserve A
    const highestLiquidityBReserve = bestDex.reserveB // Individual DEX reserve B

    console.log('<=======>')
    console.log('record.tokenASymbol =====>', record.tokenASymbol)
    console.log('record.tokenBSymbol =====>', record.tokenBSymbol)
    console.log(
      'record.reserveAtotaldepthWei =====>',
      record.reserveAtotaldepthWei
    )
    console.log('bestDex =====>', bestDex)
    console.log('highestLiquidityADex =====>', highestLiquidityADex)
    console.log('highestLiquidityAReserve =====>', highestLiquidityAReserve)
    console.log('highestLiquidityBReserve =====>', highestLiquidityBReserve)
    console.log('<=======>')

    // ✅ Calculate sweet spot
    // const sweetSpot = calculateSweetSpot(
    //   BigInt(record.reserveAtotaldepthWei),
    //   highestLiquidityAReserve,
    //   highestLiquidityBReserve,
    //   record.tokenADecimals,
    //   record.tokenBDecimals
    // )

    // const sweetSpot = calculateSweetSpot(
    //   BigInt(record.reserveAtotaldepthWei),
    //   highestLiquidityAReserve,
    //   highestLiquidityBReserve,
    //   record.tokenADecimals,
    //   record.tokenBDecimals
    // )

    const sweetSpot = calculateSweetSpot(
      BigInt(record.reserveAtotaldepthWei), // Total reserves A ✓
      BigInt(highestLiquidityAReserve), // BEST DEX reserves A ✓ FIXED!
      BigInt(highestLiquidityBReserve), // BEST DEX reserves B ✓ FIXED!
      record.tokenADecimals, // TokenA decimals ✓
      record.tokenBDecimals // TokenB decimals ✓
    )

    console.log('sweetSpot =====>', sweetSpot)

    // Parse fee tier if it's uniswap-v3, otherwise fallback
    // const feeTier = highestLiquidityADex.startsWith('uniswap-v3')
    //   ? parseInt(highestLiquidityADex.split('-')[2])
    //   : 3000

    let feeTier = 3000 // Default fee tier
    if (highestLiquidityADex.startsWith('uniswap-v3')) {
      feeTier = parseInt(highestLiquidityADex.split('-')[2])
    } else if (
      highestLiquidityADex.startsWith('balancer-') ||
      highestLiquidityADex === 'balancer'
    ) {
      feeTier = 0 // Balancer pools don't use fee tiers like Uniswap V3
    } else if (
      highestLiquidityADex.startsWith('curve-') ||
      highestLiquidityADex === 'curve'
    ) {
      feeTier = 0 // Curve pools don't use fee tiers
    } else if (
      highestLiquidityADex === 'uniswap-v2' ||
      highestLiquidityADex === 'sushiswap'
    ) {
      feeTier = 3000 // Use 0.3% fee for V2-style AMMs
    }

    console.log('feeTier =====>', feeTier)

    record.highestLiquidityADex = highestLiquidityADex

    // Then fix the calculateSlippageSavings call:
    const { slippageSavings, percentageSavings } = sweetSpot
      ? await calculateSlippageSavings(
          BigInt(record.reserveAtotaldepthWei), // Total reserves A
          highestLiquidityADex, // Best DEX name
          feeTier, // Fee tier
          BigInt(highestLiquidityAReserve), // BEST DEX reserves A (FIXED!)
          BigInt(highestLiquidityBReserve), // BEST DEX reserves B (FIXED!)
          record.tokenADecimals,
          record.tokenBDecimals,
          record.tokenAAddress,
          record.tokenBAddress,
          sweetSpot
        )
      : { slippageSavings: 0, percentageSavings: 0 }

    // ✅ Calculate slippage savings
    // const { slippageSavings, percentageSavings } = sweetSpot
    //   ? await calculateSlippageSavings(
    //       BigInt(record.reserveAtotaldepthWei),
    //       highestLiquidityADex,
    //       feeTier,
    //       BigInt(record.reserveAtotaldepthWei),
    //       BigInt(record.reserveBtotaldepthWei),
    //       record.tokenADecimals,
    //       record.tokenBDecimals,
    //       record.tokenAAddress,
    //       record.tokenBAddress,
    //       sweetSpot
    //     )
    //   : { slippageSavings: 0, percentageSavings: 0 }

    console.log('==========')
    console.log('slippageSavings =====>', slippageSavings)
    console.log('percentageSavings =====>', percentageSavings)
    console.log('==========')

    // record.highestLiquidityADex = highestLiquidityADex
    // record.highestLiquidityBDex = highestLiquidityBDex
    record.slippageSavings = slippageSavings
    record.percentageSavings = percentageSavings

    transformedRecords.push(record)
  }

  console.log(
    `📋 Grouped ${results.reduce(
      (sum, r) => sum + r.liquidityPairs.length,
      0
    )} individual DEX pairs into ${
      transformedRecords.length
    } token pair records with total depth calculations`
  )

  return transformedRecords
}

function calculateSweetSpot(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number
): number {
  // Sweet spot formula: N = sqrt(alpha * V^2)
  // where:
  // N = number of streams
  // V = trade volume
  // alpha = reserveA/reserveB^2 (or reserveB/reserveA^2 depending on the magnitude of the reserves)

  console.log('==========Calculating Sweet Spot==========')

  // Convert all values to ETH format (not wei)
  const scaledReserveA = Number(reserveA) / 10 ** decimalsA
  const scaledReserveB = Number(reserveB) / 10 ** decimalsB
  const scaledVolume = Number(tradeVolume) / 10 ** decimalsA

  console.log('scaledReserveA', scaledReserveA)
  console.log('scaledReserveB', scaledReserveB)
  console.log('tradeVolume', scaledVolume)

  // Calculate alpha based on which reserve is larger
  const alpha =
    scaledReserveA > scaledReserveB
      ? scaledReserveA / (scaledReserveB * scaledReserveB)
      : scaledReserveB / (scaledReserveA * scaledReserveA)
  console.log('alpha', alpha)

  // Calculate V^2 using ETH format values
  const volumeSquared = scaledVolume * scaledVolume
  console.log('volumeSquared', volumeSquared)

  let streamCount = 0

  // Check if reserve ratio is less than 0.001
  const reserveRatio = (scaledReserveB / scaledReserveA) * 100
  console.log('reserveRatio', reserveRatio)

  // TODO: review reserve ratio selection logic later

  if (reserveRatio < 0.001) {
    // Calculate N = sqrt(alpha * V^2)
    streamCount = Math.sqrt(alpha * volumeSquared)
    console.log('Reserve ratio less than 0.001, streamCount = ', streamCount)
  } else {
    // Calculate N = sqrt(V^2 / Rin)
    streamCount = Math.sqrt(volumeSquared / scaledReserveA)
    console.log('Reserve ratio greater than 0.001, streamCount = ', streamCount)
  }

  // If pool depth < 0.2%, set streamCount to 4
  let poolDepth = scaledVolume / scaledReserveA
  console.log('poolDepth%', poolDepth)
  if (poolDepth < 0.2) {
    console.log('Pool depth less than 0.2%, streamCount = 4')
    streamCount = 4
  }

  console.log('streamCount', streamCount)

  // Round to nearest integer and ensure minimum value of 4
  return Math.max(4, Math.round(streamCount))
}

export async function calculateSlippageSavings(
  tradeVolume: bigint,
  dex: string,
  feeTier: number,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  tokenIn: string,
  tokenOut: string,
  sweetSpot: number
): Promise<{ slippageSavings: number; percentageSavings: number }> {
  try {
    console.log('==========Calculating Slippage Savings==========')
    console.log('tradeVolume', tradeVolume)
    console.log('dex', dex)
    console.log('feeTier', feeTier)
    console.log('reserveA', reserveA)
    console.log('reserveB', reserveB)
    console.log('decimalsA', decimalsA)
    console.log('decimalsB', decimalsB)
    console.log('tokenIn', tokenIn)
    console.log('tokenOut', tokenOut)
    console.log('sweetSpot', sweetSpot)
    console.log('========================================')

    if (dex === 'uniswap-v2' || dex === 'sushiswap') {
      const router = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER,
        CONTRACT_ABIS.UNISWAP_V2.ROUTER,
        provider
      )

      // const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)
      const path = [tokenIn, tokenOut]

      // Get amounts out using the router contract
      // const amountOut = await router.getAmountsOut(tradeVolume, path)
      // const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      // // Get quote for (tradeVolume / sweetSpot)
      // const sweetSpotAmountOut = await router.getAmountsOut(
      //   tradeVolume / BigInt(sweetSpot),
      //   path
      // )

      // Get quote for full amount
      //tradeVolumeOutNODECA
      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      )
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      console.log('amountOut =====>', amountOut)
      console.log(
        'amountOutInETH (tradeVolumeOutNODECA) =====>',
        amountOutInETH
      )
      console.log(
        'tradeVolume / sweetSpot =====>',
        tradeVolume / BigInt(sweetSpot)
      )

      // Get effective price by dividing amountOutinEth by tradeVolume
      const effectivePrice = amountOutInETH / Number(tradeVolume)
      console.log('effectivePriceNODECA =====>', effectivePrice)

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      )

      console.log('sweetSpotAmountOut =====>', sweetSpotAmountOut)
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB

      console.log('sweetSpotAmountOutInETH =====>', sweetSpotAmountOutInETH)

      // Scale up the sweet spot quote
      //tradeVolumeOutDECA
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

      console.log(
        'scaledSweetSpotAmountOutInETH (tradeVolumeOutDECA) =====>',
        scaledSweetSpotAmountOutInETH
      )

      // Get effective price by dividing scaledSweetSpotAmountOutInETH by tradeVolume
      const effectivePrice2 =
        scaledSweetSpotAmountOutInETH / Number(tradeVolume)
      console.log('effectivePriceDECA =====>', effectivePrice2)

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      console.log('slippageSavings =====>', slippageSavings)
      console.log('percentageSavings =====>', percentageSavings)

      return { slippageSavings, percentageSavings }
    }

    if (dex.startsWith('uniswap-v3')) {
      // Calculate getAmountsOut from UniswapV3Quoter
      const quoter = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        CONTRACT_ABIS.UNISWAP_V3.QUOTER,
        provider
      )

      // Get quote for full amount
      const data = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume, 0]
      )

      const result = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data,
      })

      const dexQuoteAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        result
      )[0]

      const dexQuoteAmountOutInETH = Number(dexQuoteAmountOut) / 10 ** decimalsB

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotQuote = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume / BigInt(sweetSpot), 0]
      )

      const sweetSpotQuoteResult = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data: sweetSpotQuote,
      })

      const sweetSpotQuoteAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        sweetSpotQuoteResult
      )[0]

      const sweetSpotQuoteAmountOutInETH =
        Number(sweetSpotQuoteAmountOut) / 10 ** decimalsB
      const scaledSweetSpotQuoteAmountOutInETH =
        sweetSpotQuoteAmountOutInETH * sweetSpot

      const slippageSavings =
        scaledSweetSpotQuoteAmountOutInETH - dexQuoteAmountOutInETH
      // const percentageSavings = (slippageSavings / dexQuoteAmountOutInETH) * 100

      // let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
      let raw = dexQuoteAmountOutInETH / scaledSweetSpotQuoteAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      return { slippageSavings, percentageSavings }
    }

    if (dex.startsWith('balancer-') || dex === 'balancer') {
      console.log('Calculating slippage for Balancer pool...')

      try {
        // Balancer uses weighted constant product formula
        // For simplification, we'll use the constant product approximation
        // amountOut = reserveB * amountIn / (reserveA + amountIn) * (1 - fee)

        // Balancer typically has 0.3% fee (similar to Uniswap V2)
        const fee = 0.003 // 0.3%

        // Calculate amount out for full trade using constant product formula
        const numerator = reserveB * tradeVolume
        const denominator = reserveA + tradeVolume
        const amountOutBeforeFee = numerator / denominator
        const amountOut =
          (amountOutBeforeFee * BigInt(Math.floor((1 - fee) * 1000000))) /
          BigInt(1000000)

        const amountOutInETH = Number(amountOut) / 10 ** decimalsB

        console.log('Balancer amountOut =====>', amountOut)
        console.log('Balancer amountOutInETH =====>', amountOutInETH)

        // Calculate amount out for sweet spot trade
        const sweetSpotTradeAmount = tradeVolume / BigInt(sweetSpot)
        const sweetSpotNumerator = reserveB * sweetSpotTradeAmount
        const sweetSpotDenominator = reserveA + sweetSpotTradeAmount
        const sweetSpotAmountOutBeforeFee =
          sweetSpotNumerator / sweetSpotDenominator
        const sweetSpotAmountOut =
          (sweetSpotAmountOutBeforeFee *
            BigInt(Math.floor((1 - fee) * 1000000))) /
          BigInt(1000000)

        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot

        console.log('Balancer sweetSpotAmountOut =====>', sweetSpotAmountOut)
        console.log(
          'Balancer scaledSweetSpotAmountOutInETH =====>',
          scaledSweetSpotAmountOutInETH
        )

        const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

        let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
        let percentageSavings = (1 - raw) * 100
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
        percentageSavings = Number(percentageSavings.toFixed(3))

        console.log('Balancer slippageSavings =====>', slippageSavings)
        console.log('Balancer percentageSavings =====>', percentageSavings)

        return { slippageSavings, percentageSavings }
      } catch (error) {
        console.error('Error in Balancer calculation:', error)
        return { slippageSavings: 0, percentageSavings: 0 }
      }
    }

    if (dex.startsWith('curve-') || dex === 'curve') {
      console.log('Calculating slippage for Curve pool...')

      try {
        // Curve uses StableSwap invariant for stablecoin pairs
        // For simplification, we'll use a modified constant product approach
        // Curve has very low slippage for similar-valued assets but higher for dissimilar ones

        // Curve typically has 0.04% fee
        const fee = 0.0004 // 0.04%

        // For Curve, we need to consider the amplification factor (A)
        // Higher A means lower slippage for similar-priced assets
        // We'll use a simplified approach assuming moderate amplification

        const A = 100n // Typical amplification factor for Curve pools

        // Simplified StableSwap calculation (approximation)
        // For small trades, it behaves similarly to constant sum
        // For large trades, it behaves more like constant product

        const reserveANormal = Number(reserveA) / 10 ** decimalsA
        const reserveBNormal = Number(reserveB) / 10 ** decimalsB
        const tradeVolumeNormal = Number(tradeVolume) / 10 ** decimalsA

        // Calculate price impact using a hybrid approach
        const totalReserves = reserveANormal + reserveBNormal
        const tradeRatio = tradeVolumeNormal / reserveANormal

        // For Curve, smaller trades have minimal slippage, larger trades have increasing slippage
        let priceImpact = tradeRatio * tradeRatio * 0.1 // Quadratic price impact
        priceImpact = Math.min(priceImpact, 0.05) // Cap at 5% impact

        // Calculate amount out with price impact and fees
        const basePrice = reserveBNormal / reserveANormal
        const effectivePrice = basePrice * (1 - priceImpact) * (1 - fee)
        const amountOutInETH = tradeVolumeNormal * effectivePrice

        console.log('Curve basePrice =====>', basePrice)
        console.log('Curve priceImpact =====>', priceImpact)
        console.log('Curve amountOutInETH =====>', amountOutInETH)

        // Calculate for sweet spot
        const sweetSpotTradeVolumeNormal = tradeVolumeNormal / sweetSpot
        const sweetSpotTradeRatio = sweetSpotTradeVolumeNormal / reserveANormal

        let sweetSpotPriceImpact =
          sweetSpotTradeRatio * sweetSpotTradeRatio * 0.1
        sweetSpotPriceImpact = Math.min(sweetSpotPriceImpact, 0.05)

        const sweetSpotEffectivePrice =
          basePrice * (1 - sweetSpotPriceImpact) * (1 - fee)
        const sweetSpotAmountOutInETH =
          sweetSpotTradeVolumeNormal * sweetSpotEffectivePrice
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot

        console.log('Curve sweetSpotPriceImpact =====>', sweetSpotPriceImpact)
        console.log(
          'Curve scaledSweetSpotAmountOutInETH =====>',
          scaledSweetSpotAmountOutInETH
        )

        const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

        let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
        let percentageSavings = (1 - raw) * 100
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
        percentageSavings = Number(percentageSavings.toFixed(3))

        console.log('Curve slippageSavings =====>', slippageSavings)
        console.log('Curve percentageSavings =====>', percentageSavings)

        return { slippageSavings, percentageSavings }
      } catch (error) {
        console.error('Error in Curve calculation:', error)
        return { slippageSavings: 0, percentageSavings: 0 }
      }
    }

    // if (dex.startsWith('balancer-') || dex === 'balancer') {
    //   // For Balancer pools, use a simplified calculation based on constant product formula
    //   // Balancer pools are more complex but we can approximate using the same logic as Uniswap V2
    //   console.log('Calculating slippage for Balancer pool...')

    //   // Calculate price using constant product formula: price = reserveB / reserveA
    //   const price = Number(reserveB) / Number(reserveA)

    //   // Calculate amount out for full trade
    //   const amountOut = Number(tradeVolume) * price
    //   const amountOutInETH = amountOut / 10 ** decimalsB

    //   // Calculate amount out for sweet spot trade
    //   const sweetSpotAmountOut = (Number(tradeVolume) / sweetSpot) * price
    //   const sweetSpotAmountOutInETH = sweetSpotAmountOut / 10 ** decimalsB
    //   const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

    //   const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

    //   let raw = slippageSavings / amountOutInETH
    //   let percentageSavings = (1 - raw) * 100
    //   percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
    //   percentageSavings = Number(percentageSavings.toFixed(3))

    //   console.log(`Balancer slippage calculation: ${percentageSavings.toFixed(3)}% savings`)
    //   return { slippageSavings, percentageSavings }
    // }

    // if (dex.startsWith('curve-') || dex === 'curve') {
    //   // For Curve pools, use a simplified calculation
    //   // Curve pools are stablecoin-focused and have different mechanics
    //   console.log('Calculating slippage for Curve pool...')

    //   // Curve pools typically have very low slippage for stablecoin pairs
    //   // Use a conservative estimate
    //   const slippageSavings = 0
    //   const percentageSavings = 0

    //   console.log(`Curve pool: ${percentageSavings}% savings (stablecoin pools have minimal slippage)`)
    //   return { slippageSavings, percentageSavings }
    // }

    console.log(`Slippage calculation not implemented for DEX: ${dex}`)
    return { slippageSavings: 0, percentageSavings: 0 }
  } catch (error) {
    console.error('Error calculating slippage savings:', error)
    return { slippageSavings: 0, percentageSavings: 0 }
  }
}

// New function to run liquidity analysis using JSON file
async function runLiquidityAnalysisFromJson(
  jsonFilePath: string
): Promise<void> {
  try {
    console.log('Starting liquidity analysis from JSON file...')

    // Create timestamp for this run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    console.log(`Using timestamp: ${timestamp}`)

    // Load token pairs from JSON file
    const tokenPairs = await loadTokensFromJsonFile(jsonFilePath)

    if (tokenPairs.length === 0) {
      console.log('No token pairs found in JSON file, exiting...')
      return
    }

    // Get all unique token addresses to fetch details from CoinGecko
    const uniqueTokenAddresses = Array.from(
      new Set(tokenPairs.map((pair) => pair.tokenAddress.toLowerCase()))
    )

    console.log(
      `Found ${uniqueTokenAddresses.length} unique tokens to fetch details for`
    )

    // Fetch token details from CoinGecko
    const tokenDetailsMap = await fetchTokenDetailsFromCoinGecko(
      uniqueTokenAddresses
    )

    const existingData: TokenLiquiditySummary[] = []

    // Process token pairs
    const totalPairs = tokenPairs.length
    console.log(`\nProcessing ${totalPairs} token pairs...`)

    for (let i = 0; i < totalPairs; i++) {
      const pair = tokenPairs[i]
      console.log(
        `\n[${i + 1}/${totalPairs}] Processing ${pair.baseTokenSymbol}/${
          pair.tokenSymbol
        }...`
      )

      const tokenDetails = tokenDetailsMap.get(pair.tokenAddress.toLowerCase())
      const result = await analyzeTokenPairLiquidity(pair, tokenDetails)

      if (result) {
        existingData.push(result)
        console.log(
          `  ✓ Found liquidity data for ${pair.baseTokenSymbol}/${pair.tokenSymbol}`
        )

        // Save token data to JSON immediately after completion
        await saveTokenToJson(result, timestamp)
      } else {
        console.log(
          `  ✗ No liquidity data found for ${pair.baseTokenSymbol}/${pair.tokenSymbol}`
        )
      }

      // Add delay between pairs to avoid rate limits
      if (i < totalPairs - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    console.log(
      `\nAnalysis complete! Total token pairs processed: ${existingData.length}`
    )

    // Save data to database
    if (process.env.DATABASE_URL) {
      try {
        await saveToDatabase(existingData, timestamp)
      } catch (error) {
        console.error(
          '⚠️  Failed to save to database, but analysis completed:',
          error
        )
        // Don't throw error to avoid failing the entire analysis
      }
    } else {
      console.log('💡 DATABASE_URL not configured, skipping database save')
    }

    // Print summary
    console.log('\n=== SUMMARY ===')
    console.log(`Total token pairs analyzed: ${existingData.length}`)

    const totalPairsFound = existingData.reduce(
      (sum, token) => sum + token.liquidityPairs.length,
      0
    )
    console.log(`Total DEX pairs found: ${totalPairsFound}`)

    // Count by DEX
    const dexCounts: Record<string, number> = {}
    existingData.forEach((token) => {
      token.liquidityPairs.forEach((pair) => {
        dexCounts[pair.dex] = (dexCounts[pair.dex] || 0) + 1
      })
    })

    console.log('\nPairs by DEX:')
    Object.entries(dexCounts).forEach(([dex, count]) => {
      console.log(`  ${dex}: ${count} pairs`)
    })

    // Count by base token
    const baseTokenCounts: Record<string, number> = {}
    existingData.forEach((token) => {
      token.liquidityPairs.forEach((pair) => {
        baseTokenCounts[pair.baseTokenSymbol] =
          (baseTokenCounts[pair.baseTokenSymbol] || 0) + 1
      })
    })

    console.log('\nPairs by base token:')
    Object.entries(baseTokenCounts).forEach(([baseToken, count]) => {
      console.log(`  ${baseToken}: ${count} pairs`)
    })
  } catch (error) {
    console.error('Error running liquidity analysis from JSON:', error)
  }
}

async function runLiquidityAnalysis(jsonFilePath?: string): Promise<void> {
  try {
    let existingData: TokenLiquiditySummary[] = []
    let timestamp: string
    let isResume = false

    if (jsonFilePath) {
      // Resume mode
      console.log(`Resuming liquidity analysis from: ${jsonFilePath}`)

      // Check if file exists
      if (!fs.existsSync(jsonFilePath)) {
        console.error(`File not found: ${jsonFilePath}`)
        return
      }

      // Load existing data
      const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
      existingData = JSON.parse(fileContent)

      console.log(
        `Loaded ${existingData.length} existing tokens from JSON file`
      )

      // Extract timestamp from filename
      const filename = path.basename(jsonFilePath)
      const timestampMatch = filename.match(/liquidity-analysis-(.+)\.json/)
      if (!timestampMatch) {
        console.error('Could not extract timestamp from filename')
        return
      }
      timestamp = timestampMatch[1]
      isResume = true

      console.log(`Resuming with timestamp: ${timestamp}`)
    } else {
      // Start from scratch mode
      console.log(
        'Starting liquidity analysis for top ERC20 tokens on Ethereum...'
      )

      // Create timestamp for this run
      timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      console.log(`Using timestamp: ${timestamp}`)
    }

    // Get list of already processed token addresses (if resuming)
    const processedAddresses = new Set(
      existingData.map((item) => item.tokenAddress.toLowerCase())
    )
    if (isResume) {
      console.log(`Already processed ${processedAddresses.size} tokens`)
    }

    const limit = 250 // 250

    // Fetch top tokens
    const topTokens = await fetchTopTokensByMarketCap(limit)
    console.log(`\nFetched ${topTokens.length} top ERC20 tokens`)

    if (topTokens.length === 0) {
      console.log('No ERC20 tokens found, exiting...')
      return
    }

    // Filter tokens based on mode
    let tokensToProcess: TokenInfo[]
    if (isResume) {
      // Filter out already processed tokens
      tokensToProcess = topTokens.filter((token) => {
        const tokenAddress = getTokenAddressForPlatform(
          token.platforms,
          'ethereum'
        )
        return (
          tokenAddress && !processedAddresses.has(tokenAddress.toLowerCase())
        )
      })
      console.log(`Found ${tokensToProcess.length} tokens remaining to process`)

      if (tokensToProcess.length === 0) {
        console.log('All tokens have been processed!')
        return
      }
    } else {
      // Start from scratch - process all tokens
      tokensToProcess = topTokens
      console.log(
        `Processing all ${tokensToProcess.length} tokens from scratch`
      )
    }

    const actualTokensToProcess = tokensToProcess.length

    // Process tokens
    for (let i = 0; i < actualTokensToProcess; i++) {
      const token = tokensToProcess[i]
      console.log(
        `\n[${i + 1}/${actualTokensToProcess}] Processing ${
          token.symbol
        } (Market Cap: $${token.market_cap.toLocaleString()})...`
      )

      const result = await analyzeTokenLiquidity(token)
      if (result) {
        existingData.push(result)
        console.log(`  ✓ Found liquidity data for ${token.symbol}`)

        // Save token data to JSON immediately after completion
        await saveTokenToJson(result, timestamp)
      } else {
        console.log(`  ✗ No liquidity data found for ${token.symbol}`)
      }

      // Add delay between tokens to avoid rate limits
      if (i < actualTokensToProcess - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(
      `\nAnalysis complete! Total tokens processed: ${existingData.length}`
    )

    // // Save data to database
    // if (process.env.DATABASE_URL) {
    //   try {
    //     await saveToDatabase(existingData, timestamp)
    //   } catch (error) {
    //     console.error(
    //       '⚠️  Failed to save to database, but analysis completed:',
    //       error
    //     )
    //     // Don't throw error to avoid failing the entire analysis
    //   }
    // } else {
    //   console.log('💡 DATABASE_URL not configured, skipping database save')
    // }

    // Print summary
    console.log('\n=== SUMMARY ===')
    console.log(`Total tokens analyzed: ${existingData.length}`)

    const totalPairs = existingData.reduce(
      (sum, token) => sum + token.liquidityPairs.length,
      0
    )
    console.log(`Total DEX pairs found: ${totalPairs}`)

    // Count by DEX
    const dexCounts: Record<string, number> = {}
    existingData.forEach((token) => {
      token.liquidityPairs.forEach((pair) => {
        dexCounts[pair.dex] = (dexCounts[pair.dex] || 0) + 1
      })
    })

    console.log('\nPairs by DEX:')
    Object.entries(dexCounts).forEach(([dex, count]) => {
      console.log(`  ${dex}: ${count} pairs`)
    })
  } catch (error) {
    console.error('Error running liquidity analysis:', error)
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)

  if (args.length > 0) {
    // Check if the argument is a JSON file (for new JSON-based mode)
    const inputPath = args[0]
    const fullPath = path.isAbsolute(inputPath)
      ? inputPath
      : path.join(__dirname, inputPath)

    if (fullPath.endsWith('.json')) {
      // New JSON-based analysis mode
      console.log('Running analysis using JSON file mode...')
      await runLiquidityAnalysisFromJson(fullPath)
    } else {
      // Resume mode - existing liquidity analysis JSON file
      console.log('Running analysis in resume mode...')
      await runLiquidityAnalysis(fullPath)
    }
  } else {
    // Start from scratch mode (original CoinGecko approach)
    console.log('Running analysis in CoinGecko mode...')
    await runLiquidityAnalysis()
  }
}

// Run the analysis
if (require.main === module) {
  main().catch(console.error)
}

// Comprehensive function to analyze liquidity for a specific token pair
export async function analyzeTokenPairLiquidityComprehensive(
  tokenAAddress: string,
  tokenBAddress: string
): Promise<{
  success: boolean
  data?: {
    tokenA: {
      address: string
      symbol: string
      name: string
      decimals: number
    }
    tokenB: {
      address: string
      symbol: string
      name: string
      decimals: number
    }
    dexes: Array<{
      name: string
      reserves: {
        tokenA: string
        tokenB: string
      }
      reservesNormal: {
        tokenA: number
        tokenB: number
      }
      totalLiquidity: number
    }>
    totalReserves: {
      tokenA: string
      tokenB: string
    }
    totalReservesNormal: {
      tokenA: number
      tokenB: number
    }
    sweetSpot: number
    slippageAnalysis: {
      dex: string
      slippageSavings: number
      percentageSavings: number
    }
    summary: {
      totalDexes: number
      totalLiquidityUSD: number
      bestDex: string
      highestLiquidity: number
    }
  }
  error?: string
}> {
  try {
    console.log(`\n🔍 Starting comprehensive liquidity analysis...`)
    console.log(`Token A: ${tokenAAddress}`)
    console.log(`Token B: ${tokenBAddress}`)

    // Validate addresses using existing function
    if (!validateTokenAddress(tokenAAddress)) {
      return {
        success: false,
        error: `Invalid token A address format: ${tokenAAddress}`,
      }
    }

    if (!validateTokenAddress(tokenBAddress)) {
      return {
        success: false,
        error: `Invalid token B address format: ${tokenBAddress}`,
      }
    }

    // Get token information
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      tokenService.getTokenInfo(tokenAAddress),
      tokenService.getTokenInfo(tokenBAddress),
    ])

    if (!tokenAInfo) {
      return {
        success: false,
        error: `Token A not found or invalid: ${tokenAAddress}`,
      }
    }

    if (!tokenBInfo) {
      return {
        success: false,
        error: `Token B not found or invalid: ${tokenBAddress}`,
      }
    }

    console.log(
      `✅ Token A: ${tokenAInfo.symbol} - ${tokenAInfo.decimals} decimals`
    )
    console.log(
      `✅ Token B: ${tokenBInfo.symbol} - ${tokenBInfo.decimals} decimals`
    )

    // Use existing getAllReservesForPair function
    const allReserves = await getAllReservesForPair(
      tokenAAddress,
      tokenBAddress,
      tokenAInfo.symbol,
      tokenBInfo.symbol
    )

    if (allReserves.length === 0) {
      return {
        success: false,
        error: 'No liquidity found for this token pair across any DEX',
      }
    }

    // Transform to the expected format
    const dexResults = allReserves.map((reserve) => ({
      name: reserve.dex,
      reserves: {
        tokenA: reserve.reserves.token0,
        tokenB: reserve.reserves.token1,
      },
      reservesNormal: {
        tokenA: weiToNormal(reserve.reserves.token0, reserve.decimals.token0),
        tokenB: weiToNormal(reserve.reserves.token1, reserve.decimals.token1),
      },
      totalLiquidity:
        weiToNormal(reserve.reserves.token0, reserve.decimals.token0) +
        weiToNormal(reserve.reserves.token1, reserve.decimals.token1),
    }))

    // Calculate total reserves using existing logic
    let totalReservesA = BigInt(0)
    let totalReservesB = BigInt(0)

    allReserves.forEach((reserve) => {
      totalReservesA += BigInt(reserve.reserves.token0)
      totalReservesB += BigInt(reserve.reserves.token1)
    })

    // Log total reserves in decimal format
    console.log(
      `Total reserves A: ${weiToNormal(
        totalReservesA.toString(),
        tokenAInfo.decimals
      ).toFixed(6)} ${tokenAInfo.symbol}`
    )
    console.log(
      `Total reserves B: ${weiToNormal(
        totalReservesB.toString(),
        tokenBInfo.decimals
      ).toFixed(6)} ${tokenBInfo.symbol}`
    )

    // Find best DEX and calculate slippage savings using existing logic
    const bestDex = dexResults.reduce((prev, curr) =>
      curr.totalLiquidity > prev.totalLiquidity ? curr : prev
    )

    // Calculate fee tier based on DEX type
    let feeTier = 3000 // Default fee tier
    if (bestDex.name.startsWith('uniswap-v3')) {
      feeTier = parseInt(bestDex.name.split('-')[2])
    } else if (
      bestDex.name.startsWith('balancer-') ||
      bestDex.name === 'balancer'
    ) {
      feeTier = 0 // Balancer pools don't use fee tiers like Uniswap V3
    } else if (bestDex.name.startsWith('curve-') || bestDex.name === 'curve') {
      feeTier = 0 // Curve pools don't use fee tiers
    } else if (bestDex.name === 'uniswap-v2' || bestDex.name === 'sushiswap') {
      feeTier = 3000 // Use 0.3% fee for V2-style AMMs
    }

    // Sweet spot should pass in reserve A and reserve B of dex with highest liquidity instead of total reserves
    const sweetSpot = calculateSweetSpot(
      totalReservesA,
      BigInt(bestDex.reserves.tokenA),
      BigInt(bestDex.reserves.tokenB),
      tokenAInfo.decimals,
      tokenBInfo.decimals
    )

    console.log(`Sweet spot: ${sweetSpot} streams`)
    const { slippageSavings, percentageSavings } =
      await calculateSlippageSavings(
        totalReservesA,
        bestDex.name,
        feeTier,
        BigInt(bestDex.reserves.tokenA),
        BigInt(bestDex.reserves.tokenB),
        tokenAInfo.decimals,
        tokenBInfo.decimals,
        tokenAAddress,
        tokenBAddress,
        sweetSpot
      )

    // Calculate summary statistics
    const totalLiquidityUSD = dexResults.reduce(
      (sum, dex) => sum + dex.totalLiquidity,
      0
    )
    const highestLiquidity = Math.max(
      ...dexResults.map((d) => d.totalLiquidity)
    )

    const result = {
      success: true,
      data: {
        tokenA: {
          address: tokenAAddress,
          symbol: tokenAInfo.symbol,
          name: tokenAInfo.symbol,
          decimals: tokenAInfo.decimals,
        },
        tokenB: {
          address: tokenBAddress,
          symbol: tokenBInfo.symbol,
          name: tokenBInfo.symbol,
          decimals: tokenBInfo.decimals,
        },
        dexes: dexResults,
        totalReserves: {
          tokenA: totalReservesA.toString(),
          tokenB: totalReservesB.toString(),
        },
        totalReservesNormal: {
          tokenA: weiToNormal(totalReservesA.toString(), tokenAInfo.decimals),
          tokenB: weiToNormal(totalReservesB.toString(), tokenBInfo.decimals),
        },
        sweetSpot,
        slippageAnalysis: {
          dex: bestDex.name,
          slippageSavings,
          percentageSavings,
        },
        summary: {
          totalDexes: dexResults.length,
          totalLiquidityUSD,
          bestDex: bestDex.name,
          highestLiquidity,
        },
      },
    }

    // Print summary
    console.log(`\n📋 COMPREHENSIVE LIQUIDITY ANALYSIS RESULTS`)
    console.log(`===============================================`)
    console.log(`Token Pair: ${tokenAInfo.symbol}/${tokenBInfo.symbol}`)
    console.log(`Token A: ${tokenAInfo.symbol} (${tokenAAddress})`)
    console.log(`Token B: ${tokenBInfo.symbol} (${tokenBAddress})`)
    console.log(`\nDEX Analysis:`)
    dexResults.forEach((dex) => {
      console.log(
        `  ${dex.name}: ${dex.reservesNormal.tokenA.toFixed(6)} ${
          tokenAInfo.symbol
        } / ${dex.reservesNormal.tokenB.toFixed(6)} ${
          tokenBInfo.symbol
        } (Total: ${dex.totalLiquidity.toFixed(6)})`
      )
    })
    console.log(
      `\nTotal Reserves: ${weiToNormal(
        totalReservesA.toString(),
        tokenAInfo.decimals
      ).toFixed(6)} ${tokenAInfo.symbol} / ${weiToNormal(
        totalReservesB.toString(),
        tokenBInfo.decimals
      ).toFixed(6)} ${tokenBInfo.symbol}`
    )
    console.log(`\nSweet Spot: ${sweetSpot} streams`)
    console.log(`\nSlippage Analysis (${bestDex.name}):`)
    console.log(
      `  Slippage Savings: ${slippageSavings.toFixed(6)} ${tokenBInfo.symbol}`
    )
    console.log(`  Percentage Savings: ${percentageSavings.toFixed(3)}%`)
    console.log(`\nSummary:`)
    console.log(`  Total DEXes: ${dexResults.length}`)
    console.log(`  Best DEX: ${bestDex.name}`)
    console.log(`  Highest Liquidity: ${highestLiquidity.toFixed(6)}`)

    return result
  } catch (error) {
    console.error('Error in comprehensive liquidity analysis:', error)
    return {
      success: false,
      error: `Analysis failed: ${error}`,
    }
  }
}

// Helper function to validate token addresses
export function validateTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export { runLiquidityAnalysis, runLiquidityAnalysisFromJson }
