import { createProvider } from '../utils/provider'
import { CurveService } from '../dex/curve'
import { CURVE_POOL_METADATA } from '../../data/curve-config'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from keeper/.env
const envPath = path.join(__dirname, '../../.env')
dotenv.config({ path: envPath })

async function testCurveService() {
  console.log('Testing Curve Service Integration...\n')

  // Create provider after environment variables are loaded
  const provider = createProvider()

  // Get a test pool from the generated metadata (3CRV pool)
  const poolAddresses = Object.keys(CURVE_POOL_METADATA)
  const testPoolAddress = poolAddresses.find(addr =>
    (CURVE_POOL_METADATA as any)[addr]?.name?.includes('3CRV') ||
    (CURVE_POOL_METADATA as any)[addr]?.tokens?.length >= 3
  ) || poolAddresses[0]

  if (!testPoolAddress) {
    console.log('No Curve pools available for testing')
    return
  }

  console.log('Using test pool:', testPoolAddress)
  console.log('Pool metadata:', (CURVE_POOL_METADATA as any)[testPoolAddress])

  const curveService = new CurveService(provider, testPoolAddress, (CURVE_POOL_METADATA as any)[testPoolAddress])

  console.log('Testing pool:', testPoolAddress)

  // Test getPoolInfo
  console.log('\n1. Testing getPoolInfo...')
  try {
    const poolInfo = await curveService.getPoolInfo()
    if (poolInfo) {
      console.log('Pool Info:', {
        coins: poolInfo.coins,
        A: poolInfo.A.toString(),
        fee: poolInfo.fee.toString()
      })
    } else {
      console.log('Failed to get pool info')
    }
  } catch (error) {
    console.error('Error getting pool info:', error)
  }

  // Test getReserves with tokens from the pool
  console.log('\n2. Testing getReserves...')
  try {
    const poolTokens = (CURVE_POOL_METADATA as any)[testPoolAddress].tokens
    if (poolTokens && poolTokens.length >= 2) {
      const tokenA = poolTokens[0]
      const tokenB = poolTokens[1]

      console.log(`Testing reserves for ${tokenA}/${tokenB}`)
      const reserves = await curveService.getReserves(tokenA, tokenB)
      if (reserves) {
        console.log('Reserves:', {
          dex: reserves.dex,
          pairAddress: reserves.pairAddress,
          reserves: reserves.reserves,
          timestamp: reserves.timestamp
        })
      } else {
        console.log(`No reserves found for ${tokenA}/${tokenB}`)
      }
    } else {
      console.log('Pool does not have enough tokens for testing')
    }
  } catch (error) {
    console.error('Error getting reserves:', error)
  }

  // Test getPrice with tokens from the pool
  console.log('\n3. Testing getPrice...')
  try {
    const poolTokens = (CURVE_POOL_METADATA as any)[testPoolAddress].tokens
    if (poolTokens && poolTokens.length >= 2) {
      const tokenA = poolTokens[0]
      const tokenB = poolTokens[1]

      console.log(`Testing price for ${tokenA}/${tokenB}`)
      const price = await curveService.getPrice(tokenA, tokenB)
      if (price) {
        console.log('Price:', {
          dex: price.dex,
          price: price.price,
          timestamp: price.timestamp
        })
      } else {
        console.log(`No price found for ${tokenA}/${tokenB}`)
      }
    } else {
      console.log('Pool does not have enough tokens for testing')
    }
  } catch (error) {
    console.error('Error getting price:', error)
  }

  console.log('\nCurve service test completed!')
}

async function testCurveIntegration() {
  console.log('\nTesting Curve Integration with Aggregators...\n')

  // Create provider after environment variables are loaded
  const provider = createProvider()

  // Get test tokens from a pool
  const poolAddresses = Object.keys(CURVE_POOL_METADATA)
  const testPoolAddress = poolAddresses.find(addr =>
    (CURVE_POOL_METADATA as any)[addr]?.tokens?.length >= 2
  ) || poolAddresses[0]

  if (!testPoolAddress) {
    console.log('No suitable Curve pools available for testing')
    return
  }

  const poolTokens = (CURVE_POOL_METADATA as any)[testPoolAddress].tokens
  if (!poolTokens || poolTokens.length < 2) {
    console.log('Pool does not have enough tokens for testing')
    return
  }

  const tokenA = poolTokens[0]
  const tokenB = poolTokens[1]

  // Test with PriceAggregator
  console.log('1. Testing PriceAggregator with Curve...')
  try {
    const { PriceAggregator } = await import('../services/price-aggregator')
    const priceAggregator = new PriceAggregator(provider)

    // Initialize Curve filtering
    priceAggregator.initializeCurvePoolFilter(CURVE_POOL_METADATA)

    // Test specific Curve pool
    console.log(`Testing price for ${tokenA}/${tokenB} on pool ${testPoolAddress}`)
    const curvePrice = await priceAggregator.getPriceFromDex(tokenA, tokenB, 'curve')
    if (curvePrice) {
      console.log('Curve price from aggregator:', curvePrice)
    } else {
      console.log('No Curve price found from aggregator')
    }
  } catch (error) {
    console.error('Error testing PriceAggregator:', error)
  }

  // Test with ReservesAggregator
  console.log('\n2. Testing ReservesAggregator with Curve...')
  try {
    const { ReservesAggregator } = await import('../services/reserves-aggregator')
    const reservesAggregator = new ReservesAggregator(provider)

    // Initialize Curve filtering
    reservesAggregator.initializeCurvePoolFilter(CURVE_POOL_METADATA)

    console.log(`Testing reserves for ${tokenA}/${tokenB} on pool ${testPoolAddress}`)
    const curveReserves = await reservesAggregator.getReservesFromDex(tokenA, tokenB, 'curve')
    if (curveReserves) {
      console.log('Curve reserves from aggregator:', curveReserves)
    } else {
      console.log('No Curve reserves found from aggregator')
    }
  } catch (error) {
    console.error('Error testing ReservesAggregator:', error)
  }

  // Test smart filtering with getAllReserves
  console.log('\n3. Testing smart filtering with getAllReserves...')
  try {
    const { ReservesAggregator } = await import('../services/reserves-aggregator')
    const reservesAggregator = new ReservesAggregator(provider)

    // Initialize Curve filtering
    reservesAggregator.initializeCurvePoolFilter(CURVE_POOL_METADATA)

    console.log(`Testing getAllReserves for ${tokenA}/${tokenB} (should use smart filtering)`)
    const allReserves = await reservesAggregator.getAllReserves(tokenA, tokenB)
    if (allReserves) {
      console.log('All reserves (with smart filtering):', {
        dex: allReserves.dex,
        pairAddress: allReserves.pairAddress,
        reserves: allReserves.reserves
      })
    } else {
      console.log('No reserves found with smart filtering')
    }
  } catch (error) {
    console.error('Error testing smart filtering:', error)
  }

  console.log('\nCurve integration test completed!')
}

async function main() {
  try {
    await testCurveService()
    await testCurveIntegration()
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
if (require.main === module) {
  main()
}

export { testCurveService, testCurveIntegration }
