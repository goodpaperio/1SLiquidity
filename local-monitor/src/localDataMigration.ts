import {
  LOCAL_DATA_SCHEMA_VERSION,
  LocalData,
  TradeMetadata,
} from "./types";

export function createEmptyLocalData(contractAddress: string): LocalData {
  return {
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
    lastScannedBlock: 0,
    outstandingTrades: [],
    tradeCache: {},
    lastUpdated: 0,
    contractAddress,
  };
}

/**
 * Normalize legacy localData.json (schema v1 / lastRun) into schema v2.
 */
export function migrateLocalData(
  raw: Partial<LocalData> & { lastRun?: number },
  contractAddress: string
): LocalData {
  if (
    raw.contractAddress &&
    raw.contractAddress.toLowerCase() !== contractAddress.toLowerCase()
  ) {
    return createEmptyLocalData(contractAddress);
  }

  const lastScannedBlock = raw.lastScannedBlock ?? raw.lastRun ?? 0;

  return {
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
    lastScannedBlock,
    outstandingTrades: raw.outstandingTrades ?? [],
    tradeCache: raw.tradeCache ?? {},
    lastUpdated: raw.lastUpdated ?? 0,
    contractAddress,
  };
}

export function hasUsableTradeCache(data: LocalData): boolean {
  return Boolean(data.tradeCache && Object.keys(data.tradeCache).length > 0);
}

export function outstandingTradesFromMetadata(
  ongoingTrades: {
    tradeId: string;
    tokenIn: string;
    tokenOut: string;
    pair: string;
    owner: string;
    isInstasettlable: boolean;
    onlyInstasettle: boolean;
    lastSweetSpot: string;
  }[],
  pairIdFor: (tokenIn: string, tokenOut: string) => string,
  updatedAt: number
): TradeMetadata[] {
  return ongoingTrades.map((trade) => ({
    tradeId: parseInt(trade.tradeId, 10),
    pairId: pairIdFor(trade.tokenIn, trade.tokenOut),
    lastSweetSpot: parseInt(trade.lastSweetSpot, 10),
    tokenIn: trade.tokenIn,
    tokenOut: trade.tokenOut,
    pair: trade.pair,
    owner: trade.owner,
    isInstasettlable: trade.isInstasettlable,
    onlyInstasettle: trade.onlyInstasettle,
    lastUpdated: updatedAt,
  }));
}
