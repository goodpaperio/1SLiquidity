import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCacheFromEvents,
  buildTradeHistoryFromCache,
  classifyTrade,
  eventDedupeKey,
  mergeEventsIntoCache,
} from "../src/tradeCache";
import {
  TradeCancelledEvent,
  TradeCompletedEvent,
  TradeCreatedEvent,
  TradeStreamExecutedEvent,
} from "../src/types";

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const SHIB = "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE";

function created(tradeId: number, amountIn = "1000000000000000000"): TradeCreatedEvent {
  return {
    tradeId,
    user: "0xfa59A1673fAF2d3bFd2d3F2d3F2d3F2d3F2d3F2d3",
    tokenIn: SHIB,
    tokenOut: WETH,
    amountIn,
    amountRemaining: amountIn,
    minAmountOut: "1",
    realisedAmountOut: "0",
    isInstasettlable: false,
    instasettleBps: 0,
    lastSweetSpot: 3,
    usePriceBased: false,
    onlyInstasettle: false,
    blockNumber: 100,
    transactionHash: `0xcreate${tradeId}`,
    logIndex: 0,
    timestamp: 1_000,
  };
}

function execution(
  tradeId: number,
  amountIn: string,
  realised: string,
  blockNumber: number,
  txHash: string,
  logIndex = 0
): TradeStreamExecutedEvent {
  return {
    tradeId,
    amountIn,
    realisedAmountOut: realised,
    lastSweetSpot: 2,
    blockNumber,
    transactionHash: txHash,
    logIndex,
    timestamp: blockNumber,
  };
}

describe("eventDedupeKey", () => {
  it("combines tx hash and log index", () => {
    assert.equal(
      eventDedupeKey("0xABC", 3),
      "0xabc:3"
    );
  });
});

describe("mergeEventsIntoCache", () => {
  it("creates a record from TradeCreated", () => {
    const cache = buildCacheFromEvents({
      createdEvents: [created(1)],
      executionEvents: [],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    assert.ok(cache["1"]);
    assert.equal(cache["1"].tradeId, 1);
  });

  it("appends executions to an existing trade", () => {
    const cache = buildCacheFromEvents({
      createdEvents: [created(1)],
      executionEvents: [
        execution(1, "500000000000000000", "100", 101, "0xexec1"),
      ],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    assert.equal(cache["1"].executions.length, 1);
  });

  it("dedupes overlapping execution events", () => {
    const exec = execution(1, "500000000000000000", "100", 101, "0xexec1", 1);
    let cache = buildCacheFromEvents({
      createdEvents: [created(1)],
      executionEvents: [exec],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    cache = mergeEventsIntoCache(cache, {
      createdEvents: [],
      executionEvents: [exec],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    assert.equal(cache["1"].executions.length, 1);
  });

  it("stores terminal completion events", () => {
    const completedEvent: TradeCompletedEvent = {
      tradeId: 1,
      finalRealisedAmountOut: "999",
      blockNumber: 110,
      transactionHash: "0xdone",
      logIndex: 0,
      timestamp: 2_000,
    };

    const cache = buildCacheFromEvents({
      createdEvents: [created(1)],
      executionEvents: [],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [completedEvent],
    });

    assert.equal(cache["1"].completed?.finalRealisedAmountOut, "999");
  });
});

describe("classifyTrade", () => {
  it("prefers cancelled over other signals", () => {
    const cache = buildCacheFromEvents({
      createdEvents: [created(1)],
      executionEvents: [],
      cancelledEvents: [
        {
          isAutocancelled: false,
          tradeId: 1,
          amountRemaining: "0",
          realisedAmountOut: "50",
          blockNumber: 105,
          transactionHash: "0xcancel",
          logIndex: 0,
          timestamp: 1_500,
        } satisfies TradeCancelledEvent,
      ],
      instasettledEvents: [],
      completedEvents: [],
    });

    const result = classifyTrade(cache["1"]);
    assert.equal(result?.completionType, "cancelled");
    assert.equal(result?.finalAmountOut, BigInt(50));
  });

  it("marks fully streamed trades as executed without terminal event", () => {
    const amountIn = "1000000000000000000";
    const cache = buildCacheFromEvents({
      createdEvents: [created(2, amountIn)],
      executionEvents: [
        execution(2, amountIn, "500", 102, "0xstream"),
      ],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    const result = classifyTrade(cache["2"]);
    assert.equal(result?.completionType, "executed");
  });
});

describe("buildTradeHistoryFromCache", () => {
  it("splits ongoing and completed trades", async () => {
    const amountIn = "1000000000000000000";
    const cache = buildCacheFromEvents({
      createdEvents: [created(1, amountIn), created(2, amountIn)],
      executionEvents: [
        execution(1, amountIn, "500", 103, "0xfull"),
      ],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    const history = await buildTradeHistoryFromCache(cache, {
      isTradeActive: async (tradeId) => tradeId === 2,
    });

    assert.equal(history.completedTrades.length, 1);
    assert.equal(history.completedTrades[0].tradeId, 1);
    assert.equal(history.ongoingTrades.length, 1);
    assert.equal(history.ongoingTrades[0].tradeId, "2");
  });

  it("drops inactive trades without terminal events", async () => {
    const cache = buildCacheFromEvents({
      createdEvents: [created(3)],
      executionEvents: [],
      cancelledEvents: [],
      instasettledEvents: [],
      completedEvents: [],
    });

    const history = await buildTradeHistoryFromCache(cache, {
      isTradeActive: async () => false,
    });

    assert.equal(history.ongoingTrades.length, 0);
    assert.equal(history.completedTrades.length, 0);
  });
});
