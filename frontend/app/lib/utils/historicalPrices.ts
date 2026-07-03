import type { TradeDisplayInput } from '@/app/lib/utils/tradeDisplay'
import { WETH_ADDRESS } from '@/app/lib/utils/knownTradeTokens'
import { getTradeStatus } from '@/app/lib/utils/tradeStatus'

const DEFILLAMA_CHAIN = 'ethereum'

export type TradeWithSettlementMeta = TradeDisplayInput & {
  id?: string
  tokenIn: string
  tokenOut: string
}

function parseUnixSeconds(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Unix seconds when the trade finished streaming / settled (for historical USD). */
export function getTradeSettlementTimestamp(
  trade: TradeWithSettlementMeta
): number | null {
  const fromCompletion = parseUnixSeconds(trade.completions?.[0]?.timestamp)
  if (fromCompletion) return fromCompletion

  const fromInstasettle = parseUnixSeconds(
    trade.instasettlements?.[0]?.timestamp
  )
  if (fromInstasettle) return fromInstasettle

  const fromCancel = parseUnixSeconds(trade.cancellations?.[0]?.timestamp)
  if (fromCancel) return fromCancel

  const executions = trade.executions ?? []
  if (executions.length > 0) {
    const last = executions[executions.length - 1]
    const fromExec = parseUnixSeconds(last?.timestamp)
    if (fromExec) return fromExec
  }

  return parseUnixSeconds(trade.createdAt)
}

export function isSettledTradeForHistoricalPricing(
  trade: TradeDisplayInput
): boolean {
  const status = getTradeStatus(trade)
  return (
    status === 'completed' ||
    status === 'instasettled' ||
    status === 'cancelled'
  )
}

function defillamaCoinId(address: string): string {
  return `${DEFILLAMA_CHAIN}:${address.toLowerCase()}`
}

/**
 * Token USD prices at a past unix timestamp (DefiLlama).
 * Returns map of lowercase address → usd price.
 */
export async function fetchHistoricalTokenPrices(
  unixSeconds: number,
  addresses: string[]
): Promise<Record<string, number>> {
  const unique = [
    ...new Set(
      addresses
        .filter(Boolean)
        .map((a) => a.toLowerCase())
        .filter((a) => a.startsWith('0x'))
    ),
  ]
  if (unique.length === 0 || unixSeconds <= 0) return {}

  const coins = unique.map(defillamaCoinId).join(',')
  const url = `https://coins.llama.fi/prices/historical/${unixSeconds}/${coins}`

  try {
    const res = await fetch(url)
    if (!res.ok) return {}

    const data = (await res.json()) as {
      coins?: Record<string, { price?: number }>
    }

    const out: Record<string, number> = {}
    for (const addr of unique) {
      const key = defillamaCoinId(addr)
      const price = Number(data.coins?.[key]?.price ?? 0)
      if (Number.isFinite(price) && price > 0) {
        out[addr] = price
      }
    }

    // WETH alias
    if (out[WETH_ADDRESS] && !unique.includes(WETH_ADDRESS)) {
      out[WETH_ADDRESS] = out[WETH_ADDRESS]
    }

    return out
  } catch {
    return {}
  }
}

export type SettlementPriceBatch = {
  timestamp: number
  addresses: string[]
}

/** Group settled trades into DefiLlama batch requests by settlement timestamp. */
export function buildSettlementPriceBatches(
  trades: TradeWithSettlementMeta[]
): SettlementPriceBatch[] {
  const byTimestamp = new Map<number, Set<string>>()

  for (const trade of trades) {
    if (!isSettledTradeForHistoricalPricing(trade)) continue

    const ts = getTradeSettlementTimestamp(trade)
    if (!ts) continue

    if (!byTimestamp.has(ts)) {
      byTimestamp.set(ts, new Set())
    }
    const set = byTimestamp.get(ts)!
    if (trade.tokenIn) set.add(trade.tokenIn.toLowerCase())
    if (trade.tokenOut) set.add(trade.tokenOut.toLowerCase())
  }

  return [...byTimestamp.entries()].map(([timestamp, addressSet]) => ({
    timestamp,
    addresses: [...addressSet],
  }))
}

/** tradeId → { [tokenAddress]: usdPrice } */
export function mapSettlementPricesToTrades(
  trades: TradeWithSettlementMeta[],
  pricesByTimestamp: Map<number, Record<string, number>>
): Map<string, Record<string, number>> {
  const result = new Map<string, Record<string, number>>()

  for (const trade of trades) {
    if (!trade.id || !isSettledTradeForHistoricalPricing(trade)) continue

    const ts = getTradeSettlementTimestamp(trade)
    if (!ts) continue

    const prices = pricesByTimestamp.get(ts)
    if (!prices) continue

    const tradePrices: Record<string, number> = {}
    const inLower = trade.tokenIn?.toLowerCase()
    const outLower = trade.tokenOut?.toLowerCase()
    if (inLower && prices[inLower] > 0) tradePrices[inLower] = prices[inLower]
    if (outLower && prices[outLower] > 0) tradePrices[outLower] = prices[outLower]

    if (Object.keys(tradePrices).length > 0) {
      result.set(trade.id, tradePrices)
    }
  }

  return result
}
