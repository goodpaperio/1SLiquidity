import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { ReservesAggregator, DexType } from '../../services/reserves-aggregator'
import { getCache, setCache, generateCacheKey } from '../../utils/redis'
import { createProvider } from '../../utils/provider'
import { CURVE_POOL_METADATA, BALANCER_POOL_METADATA } from '../../config/dex'

// Create provider with better throttling and retry settings
const provider = createProvider()
const reservesService = new ReservesAggregator(provider)

// Enhanced cache strategy for maximum speed
const CACHE_TTL = 300 // 5 minutes fresh cache
const STALE_CACHE_TTL = 900 // 15 minutes stale cache (still usable)
const BACKGROUND_REFRESH_THRESHOLD = 240 // 4 minutes - start background refresh

// Initialize Curve smart filtering (only reserves aggregator needed)
reservesService.initializeCurvePoolFilter(CURVE_POOL_METADATA)
reservesService.initializeBalancerPoolFilter(BALANCER_POOL_METADATA)

interface ReserveRequest {
  tokenA: string
  tokenB: string
  dex?: DexType // Optional: specify which DEX to query
}

function validateTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function parseRequestBody(event: APIGatewayProxyEvent): ReserveRequest | null {
  if (!event.body) return null
  try {
    return JSON.parse(event.body)
  } catch (error) {
    return null
  }
}

// Enhanced cache data structure with timestamp
interface CacheData {
  data: any
  timestamp: number
}

// Get cache with stale-while-revalidate logic
async function getStaleWhileRevalidate(cacheKey: string): Promise<{
  data: any
  isStale: boolean
  shouldRefresh: boolean
} | null> {
  const cached = (await getCache(cacheKey)) as any
  if (!cached) return null

  // Handle both new format {data, timestamp} and old format (direct data)
  const cacheData = cached.data || cached
  const timestamp = cached.timestamp || Date.now() - CACHE_TTL * 1000 // Assume old data is stale

  const age = Date.now() - timestamp
  const isStale = age > CACHE_TTL * 1000
  const shouldRefresh = age > BACKGROUND_REFRESH_THRESHOLD * 1000
  const tooOld = age > STALE_CACHE_TTL * 1000

  // Return null if cache is too old (force fresh fetch)
  if (tooOld) return null

  return {
    data: cacheData,
    isStale,
    shouldRefresh,
  }
}

// Background refresh function (non-blocking)
async function refreshInBackground(
  tokenA: string,
  tokenB: string,
  dex?: DexType
) {
  try {
    console.log(`🔄 Background refresh started for ${tokenA}-${tokenB}`)
    let reservesData

    if (dex) {
      reservesData = await reservesService.getReservesFromDex(
        tokenA,
        tokenB,
        dex
      )
    } else {
      reservesData = await reservesService.getAllReserves(tokenA, tokenB)
    }

    if (reservesData) {
      const cacheKey = generateCacheKey(
        'RESERVES',
        `${tokenA}-${tokenB}${dex ? `-${dex}` : ''}`
      )
      const cacheData: CacheData = {
        data: reservesData,
        timestamp: Date.now(),
      }
      await setCache(cacheKey, cacheData, CACHE_TTL)
      console.log(`✅ Background refresh completed for ${tokenA}-${tokenB}`)
    }
  } catch (error) {
    console.error(
      `❌ Background refresh failed for ${tokenA}-${tokenB}:`,
      error
    )
  }
}

export const main = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    let tokenA: string | undefined
    let tokenB: string | undefined
    let dex: DexType | undefined

    // Handle both GET and POST requests
    if (event.httpMethod === 'GET') {
      tokenA = event.queryStringParameters?.tokenA
      tokenB = event.queryStringParameters?.tokenB
      dex = event.queryStringParameters?.dex as DexType | undefined
    } else if (event.httpMethod === 'POST') {
      const body = parseRequestBody(event)
      if (!body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid request',
            message: 'Invalid request body',
          }),
        }
      }
      tokenA = body.tokenA
      tokenB = body.tokenB
      dex = body.dex
    }

    if (!tokenA || !tokenB) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing parameters',
          message: 'Both tokenA and tokenB addresses are required',
        }),
      }
    }

    if (!validateTokenAddress(tokenA) || !validateTokenAddress(tokenB)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid address',
          message: 'One or both token addresses are invalid',
        }),
      }
    }

    // Generate cache key based on tokens and DEX if specified
    const cacheKey = generateCacheKey(
      'RESERVES',
      `${tokenA}-${tokenB}${dex ? `-${dex}` : ''}`
    )

    // Check cache with stale-while-revalidate strategy
    const cacheResult = await getStaleWhileRevalidate(cacheKey)

    if (cacheResult) {
      const { data, isStale, shouldRefresh } = cacheResult

      // If data is fresh, return immediately
      if (!isStale) {
        console.log(`✅ Fresh cache hit for ${tokenA}-${tokenB}`)
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'X-Cache-Status': 'FRESH',
          },
          body: JSON.stringify(data),
        }
      }

      // If data is stale but usable, return it and refresh in background
      console.log(
        `🟡 Stale cache hit for ${tokenA}-${tokenB}, ${
          shouldRefresh ? 'refreshing in background' : 'still valid'
        }`
      )

      // Start background refresh if needed (non-blocking)
      if (shouldRefresh) {
        refreshInBackground(tokenA, tokenB, dex).catch(console.error)
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-Cache-Status': 'STALE',
        },
        body: JSON.stringify(data),
      }
    }

    // No cache or cache too old - need fresh data
    console.log(
      `Cache miss for reserves of ${tokenA}-${tokenB}${
        dex ? ` from ${dex}` : ''
      }, fetching from API...`
    )

    try {
      // If not in cache, fetch from API
      let reservesData
      try {
        if (dex) {
          reservesData = await reservesService.getReservesFromDex(
            tokenA,
            tokenB,
            dex
          )
        } else {
          reservesData = await reservesService.getAllReserves(tokenA, tokenB)
        }

        if (!reservesData) {
          console.log(`No reserves found for ${tokenA}-${tokenB} on ${dex}`)

          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              error: 'No reserves',
              message: 'No reserves found for the token pair',
              // message: `No reserves found for ${tokenA}-${tokenB} on ${dex}`,
            }),
          }
        }

        // Cache the successful result with timestamp
        const cacheData: CacheData = {
          data: reservesData,
          timestamp: Date.now(),
        }
        await setCache(cacheKey, cacheData, CACHE_TTL)

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'X-Cache-Status': 'FRESH',
          },
          body: JSON.stringify(reservesData),
        }
      } catch (error: any) {
        console.error('Error fetching reserves:', error)

        // Try to return any stale cache data as fallback (always show results when possible)
        const fallbackCache = (await getCache(cacheKey)) as any
        if (fallbackCache) {
          const fallbackData = fallbackCache.data || fallbackCache
          console.log(
            `🔄 Returning stale cache as fallback for ${tokenA}-${tokenB}`
          )
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'X-Cache-Status': 'ERROR_FALLBACK',
              'X-Error': 'Fresh data temporarily unavailable',
            },
            body: JSON.stringify(fallbackData),
          }
        }

        // Handle specific error cases
        if (
          error.message?.includes('timeout') ||
          error.message?.includes('Timeout')
        ) {
          return {
            statusCode: 504,
            headers,
            body: JSON.stringify({
              error: 'Timeout',
              message: 'Request timed out while fetching reserves',
            }),
          }
        }

        if (error.message?.includes('Failed to fetch token information')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Invalid token',
              message: 'Failed to fetch token information',
            }),
          }
        }

        // Default error response
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Server error',
            message: 'Failed to fetch reserves',
          }),
        }
      }
    } catch (error) {
      console.error('Unhandled error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server error',
          message: 'An unexpected error occurred',
        }),
      }
    }
  } catch (error) {
    console.error('Unhandled error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        message: 'An unexpected error occurred',
      }),
    }
  }
}
