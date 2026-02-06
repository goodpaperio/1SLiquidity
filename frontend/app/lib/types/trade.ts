export interface Trade {
  invoice: string
  action: string
  amount1: string
  amount2: string
  savings: string
  duration: string
  bps: string
  isOwner: boolean
  timestamp: number // Unix timestamp in milliseconds
}

export interface ChartDataPoint {
  volume: number
  streams: number
  trade: Trade
}
