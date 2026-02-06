// Test file for Curve calculator - can be removed after testing
import { DexCalculatorFactory } from './calculators'
import {
  isCurveDex,
  extractPoolAddressFromDexType,
} from '../config/curve-config'

export const testCurveIntegration = () => {
  console.log('🧪 Testing Curve Integration...')

  // Test utility functions
  const curveDexType = 'curve-0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7' // 3pool
  const curveHBTCDexType = 'curve-0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F' // hBTC pool
  const nonCurveDexType = 'uniswap-v2'

  console.log('isCurveDex tests:')
  console.log(`  ${curveDexType}: ${isCurveDex(curveDexType)}`) // Should be true
  console.log(`  ${curveHBTCDexType}: ${isCurveDex(curveHBTCDexType)}`) // Should be true
  console.log(`  ${nonCurveDexType}: ${isCurveDex(nonCurveDexType)}`) // Should be false

  console.log('extractPoolAddressFromDexType tests:')
  console.log(
    `  ${curveDexType}: ${extractPoolAddressFromDexType(curveDexType)}`
  ) // Should return 3pool address
  console.log(
    `  ${curveHBTCDexType}: ${extractPoolAddressFromDexType(curveHBTCDexType)}`
  ) // Should return hBTC pool address
  console.log(
    `  ${nonCurveDexType}: ${extractPoolAddressFromDexType(nonCurveDexType)}`
  ) // Should return null

  // Test factory
  try {
    const curveCalculator = DexCalculatorFactory.createCalculator(
      curveDexType,
      undefined,
      '1'
    )
    console.log('✅ Curve 3pool calculator created successfully')
    console.log(`   Fee: ${curveCalculator.getExchangeFee()}%`)
  } catch (error) {
    console.error('❌ Error creating Curve 3pool calculator:', error)
  }

  try {
    const curveHBTCCalculator = DexCalculatorFactory.createCalculator(
      curveHBTCDexType,
      undefined,
      '1'
    )
    console.log('✅ Curve hBTC calculator created successfully')
    console.log(`   Fee: ${curveHBTCCalculator.getExchangeFee()}%`)
  } catch (error) {
    console.error('❌ Error creating Curve hBTC calculator:', error)
  }

  // Test Uniswap V2 still works
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

  console.log('🎉 Curve integration test complete')
}

// Sample function to test with actual token data (when you get Curve reserves from backend)
export const simulateCurveQuote = async () => {
  console.log('🔄 Simulating Curve quote calculation...')

  // Example: This is what you'd expect from your backend for a Curve pool
  const mockCurveReserveData = {
    dex: 'curve-0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7', // 3pool
    pairAddress: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    reserves: {
      token0: '1000000000000000000000000', // 1M DAI (in wei)
      token1: '1000000000000000000000000', // 1M USDC (in wei, but USDC has 6 decimals)
    },
    decimals: {
      token0: 18, // DAI decimals
      token1: 6, // USDC decimals
    },
    token0Address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    token1Address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    timestamp: Date.now(),
  }

  try {
    const calculator = DexCalculatorFactory.createCalculator(
      mockCurveReserveData.dex
    )

    // Test quote calculation (this would normally call the contract)
    console.log('📊 Testing quote for 1000 DAI → USDC')
    console.log('⚠️  Note: This will fail without a real blockchain connection')

    const quote = await calculator.calculateOutputAmountDirect(
      '1000', // 1000 DAI
      mockCurveReserveData.token0Address!, // DAI
      mockCurveReserveData.token1Address!, // USDC
      18, // DAI decimals
      6 // USDC decimals
    )

    console.log(`✅ Quote result: ${quote} USDC for 1000 DAI`)
  } catch (error) {
    console.log(
      '⚠️  Expected error (no blockchain connection):',
      (error as Error).message
    )
  }
}
