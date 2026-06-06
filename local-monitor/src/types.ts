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
  onlyInstasettle: boolean;
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
  onlyInstasettle: boolean;
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
  logIndex?: number;
  timestamp: number;
}

export interface TradeStreamExecutedEvent {
  tradeId: number;
  amountIn: string;
  realisedAmountOut: string;
  lastSweetSpot: number;
  blockNumber: number;
  transactionHash: string;
  logIndex?: number;
  timestamp: number;
}

export interface TradeCancelledEvent {
  isAutocancelled: boolean;
  tradeId: number;
  amountRemaining: string;
  realisedAmountOut: string;
  blockNumber: number;
  transactionHash: string;
  logIndex?: number;
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
  logIndex?: number;
  timestamp: number;
}

export interface TradeCompletedEvent {
  tradeId: number;
  finalRealisedAmountOut: string;
  blockNumber: number;
  transactionHash: string;
  logIndex?: number;
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
  onlyInstasettle: boolean;
  lastUpdated: number; // timestamp
}

export interface CachedTradeRecord {
  tradeId: number;
  created: TradeCreatedEvent;
  executions: TradeStreamExecutedEvent[];
  cancelled?: TradeCancelledEvent;
  instasettled?: TradeInstasettledEvent;
  completed?: TradeCompletedEvent;
}

export const LOCAL_DATA_SCHEMA_VERSION = 2;

export interface LocalData {
  schemaVersion?: number;
  /** @deprecated use lastScannedBlock */
  lastRun?: number;
  lastScannedBlock: number;
  outstandingTrades: TradeMetadata[];
  tradeCache?: Record<string, CachedTradeRecord>;
  lastUpdated: number;
  contractAddress?: string;
}

export interface StreamFeesTakenEvent {
  bot: string;
  token: string;
  protocolFee: string;
  botFee: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface InstasettleFeeTakenEvent {
  tradeId: number;
  settler: string;
  token: string;
  protocolFee: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface RunStats {
  runNumber: number;
  timestamp: number;
  successCount: number;
  failCount: number;
  gasUsed: string;
  totalGasCostETH: string;
  totalGasCostUSD: number;
  feesByToken: {
    [tokenAddress: string]: {
      symbol: string;
      botFee: string;
      protocolFee: string;
      botFeeUSD: number;
      protocolFeeUSD: number;
    };
  };
  totalBotFeesUSD: number;
  totalProtocolFeesUSD: number;
  netProfitUSD: number;
  streamDetails: RunStreamDetail[];
  tradeRollups: RunTradeRollup[];
}

export interface RunStreamDetail {
  tradeId: number;
  pair: string;
  amountIn: string;
  amountOut: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  lastSweetSpot: number;
  transactionHash: string;
}

export interface RunTradeRollup {
  tradeId: number;
  pair: string;
  streams: number;
  totalAmountIn: string;
  totalAmountOut: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
}
