import type { Trade, TradeStatus } from '../graphql/types/trade'

/** Prefer subgraph `status`; fall back to legacy heuristics for older data. */
export type TradeStatusInput = {
  status?: Trade['status'] | string
  cancellations?: Trade['cancellations']
  instasettlements?: Trade['instasettlements']
  executions?: Trade['executions']
  lastSweetSpot?: string
}

export function getTradeStatus(
  trade: TradeStatusInput
): 'ongoing' | 'completed' | 'instasettled' | 'cancelled' | 'failed' {
  if (trade.status) {
    switch (trade.status) {
      case 'OPEN':
        return 'ongoing'
      case 'COMPLETED':
        return 'completed'
      case 'INSTASETTLED':
        return 'instasettled'
      case 'CANCELLED':
        return trade.cancellations?.[0]?.isAutocancelled ? 'failed' : 'cancelled'
      default:
        break
    }
  }

  const cancellation = trade.cancellations?.[0]
  if (cancellation) {
    return cancellation.isAutocancelled ? 'failed' : 'cancelled'
  }
  if ((trade.instasettlements?.length ?? 0) > 0) {
    return 'instasettled'
  }
  if (
    trade.executions?.some((exec) => exec.lastSweetSpot === '0') ||
    trade.lastSweetSpot === '0'
  ) {
    return 'completed'
  }
  return 'ongoing'
}

export function isTradeCompleted(trade: Trade): boolean {
  if (trade.status) {
    return trade.status !== 'OPEN'
  }
  return getTradeStatus(trade) !== 'ongoing'
}

export function isTradeInstasettled(trade: Trade): boolean {
  if (trade.status === 'INSTASETTLED') return true
  return (trade.instasettlements?.length ?? 0) > 0
}

export function isTradeCancelled(trade: Trade): boolean {
  if (trade.status === 'CANCELLED') return true
  return (trade.cancellations?.length ?? 0) > 0
}

export function isTradeOpen(trade: Trade): boolean {
  return !isTradeCompleted(trade)
}

export type { TradeStatus }
