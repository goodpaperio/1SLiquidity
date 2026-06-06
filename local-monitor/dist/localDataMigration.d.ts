import { LocalData, TradeMetadata } from "./types";
export declare function createEmptyLocalData(contractAddress: string): LocalData;
/**
 * Normalize legacy localData.json (schema v1 / lastRun) into schema v2.
 */
export declare function migrateLocalData(raw: Partial<LocalData> & {
    lastRun?: number;
}, contractAddress: string): LocalData;
export declare function hasUsableTradeCache(data: LocalData): boolean;
export declare function outstandingTradesFromMetadata(ongoingTrades: {
    tradeId: string;
    tokenIn: string;
    tokenOut: string;
    pair: string;
    owner: string;
    isInstasettlable: boolean;
    onlyInstasettle: boolean;
    lastSweetSpot: string;
}[], pairIdFor: (tokenIn: string, tokenOut: string) => string, updatedAt: number): TradeMetadata[];
//# sourceMappingURL=localDataMigration.d.ts.map