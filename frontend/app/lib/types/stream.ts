export interface Stream {
  id: string
  fromToken: {
    symbol: string
    amount: number
    icon: string
  }
  toToken: {
    symbol: string
    estimatedAmount: number
    icon: string
  }
  progress: {
    completed: number
    total: number
  }
  timeRemaining: number
  isInstasettle: boolean
  limit?: {
    price: number
    token: string
  }
}
