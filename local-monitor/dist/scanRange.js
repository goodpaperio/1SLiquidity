"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REORG_OVERLAP_BLOCKS = void 0;
exports.resolveScanRange = resolveScanRange;
/** Blocks to re-scan on incremental runs (small reorg safety overlap). */
exports.REORG_OVERLAP_BLOCKS = 1;
/**
 * Decide whether to bootstrap from deployment block or scan incrementally.
 */
function resolveScanRange(input) {
    const { lastScannedBlock, currentBlock, deploymentBlock, hasTradeCache, forceBootstrap = false, } = input;
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
    const fromBlock = Math.max(deploymentBlock, lastScannedBlock - exports.REORG_OVERLAP_BLOCKS);
    return {
        mode: "incremental",
        fromBlock,
        toBlock,
        reason: `incremental from ${fromBlock} (last scanned ${lastScannedBlock})`,
    };
}
//# sourceMappingURL=scanRange.js.map