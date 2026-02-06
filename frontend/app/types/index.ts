export interface Token {
  token_address?: string
  symbol?: string
  decimals?: number
  usd_price?: number
}

export interface ReserveData {
  reserves: {
    token0: string
    token1: string
  }
  decimals: {
    token0: number
    token1: number
  }
  token0Address: string
  token1Address: string
  token0Decimals: number
  token1Decimals: number
  dex: string
  pairAddress: string
  timestamp: number
}
