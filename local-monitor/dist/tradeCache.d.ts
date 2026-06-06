import { CachedTradeRecord, TradeCancelledEvent, TradeCompletedEvent, TradeCreatedEvent, TradeHistory, TradeInstasettledEvent, TradeStreamExecutedEvent } from "./types";
export interface ScannedEventBatch {
    createdEvents: TradeCreatedEvent[];
    executionEvents: TradeStreamExecutedEvent[];
    cancelledEvents: TradeCancelledEvent[];
    instasettledEvents: TradeInstasettledEvent[];
    completedEvents: TradeCompletedEvent[];
}
export type CompletionType = "executed" | "cancelled" | "instasettled" | "completed";
export interface TradeClassification {
    completionType: CompletionType;
    completionTime: number;
    finalAmountOut: bigint;
}
export declare function eventDedupeKey(transactionHash: string, logIndex: number | undefined): string;
/**
 * Merge newly scanned events into the trade cache (idempotent on overlap blocks).
 */
export declare function mergeEventsIntoCache(cache: Record<string, CachedTradeRecord>, batch: ScannedEventBatch): Record<string, CachedTradeRecord>;
export declare function classifyTrade(record: CachedTradeRecord): TradeClassification | null;
export interface BuildHistoryOptions {
    isTradeActive?: (tradeId: number) => Promise<boolean>;
    readAttempts?: (tradeId: number) => Promise<number | undefined>;
}
export declare function buildTradeHistoryFromCache(cache: Record<string, CachedTradeRecord>, options?: BuildHistoryOptions): Promise<TradeHistory>;
/**
 * Build cache from a full bootstrap scan (convenience wrapper).
 */
export declare function buildCacheFromEvents(batch: ScannedEventBatch): Record<string, CachedTradeRecord>;
//# sourceMappingURL=tradeCache.d.ts.map