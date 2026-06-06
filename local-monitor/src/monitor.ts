import { ethers } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  CONTRACT_ADDRESSES,
  TOKEN_ADDRESSES,
  getProvider,
  getSigner,
  DEPLOYMENT_BLOCK,
  BOT_VERSION,
} from "./config";
import {
  Trade,
  TradeDisplay,
  MonitorResult,
  TradeCreatedEvent,
  TradeStreamExecutedEvent,
  TradeCancelledEvent,
  TradeInstasettledEvent,
  TradeCompletedEvent,
  CompletedTrade,
  TradeHistory,
  TradeMetadata,
  LocalData,
  StreamFeesTakenEvent,
  InstasettleFeeTakenEvent,
  RunStats,
  RunStreamDetail,
  RunTradeRollup,
  CachedTradeRecord,
} from "./types";
import CoreABI from "./abi/Core.json";
import { getTokenPrices, getTokenDecimals } from "./price-fetcher";
import { getSecrets } from "./secrets";
import { resolveScanRange } from "./scanRange";
import {
  buildTradeHistoryFromCache,
  mergeEventsIntoCache,
  ScannedEventBatch,
} from "./tradeCache";
import {
  calculateProgress,
  formatTokenAmount,
  getTokenSymbol,
} from "./tradeFormat";
import {
  hasUsableTradeCache,
  migrateLocalData,
  outstandingTradesFromMetadata,
} from "./localDataMigration";

export class TradeMonitor {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private coreContract: ethers.Contract;
  private coreContractWithSigner: ethers.Contract;
  private localDataPath: string;
  private alertStatePath: string;

  private constructor(
    provider: ethers.JsonRpcProvider,
    signer: ethers.Wallet | null
  ) {
    this.provider = provider;
    this.coreContract = new ethers.Contract(
      CONTRACT_ADDRESSES.core,
      CoreABI,
      this.provider
    );

    if (signer) {
      this.signer = signer;
      this.coreContractWithSigner = new ethers.Contract(
        CONTRACT_ADDRESSES.core,
        CoreABI,
        this.signer
      );
    } else {
      // No private key available - only read operations allowed
      this.signer = null as any;
      this.coreContractWithSigner = null as any;
    }

    this.localDataPath = join(process.cwd(), "localData.json");
    this.alertStatePath = join(process.cwd(), "telegramAlertState.json");
  }

  private loadAlertState(): {
    lastNotifiedVersion?: string;
    lastQueuedTrades?: number;
  } {
    if (!existsSync(this.alertStatePath)) {
      return {};
    }
    try {
      const raw = readFileSync(this.alertStatePath, "utf8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private saveAlertState(state: {
    lastNotifiedVersion?: string;
    lastQueuedTrades?: number;
  }): void {
    try {
      writeFileSync(this.alertStatePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.warn("⚠️ Failed to save Telegram alert state:", error);
    }
  }

  /**
   * Create a new TradeMonitor instance (async factory method)
   */
  static async create(): Promise<TradeMonitor> {
    const provider = await getProvider();
    
    let signer: ethers.Wallet | null = null;
    try {
      signer = await getSigner();
    } catch (error) {
      console.warn("⚠️  No private key available - only read operations allowed");
    }

    return new TradeMonitor(provider, signer);
  }

  /**
   * Load local data from file
   */
  private loadLocalData(): LocalData {
    if (!existsSync(this.localDataPath)) {
      return migrateLocalData({}, CONTRACT_ADDRESSES.core);
    }

    try {
      const data = readFileSync(this.localDataPath, "utf8");
      const loadedData = JSON.parse(data) as Partial<LocalData> & {
        lastRun?: number;
      };
      return migrateLocalData(loadedData, CONTRACT_ADDRESSES.core);
    } catch (error) {
      console.warn("⚠️ Failed to load local data, starting fresh:", error);
      return migrateLocalData({}, CONTRACT_ADDRESSES.core);
    }
  }

  /**
   * Save local data to file
   */
  private saveLocalData(data: LocalData): void {
    try {
      writeFileSync(this.localDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("❌ Failed to save local data:", error);
    }
  }

  /**
   * Persist scan cursor, trade cache, and execution queue metadata.
   */
  private persistLocalData(params: {
    lastScannedBlock: number;
    tradeCache: Record<string, CachedTradeRecord>;
    ongoingTrades: TradeDisplay[];
  }): void {
    const currentTime = Math.floor(Date.now() / 1000);
    const outstandingTrades = outstandingTradesFromMetadata(
      params.ongoingTrades,
      (tokenIn, tokenOut) => this.calculatePairId(tokenIn, tokenOut),
      currentTime
    );

    const localData: LocalData = {
      schemaVersion: 2,
      lastScannedBlock: params.lastScannedBlock,
      outstandingTrades,
      tradeCache: params.tradeCache,
      lastUpdated: currentTime,
      contractAddress: CONTRACT_ADDRESSES.core,
    };

    this.saveLocalData(localData);
    if (outstandingTrades.length === 0) {
      console.log("No outstanding trades.");
    }
    console.log(
      `💾 Updated local data: ${outstandingTrades.length} outstanding, ` +
        `${Object.keys(params.tradeCache).length} cached trades, ` +
        `lastScannedBlock=${params.lastScannedBlock}`
    );
  }

  /**
   * Calculate pair ID (keccak256 hash of token addresses) - matches contract logic
   */
  private calculatePairId(tokenIn: string, tokenOut: string): string {
    // Use the same calculation as the smart contract: keccak256(abi.encode(tokenIn, tokenOut))
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [tokenIn, tokenOut]
      )
    );
  }

  private tradeToDisplay(trade: Trade): TradeDisplay {
    const tokenInSymbol = getTokenSymbol(trade.tokenIn);
    const tokenOutSymbol = getTokenSymbol(trade.tokenOut);
    const tokenInDecimals = getTokenDecimals(trade.tokenIn);
    const tokenOutDecimals = getTokenDecimals(trade.tokenOut);

    return {
      tradeId: trade.tradeId,
      pair: `${tokenInSymbol}/${tokenOutSymbol}`,
      tokenIn: trade.tokenIn,
      tokenOut: trade.tokenOut,
      amountIn: formatTokenAmount(trade.amountIn, tokenInDecimals),
      amountRemaining: formatTokenAmount(trade.amountRemaining, tokenInDecimals),
      targetAmountOut: formatTokenAmount(trade.targetAmountOut, tokenOutDecimals),
      realisedAmountOut: formatTokenAmount(
        trade.realisedAmountOut,
        tokenOutDecimals
      ),
      progress: calculateProgress(
        trade.realisedAmountOut,
        trade.targetAmountOut
      ),
      isInstasettlable: trade.isInstasettlable,
      lastSweetSpot: trade.lastSweetSpot,
      attempts: trade.attempts,
      owner: trade.owner.slice(0, 6) + "..." + trade.owner.slice(-4),
      onlyInstasettle: trade.onlyInstasettle,
    };
  }

  /**
   * Check if a trade exists and is active
   */
  private async isTradeActive(tradeId: number): Promise<boolean> {
    try {
      const trade = await this.coreContract.trades(tradeId);
      // A trade is active if it has a non-zero owner address
      return trade.owner !== "0x0000000000000000000000000000000000000000";
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a single trade by ID
   */
  private async getTrade(tradeId: number): Promise<Trade | null> {
    try {
      const trade = await this.coreContract.getTrade(tradeId);
      return {
        owner: trade.owner,
        attempts: trade.attempts,
        tokenIn: trade.tokenIn,
        tokenOut: trade.tokenOut,
        amountIn: trade.amountIn.toString(),
        amountRemaining: trade.amountRemaining.toString(),
        targetAmountOut: trade.targetAmountOut.toString(),
        realisedAmountOut: trade.realisedAmountOut.toString(),
        tradeId: trade.tradeId.toString(),
        instasettleBps: trade.instasettleBps.toString(),
        lastSweetSpot: trade.lastSweetSpot.toString(),
        isInstasettlable: trade.isInstasettlable,
        usePriceBased: trade.usePriceBased,
        onlyInstasettle: trade.onlyInstasettle,
      };
    } catch (error: any) {
      // Only log non-"Trade not found" errors since those are handled upstream
      const errorMsg = error?.reason || error?.message || "";
      if (!errorMsg.includes("Trade not found")) {
        console.error(`Error fetching trade ${tradeId}:`, errorMsg);
      }
      // Re-throw so caller can handle it
      throw error;
    }
  }

  /**
   * Get all active trades
   */
  async getAllActiveTrades(): Promise<MonitorResult> {
    try {
      console.log("🔍 Fetching contract state...");

      // Get the last trade ID
      const lastTradeId = await this.coreContract.lastTradeId();
      const lastTradeIdNum = Number(lastTradeId);

      console.log(`📊 Last trade ID: ${lastTradeIdNum}`);

      const activeTrades: TradeDisplay[] = [];

      // Iterate through all possible trade IDs
      for (let tradeId = 0; tradeId <= lastTradeIdNum; tradeId++) {
        if (await this.isTradeActive(tradeId)) {
          try {
            const trade = await this.getTrade(tradeId);
            if (trade) {
              activeTrades.push(this.tradeToDisplay(trade));
            }
          } catch (error: any) {
            // Trade might have been removed between isTradeActive check and getTrade
            // This is rare but can happen - skip it
            const errorMsg = error?.reason || error?.message || "";
            if (!errorMsg.includes("Trade not found")) {
              console.warn(
                `⚠️ Error fetching active trade ${tradeId}:`,
                errorMsg
              );
            }
          }
        }
      }

      return {
        totalTrades: lastTradeIdNum + 1,
        activeTrades,
        lastTradeId: lastTradeId.toString(),
      };
    } catch (error) {
      console.error("❌ Error fetching trades:", error);
      throw error;
    }
  }

  /**
   * Scan for TradeCreated events
   */
  private async scanTradeCreatedEvents(
    fromBlock: number = 0,
    toBlock?: number
  ): Promise<TradeCreatedEvent[]> {
    console.log(
      `🔍 Scanning TradeCreated events from block ${fromBlock}` +
        (toBlock !== undefined ? ` to ${toBlock}` : "")
    );

    try {
      const filter = this.coreContract.filters.TradeCreated();
      const events = await this.coreContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      console.log(`📊 Found ${events.length} TradeCreated events`);

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          user: eventLog.args?.user,
          tokenIn: eventLog.args?.tokenIn,
          tokenOut: eventLog.args?.tokenOut,
          amountIn: eventLog.args?.amountIn.toString(),
          amountRemaining: eventLog.args?.amountRemaining.toString(),
          minAmountOut: eventLog.args?.minAmountOut.toString(),
          realisedAmountOut: eventLog.args?.realisedAmountOut.toString(),
          isInstasettlable: eventLog.args?.isInstasettlable,
          instasettleBps: Number(eventLog.args?.instasettleBps),
          lastSweetSpot: Number(eventLog.args?.lastSweetSpot),
          usePriceBased: eventLog.args?.usePriceBased,
          onlyInstasettle: eventLog.args?.onlyInstasettle,
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          logIndex: eventLog.index,
          timestamp: 0,
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning TradeCreated events:`, error);
      return [];
    }
  }

  /**
   * Scan for TradeStreamExecuted events
   */
  private async scanExecutionEvents(
    fromBlock: number = 0,
    toBlock?: number
  ): Promise<TradeStreamExecutedEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeStreamExecuted();
      const events = await this.coreContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          amountIn: eventLog.args?.amountIn.toString(),
          realisedAmountOut: eventLog.args?.realisedAmountOut.toString(),
          lastSweetSpot: Number(eventLog.args?.lastSweetSpot),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          logIndex: eventLog.index,
          timestamp: 0,
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning TradeStreamExecuted events:`, error);
      return [];
    }
  }

  /**
   * Scan for TradeCancelled events
   */
  private async scanCancelledEvents(
    fromBlock: number = 0,
    toBlock?: number
  ): Promise<TradeCancelledEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeCancelled();
      const events = await this.coreContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          isAutocancelled: Boolean(eventLog.args?.isAutocancelled),
          tradeId: Number(eventLog.args?.tradeId),
          amountRemaining: eventLog.args?.amountRemaining.toString(),
          realisedAmountOut: eventLog.args?.realisedAmountOut.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          logIndex: eventLog.index,
          timestamp: 0,
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning TradeCancelled events:`, error);
      return [];
    }
  }

  /**
   * Scan for TradeSettled events
   */
  private async scanTradeInstasettledEvents(
    fromBlock: number = 0,
    toBlock?: number
  ): Promise<TradeInstasettledEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeInstasettled();
      const events = await this.coreContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          settler: eventLog.args?.settler,
          totalAmountIn: eventLog.args?.totalAmountIn.toString(),
          totalAmountOut: eventLog.args?.totalAmountOut.toString(),
          totalFees: eventLog.args?.totalFees.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          logIndex: eventLog.index,
          timestamp: 0,
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning TradeInstasettled events:`, error);
      return [];
    }
  }

  /**
   * Scan for TradeCompleted events
   */
  private async scanTradeCompletedEvents(
    fromBlock: number = 0,
    toBlock?: number
  ): Promise<TradeCompletedEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeCompleted();
      const events = await this.coreContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          finalRealisedAmountOut:
            eventLog.args?.finalRealisedAmountOut.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          logIndex: eventLog.index,
          timestamp: 0,
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning TradeCompleted events:`, error);
      return [];
    }
  }

  /**
   * Scan for StreamFeesTaken events
   */
  private async scanStreamFeeEvents(
    fromBlock: number = 0,
    botAddress?: string
  ): Promise<StreamFeesTakenEvent[]> {
    try {
      // Filter for our bot's fees only
      const filter = botAddress
        ? this.coreContract.filters.StreamFeesTaken(botAddress)
        : this.coreContract.filters.StreamFeesTaken();
      
      const events = await this.coreContract.queryFilter(filter, fromBlock);

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          bot: eventLog.args?.bot,
          token: eventLog.args?.token,
          protocolFee: eventLog.args?.protocolFee.toString(),
          botFee: eventLog.args?.botFee.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          timestamp: 0, // Will be filled later
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning StreamFeesTaken events:`, error);
      return [];
    }
  }

  /**
   * Scan for InstasettleFeeTaken events
   */
  private async scanInstasettleFeeEvents(
    fromBlock: number = 0
  ): Promise<InstasettleFeeTakenEvent[]> {
    try {
      const filter = this.coreContract.filters.InstasettleFeeTaken();
      const events = await this.coreContract.queryFilter(filter, fromBlock);

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          settler: eventLog.args?.settler,
          token: eventLog.args?.token,
          protocolFee: eventLog.args?.protocolFee.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          timestamp: 0, // Will be filled later
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning InstasettleFeeTaken events:`, error);
      return [];
    }
  }

  /**
   * Get block timestamp
   */
  private async getBlockTimestamp(blockNumber: number): Promise<number> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      return block?.timestamp || 0;
    } catch (error) {
      console.warn(`Failed to get timestamp for block ${blockNumber}:`, error);
      return 0;
    }
  }

  /**
   * Scan historical Core events for a block range.
   */
  private async scanHistoricalBatch(
    fromBlock: number,
    toBlock: number
  ): Promise<ScannedEventBatch> {
    const [
      createdEvents,
      executionEvents,
      cancelledEvents,
      instasettledEvents,
      completedEvents,
    ] = await Promise.all([
      this.scanTradeCreatedEvents(fromBlock, toBlock),
      this.scanExecutionEvents(fromBlock, toBlock),
      this.scanCancelledEvents(fromBlock, toBlock),
      this.scanTradeInstasettledEvents(fromBlock, toBlock),
      this.scanTradeCompletedEvents(fromBlock, toBlock),
    ]);

    console.log(
      `📊 Found events: Created=${createdEvents.length}, Executed=${executionEvents.length}, Cancelled=${cancelledEvents.length}, Instasettled=${instasettledEvents.length}, Completed=${completedEvents.length}`
    );

    return {
      createdEvents,
      executionEvents,
      cancelledEvents,
      instasettledEvents,
      completedEvents,
    };
  }

  private async fillBatchTimestamps(batch: ScannedEventBatch): Promise<void> {
    const allBlocks = new Set<number>();
    for (const event of [
      ...batch.createdEvents,
      ...batch.executionEvents,
      ...batch.cancelledEvents,
      ...batch.instasettledEvents,
      ...batch.completedEvents,
    ]) {
      allBlocks.add(event.blockNumber);
    }

    const blockTimestamps = new Map<number, number>();
    for (const blockNumber of allBlocks) {
      blockTimestamps.set(blockNumber, await this.getBlockTimestamp(blockNumber));
    }

    const stamp = <T extends { blockNumber: number; timestamp: number }>(
      events: T[]
    ) => {
      events.forEach((event) => {
        event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
      });
    };

    stamp(batch.createdEvents);
    stamp(batch.executionEvents);
    stamp(batch.cancelledEvents);
    stamp(batch.instasettledEvents);
    stamp(batch.completedEvents);
  }

  /**
   * Analyze trade history and determine completion status
   */
  private async analyzeTradeHistory(): Promise<TradeHistory> {
    console.log("🔍 Scanning historical events...");

    const localData = this.loadLocalData();
    const currentBlock = await this.provider.getBlockNumber();
    const scanRange = resolveScanRange({
      lastScannedBlock: localData.lastScannedBlock,
      currentBlock,
      deploymentBlock: DEPLOYMENT_BLOCK,
      hasTradeCache: hasUsableTradeCache(localData),
    });

    if (scanRange.mode === "bootstrap") {
      console.log(`📦 Bootstrap scan (${scanRange.reason})`);
    } else {
      console.log(`⚡ Incremental scan (${scanRange.reason})`);
    }
    console.log(
      `📊 Scanning blocks ${scanRange.fromBlock} → ${scanRange.toBlock}`
    );

    const batch = await this.scanHistoricalBatch(
      scanRange.fromBlock,
      scanRange.toBlock
    );
    await this.fillBatchTimestamps(batch);

    const baseCache =
      scanRange.mode === "bootstrap" ? {} : { ...(localData.tradeCache || {}) };
    const tradeCache = mergeEventsIntoCache(baseCache, batch);

    const history = await buildTradeHistoryFromCache(tradeCache, {
      isTradeActive: (tradeId) => this.isTradeActive(tradeId),
      readAttempts: async (tradeId) => {
        try {
          const tradeFromContract = await this.coreContract.getTrade(tradeId);
          return Number(tradeFromContract.attempts);
        } catch {
          return undefined;
        }
      },
    });

    this.persistLocalData({
      lastScannedBlock: currentBlock,
      tradeCache,
      ongoingTrades: history.ongoingTrades,
    });

    return history;
  }

  /**
   * Display trades in a formatted table
   */
  displayTrades(result: MonitorResult): void {
    console.log("\n" + "=".repeat(100));
    console.log("🚀 1SLiquidity Trade Monitor");
    console.log("=".repeat(100));
    console.log(`📈 Total Trades: ${result.totalTrades}`);
    console.log(`🟢 Active Trades: ${result.activeTrades.length}`);
    console.log(`🔢 Last Trade ID: ${result.lastTradeId}`);
    console.log("=".repeat(100));

    if (result.activeTrades.length === 0) {
      console.log("📭 No active trades found");
      return;
    }

    // Table header
    console.log(
      "ID".padEnd(6) +
        "Pair".padEnd(15) +
        "Amount In".padEnd(15) +
        "Remaining".padEnd(15) +
        "Target Out".padEnd(15) +
        "Realised".padEnd(15) +
        "Progress".padEnd(10) +
        "Sweet Spot".padEnd(12) +
        "Attempts".padEnd(8) +
        "Owner".padEnd(15) +
        "Insta".padEnd(6)
    );
    console.log("-".repeat(150));

    // Table rows
    result.activeTrades.forEach((trade) => {
      console.log(
        trade.tradeId.padEnd(6) +
          trade.pair.padEnd(15) +
          trade.amountIn.padEnd(15) +
          trade.amountRemaining.padEnd(15) +
          trade.targetAmountOut.padEnd(15) +
          trade.realisedAmountOut.padEnd(15) +
          trade.progress.padEnd(10) +
          trade.lastSweetSpot.padEnd(12) +
          trade.attempts.toString().padEnd(8) +
          trade.owner.padEnd(15) +
          (trade.isInstasettlable ? "✓" : "✗").padEnd(6)
      );
    });

    console.log("=".repeat(150));
  }

  /**
   * Display completed trades in a formatted table
   */
  private displayCompletedTrades(completedTrades: CompletedTrade[]): void {
    if (completedTrades.length === 0) {
      console.log("📊 No completed trades found");
      return;
    }

    console.log("\n" + "=".repeat(120));
    console.log("✅ COMPLETED TRADES");
    console.log("=".repeat(120));

    // Header
    console.log(
      "ID".padEnd(4) +
        "Pair".padEnd(12) +
        "Amount In".padEnd(12) +
        "Final Out".padEnd(12) +
        "Executions".padEnd(12) +
        "Progress".padEnd(10) +
        "Type".padEnd(10) +
        "Owner".padEnd(12) +
        "Completed"
    );
    console.log("-".repeat(120));

    // Rows
    completedTrades.forEach((trade) => {
      const completionDate = new Date(
        trade.completionTime * 1000
      ).toLocaleDateString();
      const progressStr = `${trade.finalProgress.toFixed(1)}%`;

      console.log(
        trade.tradeId.toString().padEnd(4) +
          trade.pair.padEnd(12) +
          trade.amountIn.padEnd(12) +
          trade.finalAmountOut.padEnd(12) +
          trade.executionCount.toString().padEnd(12) +
          progressStr.padEnd(10) +
          trade.completionType.padEnd(10) +
          trade.owner.padEnd(12) +
          completionDate
      );
    });

    console.log("=".repeat(120));
  }

  /**
   * Display ongoing trades in a formatted table
   */
  private displayOngoingTrades(ongoingTrades: TradeDisplay[]): void {
    if (ongoingTrades.length === 0) {
      console.log("No outstanding trades.");
      return;
    }

    console.log("\n" + "=".repeat(120));
    console.log("🔄 ONGOING TRADES");
    console.log("=".repeat(120));

    // Header
    console.log(
      "ID".padEnd(4) +
        "Pair".padEnd(12) +
        "Amount In".padEnd(12) +
        "Remaining".padEnd(12) +
        "Target Out".padEnd(12) +
        "Realised".padEnd(12) +
        "Progress".padEnd(10) +
        "Attempts".padEnd(10) +
        "Owner".padEnd(12) +
        "OnlyInsta"
    );
    console.log("-".repeat(120));

    // Rows
    ongoingTrades.forEach((trade) => {
      console.log(
        trade.tradeId.toString().padEnd(4) +
          trade.pair.padEnd(12) +
          trade.amountIn.padEnd(12) +
          trade.amountRemaining.padEnd(12) +
          trade.targetAmountOut.padEnd(12) +
          trade.realisedAmountOut.padEnd(12) +
          trade.progress.padEnd(10) +
          trade.attempts.toString().padEnd(10) +
          trade.owner.padEnd(12) +
          (trade.onlyInstasettle ? "✓" : "✗")
      );
    });

    console.log("=".repeat(120));
  }

  /**
   * Display trade history analysis
   */
  private displayTradeHistory(history: TradeHistory): void {
    console.log("\n" + "=".repeat(120));
    console.log("🚀 1SLiquidity Trade Monitor - Historical Analysis");
    console.log("=".repeat(120));
    console.log(`📈 Total Trades: ${history.totalTrades}`);
    console.log(`✅ Completed Trades: ${history.completedTrades.length}`);
    console.log(`🔄 Ongoing Trades: ${history.ongoingTrades.length}`);
    console.log(`📊 Completion Rate: ${history.completionRate.toFixed(1)}%`);
    console.log("=".repeat(120));

    this.displayCompletedTrades(history.completedTrades);
    this.displayOngoingTrades(history.ongoingTrades);
  }

  /**
   * Run the historical analysis
   */
  async runHistoricalAnalysis(): Promise<void> {
    try {
      console.log("🚀 Starting 1SLiquidity Historical Trade Analysis...\n");

      const history = await this.analyzeTradeHistory();
      this.displayTradeHistory(history);
    } catch (error) {
      console.error("❌ Error during historical analysis:", error);
      throw error;
    }
  }

  /**
   * Execute trades for a specific pair ID (submits transaction and returns transaction response)
   */
  async executeTrades(
    pairId: string
  ): Promise<ethers.TransactionResponse> {
    try {
      if (!this.coreContractWithSigner) {
        throw new Error("Private key not available - cannot execute trades");
      }

      console.log(`🚀 Executing trades for pairId: ${pairId}`);

      // Get fee data first
      const feeData = await this.provider.getFeeData();

      // Preflight gas estimate; skip if it reverts
      let gasLimitEst: bigint;
      try {
        gasLimitEst =
          await this.coreContractWithSigner.executeTrades.estimateGas(pairId);
      } catch (estErr: any) {
        console.warn(
          `⚠️ Gas estimate failed for pairId ${pairId}; skipping this round.`,
          estErr
        );
        throw estErr;
      }

      // Add 50% padding to gas limit with 800k minimum
      let gasLimit = gasLimitEst + gasLimitEst / BigInt(2);
      if (gasLimit < BigInt(800000)) {
        gasLimit = BigInt(800000);
      }
      console.log(`⛽ Gas estimate: ${gasLimitEst}, using limit: ${gasLimit}`);

      // Build tx explicitly so gasLimit is included in signed EIP-1559 payload (some RPCs
      // reject "gas required exceeds allowance" when gasLimit is omitted from serialization)
      const iface = this.coreContract.interface;
      const data = iface.encodeFunctionData("executeTrades", [pairId]);
      const maxFeePerGas =
        feeData.maxFeePerGas ?? feeData.gasPrice ?? BigInt(50_000_000_000);
      const maxPriorityFeePerGas =
        feeData.maxPriorityFeePerGas ?? maxFeePerGas / BigInt(2);
      const tx = await this.signer.sendTransaction({
        to: CONTRACT_ADDRESSES.core,
        data,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        type: 2,
      });
      console.log(`📝 Transaction submitted: ${tx.hash}`);

      // Return full transaction object for sequential waiting
      return tx;
    } catch (error) {
      console.error(`❌ Failed to execute trades for pairId ${pairId}:`, error);
      throw error;
    }
  }

  private buildRunTradeDetails(
    executionEvents: TradeStreamExecutedEvent[],
    localData: LocalData
  ): { streamDetails: RunStreamDetail[]; tradeRollups: RunTradeRollup[] } {
    const metadataByTradeId = new Map<number, TradeMetadata>();
    for (const trade of localData.outstandingTrades) {
      metadataByTradeId.set(trade.tradeId, trade);
    }

    const streamDetails: RunStreamDetail[] = executionEvents.map((event) => {
      const meta = metadataByTradeId.get(event.tradeId);
      const tokenIn = meta?.tokenIn;
      const tokenOut = meta?.tokenOut;
      const tokenInSymbol = tokenIn ? getTokenSymbol(tokenIn) : "TOKEN_IN";
      const tokenOutSymbol = tokenOut
        ? getTokenSymbol(tokenOut)
        : "TOKEN_OUT";
      const tokenInDecimals = tokenIn ? getTokenDecimals(tokenIn) : 18;
      const tokenOutDecimals = tokenOut ? getTokenDecimals(tokenOut) : 18;

      return {
        tradeId: event.tradeId,
        pair: meta?.pair || `${tokenInSymbol}/${tokenOutSymbol}`,
        amountIn: formatTokenAmount(event.amountIn, tokenInDecimals),
        amountOut: formatTokenAmount(event.realisedAmountOut, tokenOutDecimals),
        tokenInSymbol,
        tokenOutSymbol,
        lastSweetSpot: event.lastSweetSpot,
        transactionHash: event.transactionHash,
      };
    });

    const rollupMap = new Map<
      number,
      {
        pair: string;
        tokenIn: string;
        tokenOut: string;
        totalAmountIn: bigint;
        totalAmountOut: bigint;
        streams: number;
      }
    >();

    for (const event of executionEvents) {
      const meta = metadataByTradeId.get(event.tradeId);
      const tokenIn = meta?.tokenIn || "";
      const tokenOut = meta?.tokenOut || "";
      const tokenInSymbol = tokenIn ? getTokenSymbol(tokenIn) : "TOKEN_IN";
      const tokenOutSymbol = tokenOut
        ? getTokenSymbol(tokenOut)
        : "TOKEN_OUT";
      const pair = meta?.pair || `${tokenInSymbol}/${tokenOutSymbol}`;
      if (!rollupMap.has(event.tradeId)) {
        rollupMap.set(event.tradeId, {
          pair,
          tokenIn,
          tokenOut,
          totalAmountIn: BigInt(0),
          totalAmountOut: BigInt(0),
          streams: 0,
        });
      }
      const rollup = rollupMap.get(event.tradeId)!;
      rollup.totalAmountIn += BigInt(event.amountIn);
      rollup.totalAmountOut += BigInt(event.realisedAmountOut);
      rollup.streams += 1;
    }

    const tradeRollups: RunTradeRollup[] = Array.from(rollupMap.entries()).map(
      ([tradeId, rollup]) => {
        const tokenInSymbol = rollup.tokenIn
          ? getTokenSymbol(rollup.tokenIn)
          : "TOKEN_IN";
        const tokenOutSymbol = rollup.tokenOut
          ? getTokenSymbol(rollup.tokenOut)
          : "TOKEN_OUT";
        const tokenInDecimals = rollup.tokenIn ? getTokenDecimals(rollup.tokenIn) : 18;
        const tokenOutDecimals = rollup.tokenOut
          ? getTokenDecimals(rollup.tokenOut)
          : 18;

        return {
          tradeId,
          pair: rollup.pair,
          streams: rollup.streams,
          totalAmountIn: formatTokenAmount(
            rollup.totalAmountIn.toString(),
            tokenInDecimals
          ),
          totalAmountOut: formatTokenAmount(
            rollup.totalAmountOut.toString(),
            tokenOutDecimals
          ),
          tokenInSymbol,
          tokenOutSymbol,
        };
      }
    );

    tradeRollups.sort((a, b) => a.tradeId - b.tradeId);
    return { streamDetails, tradeRollups };
  }

  /**
   * Calculate run statistics including fees and gas costs
   */
  private async calculateRunStats(
    startBlock: number,
    receipts: ethers.TransactionReceipt[],
    successCount: number,
    failCount: number,
    localData: LocalData
  ): Promise<RunStats> {
    const currentBlock = await this.provider.getBlockNumber();
    
    // Scan for fee events from this run
    const botAddress = this.signer ? this.signer.address : undefined;
    const feeEvents = await this.scanStreamFeeEvents(startBlock, botAddress);
    const executionEvents = await this.scanExecutionEvents(startBlock);
    const receiptHashes = new Set(
      receipts.map((receipt) => receipt.hash.toLowerCase())
    );
    const runExecutionEvents = executionEvents.filter((event) =>
      receiptHashes.has(event.transactionHash.toLowerCase())
    );
    const { streamDetails, tradeRollups } = this.buildRunTradeDetails(
      runExecutionEvents,
      localData
    );
    
    // Calculate gas costs
    let totalGasUsed = BigInt(0);
    let totalGasCost = BigInt(0);
    
    for (const receipt of receipts) {
      totalGasUsed += receipt.gasUsed;
      const gasPrice = receipt.gasPrice || BigInt(0);
      totalGasCost += receipt.gasUsed * gasPrice;
    }
    
    const totalGasCostETH = ethers.formatEther(totalGasCost);
    
    // Group fees by token
    const feesByTokenMap = new Map<string, {
      symbol: string;
      botFee: bigint;
      protocolFee: bigint;
    }>();
    
    for (const event of feeEvents) {
      const token = event.token.toLowerCase();
      if (!feesByTokenMap.has(token)) {
        feesByTokenMap.set(token, {
          symbol: TOKEN_ADDRESSES[token] || token.slice(0, 8),
          botFee: BigInt(0),
          protocolFee: BigInt(0),
        });
      }
      
      const stats = feesByTokenMap.get(token)!;
      stats.botFee += BigInt(event.botFee);
      stats.protocolFee += BigInt(event.protocolFee);
    }
    
    // Get token prices
    const tokenAddresses = Array.from(feesByTokenMap.keys());
    const prices = await getTokenPrices(tokenAddresses);
    
    // Get ETH price for gas cost conversion
    const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const ethPrice = await getTokenPrices([WETH_ADDRESS]);
    const ethPriceUSD = ethPrice.get(WETH_ADDRESS.toLowerCase()) || 0;
    
    // Calculate USD values
    const feesByToken: { [address: string]: any } = {};
    let totalBotFeesUSD = 0;
    let totalProtocolFeesUSD = 0;
    
    for (const [token, stats] of feesByTokenMap.entries()) {
      const decimals = getTokenDecimals(token);
      const price = prices.get(token) || 0;
      
      const botFee = Number(stats.botFee) / Math.pow(10, decimals);
      const protocolFee = Number(stats.protocolFee) / Math.pow(10, decimals);
      
      const botFeeUSD = botFee * price;
      const protocolFeeUSD = protocolFee * price;
      
      totalBotFeesUSD += botFeeUSD;
      totalProtocolFeesUSD += protocolFeeUSD;
      
      feesByToken[token] = {
        symbol: stats.symbol,
        botFee: botFee.toFixed(6),
        protocolFee: protocolFee.toFixed(6),
        botFeeUSD,
        protocolFeeUSD,
      };
    }
    
    const totalGasCostUSD = parseFloat(totalGasCostETH) * ethPriceUSD;
    const netProfitUSD = totalBotFeesUSD - totalGasCostUSD;
    
    return {
      runNumber: 0, // Can be incremented if tracking runs
      timestamp: Date.now(),
      successCount,
      failCount,
      gasUsed: totalGasUsed.toString(),
      totalGasCostETH,
      totalGasCostUSD,
      feesByToken,
      totalBotFeesUSD,
      totalProtocolFeesUSD,
      netProfitUSD,
      streamDetails,
      tradeRollups,
    };
  }
  
  /**
   * Send Telegram alert with run stats
   */
  private async sendTelegramAlert(
    stats: RunStats | null,
    failedPairIds: string[],
    summary: {
      outstandingTrades: number;
      uniquePairQueues: number;
      successfulQueues: number;
      failedQueues: number;
    }
  ): Promise<void> {
    try {
      const secrets = await getSecrets();
      const botToken = secrets.TELEGRAM_BOT_TOKEN;
      const chatId = secrets.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        console.log("ℹ️  Telegram credentials not configured, skipping alert");
        return;
      }

      const alertState = this.loadAlertState();
      const versionChanged = alertState.lastNotifiedVersion !== BOT_VERSION;
      const queueChanged = alertState.lastQueuedTrades !== summary.outstandingTrades;
      const hasExecutionActivity = !!stats && (stats.successCount > 0 || stats.failCount > 0);
      const shouldNotifyQueue = summary.outstandingTrades > 0 && queueChanged;
      const shouldNotify =
        hasExecutionActivity ||
        failedPairIds.length > 0 ||
        shouldNotifyQueue ||
        versionChanged;

      if (!shouldNotify) {
        console.log("ℹ️  No notable changes, skipping Telegram alert");
        return;
      }

      console.log("📱 Sending Telegram alert...");
      
      let message = '';
      if (stats && stats.successCount > 0) {
        // Success alert with fees
        message = `✅ <b>Trades Executed</b>

📊 <b>Executions:</b> ${stats.successCount} successful${stats.failCount > 0 ? `, ${stats.failCount} failed` : ''}`;

        if (Object.keys(stats.feesByToken).length > 0) {
          message += `\n\n💰 <b>Bot Fees Earned:</b>`;
          for (const [token, data] of Object.entries(stats.feesByToken)) {
            message += `\n   • ${data.botFee} ${data.symbol} (≈$${data.botFeeUSD.toFixed(2)})`;
          }
          message += `\n   💵 Total: <b>≈$${stats.totalBotFeesUSD.toFixed(2)}</b>`;
          
          message += `\n\n🏛 <b>Protocol Fees:</b> ≈$${stats.totalProtocolFeesUSD.toFixed(2)}`;
        }
        
        message += `\n\n⛽ <b>Gas Cost:</b> ${parseFloat(stats.totalGasCostETH).toFixed(6)} ETH (≈$${stats.totalGasCostUSD.toFixed(2)})`;
        
        const profitSign = stats.netProfitUSD >= 0 ? '+' : '';
        const profitEmoji = stats.netProfitUSD >= 0 ? '📈' : '📉';
        message += `\n${profitEmoji} <b>Net Profit:</b> ${profitSign}$${stats.netProfitUSD.toFixed(2)}`;

        if (stats.tradeRollups.length > 0) {
          message += `\n\n📚 <b>Trades (run):</b>`;
          stats.tradeRollups.slice(0, 6).forEach((trade) => {
            message += `\n• #${trade.tradeId} ${trade.pair}: ${trade.streams} stream(s), in ${trade.totalAmountIn} ${trade.tokenInSymbol}, out ${trade.totalAmountOut} ${trade.tokenOutSymbol}`;
          });
          if (stats.tradeRollups.length > 6) {
            message += `\n• ... ${stats.tradeRollups.length - 6} more trade rollups`;
          }
        }

        if (stats.streamDetails.length > 0) {
          message += `\n\n🧩 <b>Streams (run):</b>`;
          stats.streamDetails.slice(0, 8).forEach((stream) => {
            const shortTx = `${stream.transactionHash.slice(0, 10)}...${stream.transactionHash.slice(-6)}`;
            message += `\n• #${stream.tradeId} ${stream.pair}: in ${stream.amountIn} ${stream.tokenInSymbol}, out ${stream.amountOut} ${stream.tokenOutSymbol}, ss ${stream.lastSweetSpot}, ${shortTx}`;
          });
          if (stats.streamDetails.length > 8) {
            message += `\n• ... ${stats.streamDetails.length - 8} more streams`;
          }
        }
        
      } else if (stats && stats.failCount > 0) {
        // Failure alert
        message = `⚠️ <b>Execution Failures</b>

❌ <b>Failed:</b> ${stats.failCount} trade(s)

📋 <b>Pair IDs:</b>`;
        failedPairIds.slice(0, 3).forEach(id => {
          message += `\n<code>${id.slice(0, 10)}...${id.slice(-6)}</code>`;
        });
      } else if (shouldNotifyQueue) {
        // Queue update when outstanding trade count changes.
        message = `📥 <b>Queue Update</b>

🧾 <b>Outstanding trades:</b> <code>${summary.outstandingTrades}</code>
🗂️ <b>Pair queues:</b> <code>${summary.uniquePairQueues}</code>`;
      } else if (versionChanged) {
        // One-time notification when bot runtime version changes.
        message = `🆕 <b>Bot Version Updated</b>

📌 <b>Version:</b> <code>${BOT_VERSION}</code>`;
      }

      if (!message.includes("<b>Version:</b>")) {
        message += `\n\n📌 <b>Version:</b> <code>${BOT_VERSION}</code>`;
      }
      message += `\n🧾 <b>Outstanding trades:</b> <code>${summary.outstandingTrades}</code>`;
      message += `\n🗂️ <b>Pair queues:</b> <code>${summary.uniquePairQueues}</code>`;
      message += `\n✅ <b>Queues settled:</b> <code>${summary.successfulQueues}</code>`;
      message += `\n❌ <b>Queues failed:</b> <code>${summary.failedQueues}</code>`;
      
      message += `\n\n⏰ ${new Date().toISOString()}`;
      
      // Send to Telegram
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      
      if (!response.ok) {
        const body = await response.text();
        console.warn(`⚠️  Failed to send Telegram alert: ${response.status}`, body ? body.slice(0, 200) : "");
      } else {
        console.log("📱 Telegram alert sent.");
        this.saveAlertState({
          lastNotifiedVersion: BOT_VERSION,
          lastQueuedTrades: summary.outstandingTrades,
        });
      }
    } catch (error) {
      console.warn(`⚠️  Error sending Telegram alert:`, error);
    }
  }
  
  /**
   * Display fee statistics
   */
  private displayFeeStats(stats: RunStats): void {
    console.log(`${"=".repeat(80)}`);
    console.log("💰 Fee & Cost Summary:");
    console.log(`${"=".repeat(80)}`);
    
    if (Object.keys(stats.feesByToken).length > 0) {
      console.log("\n📊 Bot Fees Earned:");
      for (const [token, data] of Object.entries(stats.feesByToken)) {
        console.log(`   • ${data.botFee} ${data.symbol} (≈$${data.botFeeUSD.toFixed(2)})`);
      }
      console.log(`   💵 Total: ≈$${stats.totalBotFeesUSD.toFixed(2)}`);
      
      console.log("\n🏛  Protocol Fees:");
      for (const [token, data] of Object.entries(stats.feesByToken)) {
        console.log(`   • ${data.protocolFee} ${data.symbol} (≈$${data.protocolFeeUSD.toFixed(2)})`);
      }
      console.log(`   💵 Total: ≈$${stats.totalProtocolFeesUSD.toFixed(2)}`);
    } else {
      console.log("\nℹ️  No fees earned this run (trades may still be settling)");
    }
    
    console.log(`\n⛽ Gas Cost: ${stats.totalGasCostETH} ETH (≈$${stats.totalGasCostUSD.toFixed(2)})`);
    
    const profitSign = stats.netProfitUSD >= 0 ? '+' : '';
    const profitEmoji = stats.netProfitUSD >= 0 ? '📈' : '📉';
    console.log(`${profitEmoji} Net Profit: ${profitSign}$${stats.netProfitUSD.toFixed(2)}`);
    
    console.log(`${"=".repeat(80)}\n`);
  }

  private displayStreamBreakdown(stats: RunStats): void {
    if (stats.streamDetails.length === 0) {
      console.log("ℹ️  No TradeStreamExecuted events detected for this run.\n");
      return;
    }

    console.log(`${"=".repeat(80)}`);
    console.log("🧩 Stream Breakdown (this run)");
    console.log(`${"=".repeat(80)}`);
    console.log("TRADE ROLLUP:");
    for (const trade of stats.tradeRollups) {
      console.log(
        `  • trade #${trade.tradeId} ${trade.pair}: ${trade.streams} stream(s), ` +
          `in ${trade.totalAmountIn} ${trade.tokenInSymbol}, out ${trade.totalAmountOut} ${trade.tokenOutSymbol}`
      );
    }

    console.log("\nSTREAMS:");
    for (const stream of stats.streamDetails.slice(0, 15)) {
      console.log(
        `  • trade #${stream.tradeId} ${stream.pair}: ` +
          `in ${stream.amountIn} ${stream.tokenInSymbol}, out ${stream.amountOut} ${stream.tokenOutSymbol}, ` +
          `lastSweetSpot ${stream.lastSweetSpot}, tx ${stream.transactionHash.slice(0, 10)}...${stream.transactionHash.slice(-6)}`
      );
    }
    if (stats.streamDetails.length > 15) {
      console.log(
        `  ... ${stats.streamDetails.length - 15} more streams omitted from console summary`
      );
    }
    console.log(`${"=".repeat(80)}\n`);
  }

  /**
   * Execute all outstanding trades from local data (sequential execution)
   */
  async executeOutstandingTrades(): Promise<RunStats | null> {
    try {
      console.log("🚀 Starting trade execution process...\n");

      // Track start block for fee event scanning
      const startBlock = await this.provider.getBlockNumber();
      const startTime = Date.now();

      // Load local data
      const localData = this.loadLocalData();
      const outstandingTradesCount = localData.outstandingTrades.length;

      if (localData.outstandingTrades.length === 0) {
        console.log("No outstanding trades — nothing to execute.");
        await this.sendTelegramAlert(null, [], {
          outstandingTrades: 0,
          uniquePairQueues: 0,
          successfulQueues: 0,
          failedQueues: 0,
        });
        return null;
      }

      // If Core whitelist is active, fail fast unless this signer is authorised.
      if (this.coreContractWithSigner) {
        const signerAddress = this.signer.address;
        const [botWhitelistCount, isWhitelisted] = await Promise.all([
          this.coreContract.botWhitelistCount(),
          this.coreContract.isBotWhitelisted(signerAddress),
        ]);

        if (botWhitelistCount > BigInt(0) && !isWhitelisted) {
          throw new Error(
            `Core bot whitelist is active (${botWhitelistCount} bot(s)), but signer ${signerAddress} is not whitelisted. As Core owner, call addBot(${signerAddress}) or use a whitelisted signer.`
          );
        }
      }

      // Get unique pair IDs
      const uniquePairIds = [
        ...new Set(localData.outstandingTrades.map((trade) => trade.pairId)),
      ];

      console.log(
        `📊 Found ${uniquePairIds.length} unique pair IDs to execute:`
      );
      uniquePairIds.forEach((pairId, index) => {
        const trades = localData.outstandingTrades.filter(
          (t) => t.pairId === pairId
        );
        console.log(`  ${index + 1}. ${pairId} (${trades.length} trades)`);
      });

      // Preflight: check executor wallet has enough ETH for gas (avoids cryptic "gas required exceeds allowance")
      if (this.coreContractWithSigner) {
        const feeData = await this.provider.getFeeData();
        const balance = await this.signer.provider!.getBalance(
          this.signer.address
        );
        // ~1.2M gas per executeTrades, maxFeePerGas for EIP-1559
        const gasPerTx = BigInt(1_200_000);
        const maxFee =
          feeData.maxFeePerGas ?? feeData.gasPrice ?? BigInt(50_000_000_000);
        const requiredWei = gasPerTx * maxFee * BigInt(uniquePairIds.length);
        if (balance < requiredWei) {
          console.warn(
            `\n⚠️ Executor wallet has insufficient ETH for gas.\n` +
              `   Address: ${this.signer.address}\n` +
              `   Balance: ${ethers.formatEther(balance)} ETH\n` +
              `   Required (approx): ${ethers.formatEther(requiredWei)} ETH for ${uniquePairIds.length} tx(s)\n` +
              `   Fund this wallet on mainnet to run executeTrades. Skipping execution this round.\n`
          );
          await this.sendTelegramAlert(null, [], {
            outstandingTrades: outstandingTradesCount,
            uniquePairQueues: uniquePairIds.length,
            successfulQueues: 0,
            failedQueues: 0,
          });
          return null;
        }
        console.log(
          `💰 Executor balance: ${ethers.formatEther(balance)} ETH (sufficient for gas)\n`
        );
      }

      // Sequential execution: submit and wait for each transaction
      let successCount = 0;
      let failCount = 0;
      const failedPairIds: string[] = [];
      const receipts: ethers.TransactionReceipt[] = [];
      let lastFailureReason: string | null = null;

      for (let i = 0; i < uniquePairIds.length; i++) {
        const pairId = uniquePairIds[i];
        const tradesInQueue = localData.outstandingTrades.filter(
          (t) => t.pairId === pairId
        ).length;

        console.log(
          `\n🔄 Executing trade queue ${i + 1}/${
            uniquePairIds.length
          } (${tradesInQueue} trades in queue) for pairId: ${pairId}`
        );

        try {
          // Submit transaction
          const tx = await this.executeTrades(pairId);

          // Wait for confirmation with 3-minute timeout
          console.log(`⏳ Waiting for confirmation (timeout: 3 minutes)...`);
          const receipt = await tx.wait(1, 180000); // 1 confirmation, 3min timeout

          if (receipt && receipt.status === 1) {
            console.log(
              `✅ Transaction confirmed in block ${receipt.blockNumber}`
            );
            successCount++;
            receipts.push(receipt);
          } else {
            lastFailureReason = `Transaction reverted (tx ${tx.hash})`;
            console.error(`❌ ${lastFailureReason}`);
            failCount++;
            failedPairIds.push(pairId);
          }

          // Small delay before next transaction (avoid nonce issues)
          if (i < uniquePairIds.length - 1) {
            console.log(`⏱️  Waiting 2 seconds before next transaction...`);
            await new Promise((res) => setTimeout(res, 2000));
          }
        } catch (error: any) {
          const errMsg =
            error.shortMessage ||
            error.message ||
            String(error).slice(0, 200);
          lastFailureReason = errMsg;

          // Check if it's a gas/funds error (node "allowance" = max gas affordable from balance)
          if (
            error.message?.includes("gas required exceeds") ||
            error.message?.includes("out of gas") ||
            error.code === "INSUFFICIENT_FUNDS"
          ) {
            console.warn(
              `⚠️ Insufficient ETH for gas (executor wallet needs more ETH). PairId ${pairId}, skipping this round.`
            );
            failCount++;
            failedPairIds.push(pairId);
            continue; // Skip to next pairId
          }

          // For other errors, log and continue
          console.error(
            `❌ Failed to execute trades for pairId ${pairId}:`,
            errMsg
          );
          failCount++;
          failedPairIds.push(pairId);
        }
      }

      // Final summary
      console.log(`\n${"=".repeat(80)}`);
      console.log("📊 Execution Summary:");
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ❌ Failed: ${failCount}`);
      console.log(`  📝 Total: ${uniquePairIds.length}`);
      if (failedPairIds.length > 0) {
        console.log(`  ⚠️  Failed pair IDs will be retried in the next run:`);
        failedPairIds.forEach((id) => console.log(`     - ${id}`));
        if (lastFailureReason) {
          // Single line so run-monitor.sh can grep "Last failure reason:"
          console.log(`  🔍 Last failure reason: ${lastFailureReason.replace(/\n/g, " ").slice(0, 300)}`);
        }
      }
      console.log(`${"=".repeat(80)}\n`);

      // Calculate fee stats if we had successful executions
      let runStats: RunStats | null = null;
      
      if (successCount > 0 && receipts.length > 0) {
        console.log("💰 Calculating fees and gas costs...\n");
        runStats = await this.calculateRunStats(
          startBlock,
          receipts,
          successCount,
          failCount,
          localData
        );
        
        // Display fee summary
        this.displayFeeStats(runStats);
        this.displayStreamBreakdown(runStats);
      }
      
      // Send Telegram alert when credentials are configured (success, failure, or heartbeat)
      let outstandingTradesAfterRun = outstandingTradesCount;
      try {
        const latest = await this.getAllActiveTrades();
        outstandingTradesAfterRun = latest.activeTrades.length;
      } catch (error) {
        console.warn(
          "⚠️  Could not refresh outstanding trade count after execution, using pre-run count"
        );
      }

      await this.sendTelegramAlert(runStats, failedPairIds, {
        outstandingTrades: outstandingTradesAfterRun,
        uniquePairQueues: uniquePairIds.length,
        successfulQueues: successCount,
        failedQueues: failCount,
      });

      console.log("✅ Trade execution process completed!");
      return runStats;
    } catch (error) {
      console.error("❌ Error during trade execution:", error);
      throw error;
    }
  }

  /**
   * Run the monitor
   */
  async run(): Promise<void> {
    try {
      const result = await this.getAllActiveTrades();
      this.displayTrades(result);

      const localData = this.loadLocalData();
      this.persistLocalData({
        lastScannedBlock: localData.lastScannedBlock,
        tradeCache: localData.tradeCache || {},
        ongoingTrades: result.activeTrades,
      });
    } catch (error) {
      console.error("❌ Monitor failed:", error);
      process.exit(1);
    }
  }
}
