/** DefiLlama coins API — free, no key, aggregated CEX+DEX prices. */

const DEFILLAMA_PRICES_URL = 'https://coins.llama.fi/prices/current'
const ETHEREUM_CHAIN = 'ethereum'
/** DefiLlama accepts long comma-separated lists; chunk to keep URLs reasonable. */
const BATCH_SIZE = 100

export function ethereumCoinId(address: string): string {
  return `${ETHEREUM_CHAIN}:${address.toLowerCase()}`
}

function addressFromCoinId(coinId: string): string | null {
  const prefix = `${ETHEREUM_CHAIN}:`
  if (!coinId.startsWith(prefix)) return null
  return coinId.slice(prefix.length)
}

interface DefiLlamaPriceEntry {
  price?: number
  symbol?: string
  timestamp?: number
}

interface DefiLlamaPricesResponse {
  coins?: Record<string, DefiLlamaPriceEntry>
}

async function fetchPriceBatch(coinIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  if (coinIds.length === 0) return prices

  const url = `${DEFILLAMA_PRICES_URL}/${coinIds.join(',')}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`DefiLlama price fetch failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as DefiLlamaPricesResponse
  for (const [coinId, entry] of Object.entries(data.coins ?? {})) {
    const price = entry.price
    if (typeof price !== 'number' || price <= 0) continue

    const address = addressFromCoinId(coinId)
    if (address) {
      prices.set(address, price)
    } else if (coinId === 'coingecko:ethereum') {
      // Native ETH — also map to WETH for callers using WETH address
      prices.set('coingecko:ethereum', price)
    } else if (coinId === 'coingecko:bitcoin') {
      prices.set('coingecko:bitcoin', price)
    }
  }

  return prices
}

/** USD prices keyed by lowercase Ethereum contract address. */
export async function fetchEthereumTokenPrices(
  addresses: string[]
): Promise<Map<string, number>> {
  const unique = [
    ...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean)),
  ]
  const prices = new Map<string, number>()

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    const coinIds = batch.map(ethereumCoinId)
    const batchPrices = await fetchPriceBatch(coinIds)
    for (const [addr, price] of batchPrices) {
      prices.set(addr, price)
    }
  }

  return prices
}

/** Spot ETH and BTC/USD via DefiLlama coingecko IDs. */
export async function fetchEthBtcUsd(): Promise<{
  ethUsd: number
  btcUsd: number
}> {
  const prices = await fetchPriceBatch(['coingecko:ethereum', 'coingecko:bitcoin'])
  const ethUsd = prices.get('coingecko:ethereum') ?? 0
  const btcUsd = prices.get('coingecko:bitcoin') ?? 0
  if (ethUsd <= 0 || btcUsd <= 0) {
    throw new Error('DefiLlama returned invalid ETH/BTC prices')
  }
  return { ethUsd, btcUsd }
}

/** Single-token convenience wrapper. */
export async function fetchEthereumTokenPrice(
  address: string
): Promise<number> {
  const prices = await fetchEthereumTokenPrices([address])
  return prices.get(address.toLowerCase()) ?? 0
}
