import { getTradeStatus, type TradeStatusInput } from '@/app/lib/utils/tradeStatus'

/**
 * Core stores `lastSweetSpot` as a countdown after each stream (see Core.executeStream:
 * plan sweetSpot is decremented before persisting). Remaining streams = latest value;
 * total = executions so far + remaining.
 *
 * When a trade is settled (COMPLETED / instasettle / cancel), subgraph status can
 * update before the last execution's lastSweetSpot hits 0 — avoid showing "2/3".
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

type StreamTrade = TradeStatusInput & {
  executions?: { lastSweetSpot?: string }[]
  lastSweetSpot?: string
}

function isStreamFinished(trade: StreamTrade): boolean {
  return getTradeStatus(trade) !== 'ongoing'
}

/** Remaining stream executions (0 when the trade has finished streaming). */
export function calculateRemainingStreams(trade: StreamTrade): number {
  if (isStreamFinished(trade)) return 0
  return getLatestLastSweetSpot(trade)
}

/** Total planned streams = completed executions + remaining countdown. */
export function calculateTotalStreams(trade: StreamTrade): number {
  const executed = trade.executions?.length ?? 0
  if (isStreamFinished(trade)) {
    return executed
  }
  const remaining = getLatestLastSweetSpot(trade)
  if (executed === 0 && remaining === 0) return 0
  return executed + remaining
}
