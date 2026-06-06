import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveScanRange, REORG_OVERLAP_BLOCKS } from "../src/scanRange";

const DEPLOYMENT = 25_072_029;

describe("resolveScanRange", () => {
  it("bootstraps when tradeCache is missing", () => {
    const range = resolveScanRange({
      lastScannedBlock: 0,
      currentBlock: 25_260_000,
      deploymentBlock: DEPLOYMENT,
      hasTradeCache: false,
    });

    assert.equal(range.mode, "bootstrap");
    assert.equal(range.fromBlock, DEPLOYMENT);
    assert.equal(range.toBlock, 25_260_000);
  });

  it("bootstraps on cold start even with zero lastScannedBlock", () => {
    const range = resolveScanRange({
      lastScannedBlock: 0,
      currentBlock: DEPLOYMENT + 100,
      deploymentBlock: DEPLOYMENT,
      hasTradeCache: false,
    });

    assert.equal(range.mode, "bootstrap");
    assert.equal(range.fromBlock, DEPLOYMENT);
  });

  it("scans incrementally from lastScannedBlock - overlap", () => {
    const range = resolveScanRange({
      lastScannedBlock: 25_260_000,
      currentBlock: 25_260_025,
      deploymentBlock: DEPLOYMENT,
      hasTradeCache: true,
    });

    assert.equal(range.mode, "incremental");
    assert.equal(
      range.fromBlock,
      25_260_000 - REORG_OVERLAP_BLOCKS
    );
    assert.equal(range.toBlock, 25_260_025);
  });

  it("bootstraps when contract cache is stale (lastScanned before deployment)", () => {
    const range = resolveScanRange({
      lastScannedBlock: 100,
      currentBlock: DEPLOYMENT + 50,
      deploymentBlock: DEPLOYMENT,
      hasTradeCache: true,
    });

    assert.equal(range.mode, "bootstrap");
    assert.equal(range.fromBlock, DEPLOYMENT);
  });

  it("bootstraps when lastScannedBlock is ahead of chain head", () => {
    const range = resolveScanRange({
      lastScannedBlock: 25_300_000,
      currentBlock: 25_260_000,
      deploymentBlock: DEPLOYMENT,
      hasTradeCache: true,
    });

    assert.equal(range.mode, "bootstrap");
  });

  it("respects forceBootstrap", () => {
    const range = resolveScanRange({
      lastScannedBlock: 25_260_000,
      currentBlock: 25_260_010,
      deploymentBlock: DEPLOYMENT,
      hasTradeCache: true,
      forceBootstrap: true,
    });

    assert.equal(range.mode, "bootstrap");
    assert.equal(range.fromBlock, DEPLOYMENT);
  });
});
