interface PriceAccuracyResult {
  aToB: number // A→B accuracy percentage
  bToA: number // B→A accuracy percentage
  details: {
    aToBIndicative: number
    aToBBest: number
    bToAIndicative: number
    bToABest: number
    testSizeA: number
    testSizeB: number
  }
}

export function calculatePriceAccuracy(pair: any): PriceAccuracyResult | null {
  try {
    // Return mock values for now
    // Generate semi-random but consistent values based on pair address
    const hash = pair.tokenAAddress
      ? parseInt(pair.tokenAAddress.slice(2, 10), 16)
      : 0
    const aToBBase = 85 + (hash % 15) // 85-99%
    const bToABase = 70 + (hash % 25) // 70-94%

    return {
      aToB: aToBBase,
      bToA: bToABase,
      details: {
        aToBIndicative: 0,
        aToBBest: 0,
        bToAIndicative: 0,
        bToABest: 0,
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
