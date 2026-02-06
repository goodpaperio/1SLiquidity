// Test file for Balancer calculator - can be removed after testing
import { DexCalculatorFactory } from './calculators'
import {
  isBalancerDex,
  extractPoolAddressFromDexType,
} from '../config/balancer-config'

export const testBalancerIntegration = () => {
  console.log('🧪 Testing Balancer Integration...')

  // Test utility functions
  const balancerDexType = 'balancer-0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8' // USDC/WETH 50/50
  const balancerDAIWETHDexType =
    'balancer-0x0b09dea16768f0799065c475be02919503cb2a35' // DAI/WETH 60/40
  const nonBalancerDexType = 'uniswap-v2'

  console.log('isBalancerDex tests:')
  console.log(`  ${balancerDexType}: ${isBalancerDex(balancerDexType)}`) // Should be true
  console.log(
    `  ${balancerDAIWETHDexType}: ${isBalancerDex(balancerDAIWETHDexType)}`
  ) // Should be true
  console.log(`  ${nonBalancerDexType}: ${isBalancerDex(nonBalancerDexType)}`) // Should be false

  console.log('extractPoolAddressFromDexType tests:')
  console.log(
    `  ${balancerDexType}: ${extractPoolAddressFromDexType(balancerDexType)}`
  ) // Should return USDC/WETH pool address
  console.log(
    `  ${balancerDAIWETHDexType}: ${extractPoolAddressFromDexType(
      balancerDAIWETHDexType
    )}`
  ) // Should return DAI/WETH pool address
  console.log(
    `  ${nonBalancerDexType}: ${extractPoolAddressFromDexType(
      nonBalancerDexType
    )}`
  ) // Should return null

  // Test factory
  try {
    const balancerCalculator = DexCalculatorFactory.createCalculator(
      balancerDexType,
      undefined,
      '1'
    )
    console.log('✅ Balancer USDC/WETH calculator created successfully')
    console.log(`   Fee: ${balancerCalculator.getExchangeFee()}%`)
  } catch (error) {
    console.error('❌ Error creating Balancer USDC/WETH calculator:', error)
  }

  try {
    const balancerDAIWETHCalculator = DexCalculatorFactory.createCalculator(
      balancerDAIWETHDexType,
      undefined,
      '1'
    )
    console.log('✅ Balancer DAI/WETH calculator created successfully')
    console.log(`   Fee: ${balancerDAIWETHCalculator.getExchangeFee()}%`)
  } catch (error) {
    console.error('❌ Error creating Balancer DAI/WETH calculator:', error)
  }

  // Test other DEXes still work
  try {
    const uniswapCalculator = DexCalculatorFactory.createCalculator(
      'uniswap-v2',
      undefined,
      '1'
    )
    console.log('✅ Uniswap V2 calculator still works')
    console.log(`   Fee: ${uniswapCalculator.getExchangeFee()}%`)
  } catch (error) {
    console.error('❌ Error creating Uniswap V2 calculator:', error)
  }

  try {
    const curveCalculator = DexCalculatorFactory.createCalculator(
      'curve-0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
      undefined,
      '1'
    )
    console.log('✅ Curve calculator still works')
    console.log(`   Fee: ${curveCalculator.getExchangeFee()}%`)
  } catch (error) {
    console.error('❌ Error creating Curve calculator:', error)
  }

  console.log('🎉 Balancer integration test complete')
}

// Sample function to test with actual token data (when you get Balancer reserves from backend)
export const simulateBalancerQuote = async () => {
  console.log('🔄 Simulating Balancer quote calculation...')

  // Example: This is what you'd expect from your backend for a Balancer pool
  const mockBalancerReserveData = {
    dex: 'balancer-0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8', // USDC/WETH 50/50
    pairAddress: '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8',
    reserves: {
      token0: '1000000000000', // 1M USDC (6 decimals)
      token1: '500000000000000000000', // 500 WETH (18 decimals)
    },
    decimals: {
      token0: 6, // USDC decimals
      token1: 18, // WETH decimals
    },
    token0Address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    token1Address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    timestamp: Date.now(),
  }

  try {
    const calculator = DexCalculatorFactory.createCalculator(
      mockBalancerReserveData.dex
    )

    // Test quote calculation (this will use simplified math for now)
    console.log('📊 Testing quote for 1000 USDC → WETH')
    console.log('⚠️  Note: Using simplified Balancer math for demo')

    const quote = await calculator.calculateOutputAmountDirect(
      '1000', // 1000 USDC
      mockBalancerReserveData.token0Address!, // USDC
      mockBalancerReserveData.token1Address!, // WETH
      6, // USDC decimals
      18 // WETH decimals
    )

    console.log(`✅ Quote result: ${quote} WETH for 1000 USDC`)
  } catch (error) {
    console.log('⚠️  Error in calculation:', (error as Error).message)
  }
}
