import { getTokenDecimals } from "./price-fetcher";
import {
  calculateProgress,
  formatTokenAmount,
  getTokenSymbol,
} from "./tradeFormat";
import {
  CachedTradeRecord,
  CompletedTrade,
  TradeCancelledEvent,
  TradeCompletedEvent,
  TradeCreatedEvent,
  TradeDisplay,
  TradeHistory,
  TradeInstasettledEvent,
  TradeStreamExecutedEvent,
} from "./types";

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

export function eventDedupeKey(
  transactionHash: string,
  logIndex: number | undefined
): string {
  return `${transactionHash.toLowerCase()}:${logIndex ?? 0}`;
}

function emptyRecord(tradeId: number, created: TradeCreatedEvent): CachedTradeRecord {
  return {
    tradeId,
    created,
    executions: [],
  };
}

function ensureRecord(
  cache: Record<string, CachedTradeRecord>,
  tradeId: number,
  created?: TradeCreatedEvent
): CachedTradeRecord {
  const key = String(tradeId);
  if (!cache[key]) {
    if (!created) {
      throw new Error(`Cannot create cache entry for trade ${tradeId} without TradeCreated`);
    }
    cache[key] = emptyRecord(tradeId, created);
  } else if (created) {
    cache[key].created = created;
  }
  return cache[key];
}

function appendUniqueExecution(
  record: CachedTradeRecord,
  execution: TradeStreamExecutedEvent,
  seenKeys: Set<string>
): void {
  const key = eventDedupeKey(execution.transactionHash, execution.logIndex);
  if (seenKeys.has(key)) return;
  seenKeys.add(key);
  record.executions.push(execution);
  record.executions.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
    return (a.logIndex ?? 0) - (b.logIndex ?? 0);
  });
}

function executionSeenKeys(record: CachedTradeRecord): Set<string> {
  return new Set(
    record.executions.map((e) => eventDedupeKey(e.transactionHash, e.logIndex))
  );
}

/**
 * Merge newly scanned events into the trade cache (idempotent on overlap blocks).
 */
export function mergeEventsIntoCache(
  cache: Record<string, CachedTradeRecord>,
  batch: ScannedEventBatch
): Record<string, CachedTradeRecord> {
  const next: Record<string, CachedTradeRecord> = { ...cache };

  for (const created of batch.createdEvents) {
    ensureRecord(next, created.tradeId, created);
  }

  for (const execution of batch.executionEvents) {
    const record = ensureRecord(next, execution.tradeId);
    appendUniqueExecution(record, execution, executionSeenKeys(record));
  }

  for (const cancelled of batch.cancelledEvents) {
    const record = ensureRecord(next, cancelled.tradeId);
    record.cancelled = cancelled;
  }

  for (const instasettled of batch.instasettledEvents) {
    const record = ensureRecord(next, instasettled.tradeId);
    record.instasettled = instasettled;
  }

  for (const completed of batch.completedEvents) {
    const record = ensureRecord(next, completed.tradeId);
    record.completed = completed;
  }

  return next;
}

export function classifyTrade(record: CachedTradeRecord): TradeClassification | null {
  const { created, executions, cancelled, instasettled, completed } = record;

  const totalRealized = executions.reduce(
    (sum, exec) => sum + BigInt(exec.realisedAmountOut),
    BigInt(0)
  );
  const totalStreamedIn = executions.reduce(
    (sum, exec) => sum + BigInt(exec.amountIn),
    BigInt(0)
  );
  const originalAmountIn = BigInt(created.amountIn);

  if (cancelled) {
    return {
      completionType: "cancelled",
      completionTime: cancelled.timestamp,
      finalAmountOut: BigInt(cancelled.realisedAmountOut),
    };
  }

  if (instasettled) {
    return {
      completionType: "instasettled",
      completionTime: instasettled.timestamp,
      finalAmountOut: BigInt(instasettled.totalAmountOut),
    };
  }

  if (completed) {
    return {
      completionType: "completed",
      completionTime: completed.timestamp,
      finalAmountOut: BigInt(completed.finalRealisedAmountOut),
    };
  }

  if (
    executions.length > 0 &&
    originalAmountIn > BigInt(0) &&
    totalStreamedIn >= originalAmountIn
  ) {
    const lastExecution = executions[executions.length - 1];
    return {
      completionType: "executed",
      completionTime: lastExecution.timestamp,
      finalAmountOut: totalRealized,
    };
  }

  return null;
}

export interface BuildHistoryOptions {
  isTradeActive?: (tradeId: number) => Promise<boolean>;
  readAttempts?: (tradeId: number) => Promise<number | undefined>;
}

export async function buildTradeHistoryFromCache(
  cache: Record<string, CachedTradeRecord>,
  options: BuildHistoryOptions = {}
): Promise<TradeHistory> {
  const completedTrades: CompletedTrade[] = [];
  const ongoingTrades: TradeDisplay[] = [];
  let closedWithoutTerminalEvent = 0;

  for (const record of Object.values(cache)) {
    const { created, executions } = record;
    const classification = classifyTrade(record);

    const tokenInSymbol = getTokenSymbol(created.tokenIn);
    const tokenOutSymbol = getTokenSymbol(created.tokenOut);
    const pair = `${tokenInSymbol}/${tokenOutSymbol}`;
    const tokenInDecimals = getTokenDecimals(created.tokenIn);
    const tokenOutDecimals = getTokenDecimals(created.tokenOut);

    if (classification) {
      const finalProgress =
        created.minAmountOut !== "0"
          ? (Number(classification.finalAmountOut) /
              Number(created.minAmountOut)) *
            100
          : 0;

      completedTrades.push({
        tradeId: record.tradeId,
        pair,
        tokenIn: tokenInSymbol,
        tokenOut: tokenOutSymbol,
        amountIn: formatTokenAmount(created.amountIn, tokenInDecimals),
        finalAmountOut: formatTokenAmount(
          classification.finalAmountOut.toString(),
          tokenOutDecimals
        ),
        executionCount: executions.length,
        completionTime: classification.completionTime,
        completionType: classification.completionType,
        owner: created.user.slice(0, 6) + "..." + created.user.slice(-4),
        totalExecutions: executions.length,
        finalProgress: Math.min(finalProgress, 100),
      });
      continue;
    }

    const stillActive = options.isTradeActive
      ? await options.isTradeActive(record.tradeId)
      : true;

    if (!stillActive) {
      closedWithoutTerminalEvent++;
      continue;
    }

    const lastExecution = executions[executions.length - 1];
    const totalExecuted = executions.reduce(
      (sum, exec) => sum + BigInt(exec.amountIn),
      BigInt(0)
    );
    const totalRealized = executions.reduce(
      (sum, exec) => sum + BigInt(exec.realisedAmountOut),
      BigInt(0)
    );
    const estimatedRemaining =
      BigInt(created.amountIn) > totalExecuted
        ? BigInt(created.amountIn) - totalExecuted
        : BigInt(0);

    let actualAttempts = executions.length;
    if (options.readAttempts) {
      const fromContract = await options.readAttempts(record.tradeId);
      if (fromContract !== undefined) actualAttempts = fromContract;
    }

    ongoingTrades.push({
      tradeId: record.tradeId.toString(),
      pair,
      tokenIn: created.tokenIn,
      tokenOut: created.tokenOut,
      amountIn: formatTokenAmount(created.amountIn, tokenInDecimals),
      amountRemaining: formatTokenAmount(
        estimatedRemaining.toString(),
        tokenInDecimals
      ),
      targetAmountOut: formatTokenAmount(created.minAmountOut, tokenOutDecimals),
      realisedAmountOut: formatTokenAmount(
        totalRealized.toString(),
        tokenOutDecimals
      ),
      progress: calculateProgress(
        totalRealized.toString(),
        created.minAmountOut
      ),
      isInstasettlable: created.isInstasettlable,
      lastSweetSpot:
        lastExecution?.lastSweetSpot?.toString() ||
        created.lastSweetSpot.toString(),
      attempts: actualAttempts,
      owner: created.user.slice(0, 6) + "..." + created.user.slice(-4),
      onlyInstasettle: created.onlyInstasettle,
    });
  }

  if (closedWithoutTerminalEvent > 0) {
    console.log(
      `ℹ️ Ignored ${closedWithoutTerminalEvent} closed trade(s) without terminal events (already removed on-chain).`
    );
  }

  completedTrades.sort((a, b) => b.completionTime - a.completionTime);

  const totalTrades = Object.keys(cache).length;
  const completionRate =
    totalTrades > 0 ? (completedTrades.length / totalTrades) * 100 : 0;

  return {
    completedTrades,
    ongoingTrades,
    totalTrades,
    completionRate,
  };
}

/**
 * Build cache from a full bootstrap scan (convenience wrapper).
 */
export function buildCacheFromEvents(batch: ScannedEventBatch): Record<string, CachedTradeRecord> {
  return mergeEventsIntoCache({}, batch);
}
