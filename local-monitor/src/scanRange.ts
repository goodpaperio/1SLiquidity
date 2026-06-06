/** Blocks to re-scan on incremental runs (small reorg safety overlap). */
export const REORG_OVERLAP_BLOCKS = 1;

export type ScanMode = "bootstrap" | "incremental";

export interface ScanRange {
  mode: ScanMode;
  fromBlock: number;
  toBlock: number;
  reason: string;
}

export interface ScanRangeInput {
  lastScannedBlock: number;
  currentBlock: number;
  deploymentBlock: number;
  hasTradeCache: boolean;
  forceBootstrap?: boolean;
}

/**
 * Decide whether to bootstrap from deployment block or scan incrementally.
 */
export function resolveScanRange(input: ScanRangeInput): ScanRange {
  const {
    lastScannedBlock,
    currentBlock,
    deploymentBlock,
    hasTradeCache,
    forceBootstrap = false,
  } = input;

  const toBlock = Math.max(deploymentBlock, currentBlock);

  if (forceBootstrap || !hasTradeCache || lastScannedBlock < deploymentBlock) {
    return {
      mode: "bootstrap",
      fromBlock: deploymentBlock,
      toBlock,
      reason: forceBootstrap
        ? "forced bootstrap"
        : !hasTradeCache
          ? "no tradeCache"
          : "lastScannedBlock before deployment",
    };
  }

  if (lastScannedBlock > currentBlock) {
    return {
      mode: "bootstrap",
      fromBlock: deploymentBlock,
      toBlock,
      reason: "lastScannedBlock ahead of chain head",
    };
  }

  const fromBlock = Math.max(
    deploymentBlock,
    lastScannedBlock - REORG_OVERLAP_BLOCKS
  );

  return {
    mode: "incremental",
    fromBlock,
    toBlock,
    reason: `incremental from ${fromBlock} (last scanned ${lastScannedBlock})`,
  };
}
