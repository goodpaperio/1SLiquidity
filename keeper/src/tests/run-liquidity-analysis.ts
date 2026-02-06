import {
  runLiquidityAnalysis,
  runLiquidityAnalysisFromJson,
} from './liquidity-analysis'

async function main() {
  try {
    console.log('Starting liquidity analysis...')
    await runLiquidityAnalysisFromJson('src/tests/tokens-list-04-09-2025.json')
    // await runLiquidityAnalysisFromJson('src/tests/test-tokens.json')
    console.log('Liquidity analysis completed successfully!')
  } catch (error) {
    console.error('Error running liquidity analysis:', error)
    process.exit(1)
  }
}

main()
