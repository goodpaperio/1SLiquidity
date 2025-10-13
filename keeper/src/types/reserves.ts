export interface ReserveResult {
  dex: string
  pairAddress: string
  reserves: {
    token0: string
    token1: string
  }
  decimals: {
    token0: number
    token1: number
  }
  price: number
  timestamp: number
  // Optional fields for aggregated data (only present in getAllReserves)
  totalReserves?: {
    totalReserveTokenAWei: string
    totalReserveTokenBWei: string
    totalReserveTokenA: string
    totalReserveTokenB: string
  }
  otherDexes?: {
    dex: string
    pairAddress: string
    reserves: {
      token0: string
      token1: string
    }
    price: number
    decimals: {
      token0: number
      token1: number
    }
    timestamp: number
  }[]
}
