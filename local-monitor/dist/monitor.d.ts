import { ethers } from "ethers";
import { MonitorResult } from "./types";
export declare class TradeMonitor {
    private provider;
    private signer;
    private coreContract;
    private coreContractWithSigner;
    private localDataPath;
    constructor();
    /**
     * Load local data from file
     */
    private loadLocalData;
    /**
     * Save local data to file
     */
    private saveLocalData;
    /**
     * Update local data with current outstanding trades
     */
    private updateLocalData;
    /**
     * Calculate pair ID (keccak256 hash of token addresses) - matches contract logic
     */
    private calculatePairId;
    /**
     * Get the symbol for a token address
     */
    private getTokenSymbol;
    /**
     * Format a token amount for display
     */
    private formatTokenAmount;
    /**
     * Calculate trade progress percentage
     */
    private calculateProgress;
    /**
     * Convert a trade to display format
     */
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
     * Get block timestamp
     */
    private getBlockTimestamp;
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
    executeTrades(pairId: string): Promise<ethers.ContractTransactionResponse>;
    /**
     * Execute all outstanding trades from local data (sequential execution)
     */
    executeOutstandingTrades(): Promise<void>;
    /**
     * Run the monitor
     */
    run(): Promise<void>;
}
//# sourceMappingURL=monitor.d.ts.map