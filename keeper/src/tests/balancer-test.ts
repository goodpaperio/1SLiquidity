import { createProvider } from '../utils/provider'
import { ReservesAggregator } from '../services/reserves-aggregator'
import { PriceAggregator } from '../services/price-aggregator'
import { BALANCER_POOL_METADATA } from '../config/dex'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from keeper/.env
const envPath = path.join(__dirname, '../../.env')
dotenv.config({ path: envPath })

async function testBalancerSubgraphIntegration() {
  console.log('Testing Balancer Subgraph Integration...\n')

  // Create provider after environment variables are loaded
  const provider = createProvider()

  // Test with ReservesAggregator
  console.log('1. Testing ReservesAggregator with Balancer subgraph data...')
  try {
    const reservesAggregator = new ReservesAggregator(provider)

    // Initialize Balancer smart filtering
    reservesAggregator.initializeBalancerPoolFilter(BALANCER_POOL_METADATA)

    const wbtcAddress = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' // WBTC
    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH

    console.log(`Testing reserves for WBTC/WETH (should use subgraph data)`)
    const reserves = await reservesAggregator.getReservesFromDex(wbtcAddress, wethAddress, 'balancer')
    if (reserves) {
      console.log('✓ Balancer reserves from subgraph:', reserves)
    } else {
      console.log('✗ No Balancer reserves found from subgraph')
    }

    // Test getAllReserves
    console.log('\n2. Testing getAllReserves with Balancer subgraph data...')
    const allReserves = await reservesAggregator.getAllReserves(wbtcAddress, wethAddress)
    if (allReserves) {
      console.log('✓ All reserves (with subgraph data):', {
        dex: allReserves.dex,
        pairAddress: allReserves.pairAddress,
        reserves: allReserves.reserves
      })
    } else {
      console.log('✗ No reserves found with subgraph data')
    }
  } catch (error) {
    console.error('✗ Error testing ReservesAggregator:', error)
  }

  // Test with PriceAggregator
  console.log('\n3. Testing PriceAggregator with Balancer subgraph data...')
  try {
    const priceAggregator = new PriceAggregator(provider)

    // Initialize Balancer smart filtering
    priceAggregator.initializeBalancerPoolFilter(BALANCER_POOL_METADATA)

    const wbtcAddress = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' // WBTC
    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH

    console.log(`Testing price for WBTC/WETH (should use subgraph data)`)
    const price = await priceAggregator.getPriceFromDex(wbtcAddress, wethAddress, 'balancer')
    if (price) {
      console.log('✓ Balancer price from subgraph:', price)
    } else {
      console.log('✗ No Balancer price found from subgraph')
    }

    // Test getAllPrices
    console.log('\n4. Testing getAllPrices with Balancer subgraph data...')
    const priceResults = await priceAggregator.getAllPrices(wbtcAddress, wethAddress)
    if (priceResults && priceResults.allPrices.length > 0) {
      console.log('✓ All prices (with subgraph data):', priceResults.allPrices)
      console.log('✓ Other Curve pools:', priceResults.otherCurvePools)
      console.log('✓ Other Balancer pools:', priceResults.otherBalancerPools)
    } else {
      console.log('✗ No prices found with subgraph data')
    }
  } catch (error) {
    console.error('✗ Error testing PriceAggregator:', error)
  }

  console.log('\nBalancer subgraph integration test completed!')
}

// Run tests
async function main() {
  try {
    await testBalancerSubgraphIntegration()
  } catch (error) {
    console.error('Test failed:', error)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { testBalancerSubgraphIntegration }
