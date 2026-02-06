import Redis from 'ioredis'

// Redis client configuration
const getRedisConfig = () => {
  // const url = process.env.REDIS_URL
  const url =
    'rediss://default:AYCJAAIjcDEyZTc0MGNiYjhlMWE0NTljYjZmN2U5ZThhM2Y4NWU1NXAxMA@clever-yak-32905.upstash.io:6379'
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set')
  }
  return url
}

// Initialize Redis client
const redisClient = new Redis(getRedisConfig())

// Cache key prefixes for different data types
export const CACHE_KEYS = {
  DEPTH: 'depth',
  PRICE: 'price',
  RESERVES: 'reserves',
} as const

// Helper function to generate cache key
export function generateCacheKey(
  prefix: keyof typeof CACHE_KEYS,
  identifier: string
): string {
  return `${CACHE_KEYS[prefix]}:${identifier}`
}

// Helper function to get a cached value
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error)
    return null
  }
}

// Helper function to set a cached value with TTL (in seconds)
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = 10
): Promise<void> {
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error)
  }
}

// Helper function to check if cache exists and is not expired
export async function isCacheValid(key: string): Promise<boolean> {
  try {
    const ttl = await redisClient.ttl(key)
    return ttl > 0
  } catch (error) {
    console.error(`Error checking cache validity for key ${key}:`, error)
    return false
  }
}

export default redisClient
