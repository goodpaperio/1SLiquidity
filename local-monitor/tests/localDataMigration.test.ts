import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyLocalData,
  hasUsableTradeCache,
  migrateLocalData,
} from "../src/localDataMigration";
import { CachedTradeRecord } from "../src/types";

const CORE = "0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710";

describe("migrateLocalData", () => {
  it("migrates legacy lastRun to lastScannedBlock", () => {
    const data = migrateLocalData(
      {
        lastRun: 25_258_741,
        outstandingTrades: [],
        lastUpdated: 123,
        contractAddress: CORE,
      },
      CORE
    );

    assert.equal(data.lastScannedBlock, 25_258_741);
    assert.equal(data.schemaVersion, 2);
    assert.deepEqual(data.tradeCache, {});
  });

  it("resets when contract address changes", () => {
    const data = migrateLocalData(
      {
        lastRun: 100,
        outstandingTrades: [{ tradeId: 1 } as any],
        tradeCache: { "1": {} as CachedTradeRecord },
        contractAddress: "0xold",
      },
      CORE
    );

    assert.equal(data.lastScannedBlock, 0);
    assert.equal(data.outstandingTrades.length, 0);
    assert.deepEqual(data.tradeCache, {});
  });

  it("preserves existing tradeCache", () => {
    const cache = {
      "1": { tradeId: 1, created: {} as any, executions: [] },
    };

    const data = migrateLocalData(
      {
        schemaVersion: 2,
        lastScannedBlock: 1000,
        tradeCache: cache,
        outstandingTrades: [],
        lastUpdated: 1,
        contractAddress: CORE,
      },
      CORE
    );

    assert.equal(data.tradeCache?.["1"].tradeId, 1);
  });
});

describe("hasUsableTradeCache", () => {
  it("returns false for empty cache", () => {
    assert.equal(hasUsableTradeCache(createEmptyLocalData(CORE)), false);
  });

  it("returns true when cache has entries", () => {
    const data = migrateLocalData(
      {
        tradeCache: {
          "1": { tradeId: 1, created: {} as any, executions: [] },
        },
        lastScannedBlock: 10,
        outstandingTrades: [],
        lastUpdated: 0,
        contractAddress: CORE,
      },
      CORE
    );

    assert.equal(hasUsableTradeCache(data), true);
  });
});
