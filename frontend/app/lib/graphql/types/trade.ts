export interface Execution {
  amountIn: string
  cumulativeGasEntailed: string
  id: string
  lastSweetSpot: string
  timestamp: string
  realisedAmountOut: string
}

export interface Cancellation {
  id: string
  timestamp: string
  isAutocancelled: boolean
}

export interface Settlement {
  id: string
  settler: string
  totalAmountIn: string
  totalAmountOut: string
  totalFees: string
  timestamp: string
}

export interface Trade {
  amountIn: string
  amountRemaining: string
  createdAt: string
  instasettleBps: string
  isInstasettlable: boolean
  lastSweetSpot: string
  minAmountOut: string
  tokenIn: string
  tokenOut: string
  tradeId: string
  user: string
  realisedAmountOut: string
  id: string
  executions: Execution[]
  // Calculated fields
  effectivePrice?: number
  networkFee?: number
  amountOutSavings?: number
  totalSavings?: number
  amountInUsd?: number
  onlyInstasettle?: boolean
  tokenInDetails?: any // Using any for now since we don't have the token type here
  tokenOutDetails?: any // Using any for now since we don't have the token type here
  cancellations: Cancellation[]
  settlements: Settlement[]
}

export interface TradesResponse {
  trades: Trade[]
}
