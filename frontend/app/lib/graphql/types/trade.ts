export type TradeStatus =
  | 'OPEN'
  | 'COMPLETED'
  | 'INSTASETTLED'
  | 'CANCELLED'

export interface Execution {
  amountIn: string
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

export interface Instasettlement {
  id: string
  settler: string
  totalAmountIn: string
  totalAmountOut: string
  totalFees: string
  timestamp: string
}

export interface Completion {
  id: string
  timestamp: string
  finalRealisedAmountOut: string
}

export interface AttemptEvent {
  id: string
  attempts: number
  timestamp: string
}

export interface StreamFee {
  id: string
  bot: string
  token: string
  protocolFee: string
  botFee: string
  timestamp: string
}

export interface InstasettleFee {
  id: string
  settler: string
  token: string
  protocolFee: string
  timestamp: string
}

export interface Trade {
  amountIn: string
  amountRemaining: string
  createdAt: string
  updatedAt: string
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
  onlyInstasettle?: boolean
  usePriceBased: boolean
  attempts: number
  status: TradeStatus
  executions: Execution[]
  cancellations: Cancellation[]
  instasettlements: Instasettlement[]
  completions: Completion[]
  attemptEvents: AttemptEvent[]
  streamFees: StreamFee[]
  instasettleFees: InstasettleFee[]
  // Calculated fields
  effectivePrice?: number
  networkFee?: number
  amountOutSavings?: number
  totalSavings?: number
  amountInUsd?: number
  tokenInDetails?: any
  tokenOutDetails?: any
}

export interface TradesResponse {
  trades: Trade[]
}
