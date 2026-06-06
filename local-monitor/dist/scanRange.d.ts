/** Blocks to re-scan on incremental runs (small reorg safety overlap). */
export declare const REORG_OVERLAP_BLOCKS = 1;
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
export declare function resolveScanRange(input: ScanRangeInput): ScanRange;
//# sourceMappingURL=scanRange.d.ts.map