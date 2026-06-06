/**
 * Core stores `lastSweetSpot` as a countdown after each stream (see Core.executeStream:
 * plan sweetSpot is decremented before persisting). Remaining streams = latest value;
 * total = executions so far + remaining.
 */

export function getLatestLastSweetSpot(trade: {
  executions?: { lastSweetSpot?: string }[]
  lastSweetSpot?: string
}): number {
  if (trade.executions?.length) {
    const last = trade.executions[trade.executions.length - 1]
    const spot = Number(last?.lastSweetSpot ?? 0)
    return Number.isFinite(spot) ? spot : 0
  }
  const spot = Number(trade?.lastSweetSpot ?? 0)
  return Number.isFinite(spot) ? spot : 0
}

/** Remaining stream executions (0 when the trade has finished streaming). */
export function calculateRemainingStreams(trade: {
  executions?: { lastSweetSpot?: string }[]
  lastSweetSpot?: string
}): number {
  return getLatestLastSweetSpot(trade)
}

/** Total planned streams = completed executions + remaining countdown. */
export function calculateTotalStreams(trade: {
  executions?: { lastSweetSpot?: string }[]
  lastSweetSpot?: string
}): number {
  const executed = trade.executions?.length ?? 0
  const remaining = getLatestLastSweetSpot(trade)
  if (executed === 0 && remaining === 0) return 0
  return executed + remaining
}
