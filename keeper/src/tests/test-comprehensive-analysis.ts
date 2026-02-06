import { analyzeTokenPairLiquidityComprehensive } from './liquidity-analysis'

async function testComprehensiveAnalysis() {
  console.log('🚀 Testing Comprehensive Liquidity Analysis...\n')

  // Example
  console.log('=== Testing Pair ===')
  const result1 = await analyzeTokenPairLiquidityComprehensive(
    '0x853d955aCEf822Db058eb8505911ED77F175b99e', // FRAX
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
  )

  if (result1.success) {
    console.log('✅ Analysis completed!')
    console.log(`Found ${result1.data!.dexes.length} DEXes with liquidity`)
    console.log(`Sweet spot: ${result1.data!.sweetSpot} streams`)
    console.log(`Best DEX: ${result1.data!.summary.bestDex}`)
    console.log(
      `Slippage savings: ${result1.data!.slippageAnalysis.percentageSavings.toFixed(
        3
      )}%`
    )
  } else {
    console.log('❌ Analysis failed:', result1.error)
  }

  console.log('\n' + '='.repeat(50) + '\n')
}

// Run the test
// if (require.main === module) {
//   testComprehensiveAnalysis().catch(console.error)
// }

testComprehensiveAnalysis()

// export { testComprehensiveAnalysis }
