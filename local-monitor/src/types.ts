export interface Trade {
  owner: string;
  attempts: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountRemaining: string;
  targetAmountOut: string;
  realisedAmountOut: string;
  tradeId: string;
  instasettleBps: string;
  lastSweetSpot: string;
  isInstasettlable: boolean;
  usePriceBased: boolean;
}

export interface TradeDisplay {
  tradeId: string;
  pair: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountRemaining: string;
  targetAmountOut: string;
  realisedAmountOut: string;
  progress: string;
  isInstasettlable: boolean;
  lastSweetSpot: string;
  attempts: number;
  owner: string;
}

export interface MonitorResult {
  totalTrades: number;
  activeTrades: TradeDisplay[];
  lastTradeId: string;
}

// Event interfaces for historical analysis
export interface TradeCreatedEvent {
  tradeId: number;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountRemaining: string;
  minAmountOut: string;
  realisedAmountOut: string;
  isInstasettlable: boolean;
  instasettleBps: number;
  lastSweetSpot: number;
  usePriceBased: boolean;
  onlyInstasettle: boolean;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TradeStreamExecutedEvent {
  tradeId: number;
  amountIn: string;
  realisedAmountOut: string;
  lastSweetSpot: number;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TradeCancelledEvent {
  tradeId: number;
  amountRemaining: string;
  realisedAmountOut: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TradeInstasettledEvent {
  tradeId: number;
  settler: string;
  totalAmountIn: string;
  totalAmountOut: string;
  totalFees: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TradeCompletedEvent {
  tradeId: number;
  finalRealisedAmountOut: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface CompletedTrade {
  tradeId: number;
  pair: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  finalAmountOut: string;
  executionCount: number;
  completionTime: number;
  completionType: "executed" | "cancelled" | "instasettled" | "completed";
  owner: string;
  totalExecutions: number;
  finalProgress: number;
}

export interface TradeHistory {
  completedTrades: CompletedTrade[];
  ongoingTrades: TradeDisplay[];
  totalTrades: number;
  completionRate: number;
}

// Local data structure for caching
export interface TradeMetadata {
  tradeId: number;
  pairId: string;
  lastSweetSpot: number;
  tokenIn: string;
  tokenOut: string;
  pair: string;
  owner: string;
  isInstasettlable: boolean;
  lastUpdated: number; // timestamp
}

export interface LocalData {
  lastRun: number; // block number of last run
  outstandingTrades: TradeMetadata[];
  lastUpdated: number; // timestamp
  contractAddress?: string; // Core contract address (added for version validation)
}
