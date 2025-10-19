interface PriceAccuracyResult {
  aToB: number // A→B accuracy percentage (with DECA)
  bToA: number // B→A accuracy percentage (without DECA)
  details: {
    aToBIndicative: number
    aToBBest: number
    bToAIndicative: number
    bToABest: number
    testSizeA: number
    testSizeB: number
  }
}

/**
 * Calculate price accuracy from API data
 * The API provides priceAccuracyDECA and priceAccuracyNODECA as ratios
 * We convert these to accuracy percentages:
 * - A ratio close to 1.0 means high accuracy
 * - We calculate: 100 - abs((ratio - 1.0) * 100)
 */
export function calculatePriceAccuracy(pair: any): PriceAccuracyResult | null {
  try {
    // Check if the API data is available
    if (
      typeof pair.priceAccuracyDECA !== 'number' ||
      typeof pair.priceAccuracyNODECA !== 'number'
    ) {
      return null
    }

    const aToBAccuracy = 100 - Math.abs((pair.priceAccuracyDECA - 1.0) * 100)
    const bToAAccuracy = 100 - Math.abs((pair.priceAccuracyNODECA - 1.0) * 100)

    // Ensure values are within reasonable bounds (0-100)
    const clampedAToB = Math.max(0, Math.min(100, aToBAccuracy))
    const clampedBToA = Math.max(0, Math.min(100, bToAAccuracy))

    return {
      aToB: clampedAToB,
      bToA: clampedBToA,
      details: {
        aToBIndicative: pair.priceAccuracyDECA,
        aToBBest: 1.0,
        bToAIndicative: pair.priceAccuracyNODECA,
        bToABest: 1.0,
        testSizeA: 0,
        testSizeB: 0,
      },
    }
  } catch (error) {
    console.error('Error calculating price accuracy:', error)
    return null
  }
}

/**
 * Formats accuracy percentage for display
 */
export function formatAccuracy(accuracy: number): string {
  return `${accuracy.toFixed(0)}%`
}
