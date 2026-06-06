import { ethers } from "ethers";
import { MonitorResult, RunStats } from "./types";
export declare class TradeMonitor {
    private provider;
    private signer;
    private coreContract;
    private coreContractWithSigner;
    private localDataPath;
    private alertStatePath;
    private constructor();
    private loadAlertState;
    private saveAlertState;
    /**
     * Create a new TradeMonitor instance (async factory method)
     */
    static create(): Promise<TradeMonitor>;
    /**
     * Load local data from file
     */
    private loadLocalData;
    /**
     * Save local data to file
     */
    private saveLocalData;
    /**
     * Persist scan cursor, trade cache, and execution queue metadata.
     */
    private persistLocalData;
    /**
     * Calculate pair ID (keccak256 hash of token addresses) - matches contract logic
     */
    private calculatePairId;
    private tradeToDisplay;
    /**
     * Check if a trade exists and is active
     */
    private isTradeActive;
    /**
     * Get a single trade by ID
     */
    private getTrade;
    /**
     * Get all active trades
     */
    getAllActiveTrades(): Promise<MonitorResult>;
    /**
     * Scan for TradeCreated events
     */
    private scanTradeCreatedEvents;
    /**
     * Scan for TradeStreamExecuted events
     */
    private scanExecutionEvents;
    /**
     * Scan for TradeCancelled events
     */
    private scanCancelledEvents;
    /**
     * Scan for TradeSettled events
     */
    private scanTradeInstasettledEvents;
    /**
     * Scan for TradeCompleted events
     */
    private scanTradeCompletedEvents;
    /**
     * Scan for StreamFeesTaken events
     */
    private scanStreamFeeEvents;
    /**
     * Scan for InstasettleFeeTaken events
     */
    private scanInstasettleFeeEvents;
    /**
     * Get block timestamp
     */
    private getBlockTimestamp;
    /**
     * Scan historical Core events for a block range.
     */
    private scanHistoricalBatch;
    private fillBatchTimestamps;
    /**
     * Analyze trade history and determine completion status
     */
    private analyzeTradeHistory;
    /**
     * Display trades in a formatted table
     */
    displayTrades(result: MonitorResult): void;
    /**
     * Display completed trades in a formatted table
     */
    private displayCompletedTrades;
    /**
     * Display ongoing trades in a formatted table
     */
    private displayOngoingTrades;
    /**
     * Display trade history analysis
     */
    private displayTradeHistory;
    /**
     * Run the historical analysis
     */
    runHistoricalAnalysis(): Promise<void>;
    /**
     * Execute trades for a specific pair ID (submits transaction and returns transaction response)
     */
    executeTrades(pairId: string): Promise<ethers.TransactionResponse>;
    private buildRunTradeDetails;
    /**
     * Calculate run statistics including fees and gas costs
     */
    private calculateRunStats;
    /**
     * Send Telegram alert with run stats
     */
    private sendTelegramAlert;
    /**
     * Display fee statistics
     */
    private displayFeeStats;
    private displayStreamBreakdown;
    /**
     * Execute all outstanding trades from local data (sequential execution)
     */
    executeOutstandingTrades(): Promise<RunStats | null>;
    /**
     * Run the monitor
     */
    run(): Promise<void>;
}
//# sourceMappingURL=monitor.d.ts.map