/**
 * Calculate remaining streams from a trade's executions array
 * @param trade Trade object containing executions and lastSweetSpot
 * @returns Number of remaining streams
 */
export function calculateRemainingStreams(trade: {
  executions?: any[]
  lastSweetSpot?: string
}): number {
  if (!trade.executions || trade.executions.length === 0) {
    return Number(trade?.lastSweetSpot) || 0
  }

  const lastSweetSpots = trade.executions
    .map((execution) => Number(execution.lastSweetSpot))
    .filter((spot) => !isNaN(spot))

  if (lastSweetSpots.length === 0) {
    return Number(trade?.lastSweetSpot) || 0
  }

  const maxSweetSpot = Math.max(...lastSweetSpots)
  return maxSweetSpot + 1
}
