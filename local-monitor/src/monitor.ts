import { ethers } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  CONTRACT_ADDRESSES,
  TOKEN_ADDRESSES,
  getProvider,
  getSigner,
  DEPLOYMENT_BLOCK,
} from "./config";
import {
  Trade,
  TradeDisplay,
  MonitorResult,
  TradeCreatedEvent,
  TradeStreamExecutedEvent,
  TradeCancelledEvent,
  TradeSettledEvent,
  CompletedTrade,
  TradeHistory,
  TradeMetadata,
  LocalData,
} from "./types";
import CoreABI from "./abi/Core.json";

export class TradeMonitor {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private coreContract: ethers.Contract;
  private coreContractWithSigner: ethers.Contract;
  private localDataPath: string;

  constructor() {
    this.provider = getProvider();
    this.coreContract = new ethers.Contract(
      CONTRACT_ADDRESSES.core,
      CoreABI,
      this.provider
    );

    // Only create signer if private key is available
    try {
      this.signer = getSigner();
      this.coreContractWithSigner = new ethers.Contract(
        CONTRACT_ADDRESSES.core,
        CoreABI,
        this.signer
      );
    } catch (error) {
      // No private key available - only read operations allowed
      this.signer = null as any;
      this.coreContractWithSigner = null as any;
    }

    this.localDataPath = join(process.cwd(), "localData.json");
  }

  /**
   * Load local data from file
   */
  private loadLocalData(): LocalData {
    if (!existsSync(this.localDataPath)) {
      return {
        lastRun: 0,
        outstandingTrades: [],
        lastUpdated: 0,
        contractAddress: CONTRACT_ADDRESSES.core,
      };
    }

    try {
      const data = readFileSync(this.localDataPath, "utf8");
      const loadedData: LocalData = JSON.parse(data);

      // Validate contract address - if it changed, clear outstanding trades
      if (
        loadedData.contractAddress &&
        loadedData.contractAddress.toLowerCase() !==
          CONTRACT_ADDRESSES.core.toLowerCase()
      ) {
        console.warn(
          `⚠️ Contract address changed from ${loadedData.contractAddress} to ${CONTRACT_ADDRESSES.core}. Clearing outstanding trades from old contract.`
        );
        return {
          lastRun: 0,
          outstandingTrades: [],
          lastUpdated: 0,
          contractAddress: CONTRACT_ADDRESSES.core,
        };
      }

      // Ensure contract address is set for backward compatibility
      if (!loadedData.contractAddress) {
        loadedData.contractAddress = CONTRACT_ADDRESSES.core;
      }

      return loadedData;
    } catch (error) {
      console.warn("⚠️ Failed to load local data, starting fresh:", error);
      return {
        lastRun: 0,
        outstandingTrades: [],
        lastUpdated: 0,
        contractAddress: CONTRACT_ADDRESSES.core,
      };
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
   * Update local data with current outstanding trades
   */
  private async updateLocalData(ongoingTrades: TradeDisplay[]): Promise<void> {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentBlock = await this.provider.getBlockNumber();

    // Convert TradeDisplay to TradeMetadata
    const outstandingTrades: TradeMetadata[] = ongoingTrades.map((trade) => ({
      tradeId: parseInt(trade.tradeId),
      pairId: this.calculatePairId(trade.tokenIn, trade.tokenOut),
      lastSweetSpot: parseInt(trade.lastSweetSpot),
      tokenIn: trade.tokenIn,
      tokenOut: trade.tokenOut,
      pair: trade.pair,
      owner: trade.owner,
      isInstasettlable: trade.isInstasettlable,
      lastUpdated: currentTime,
    }));

    const localData: LocalData = {
      lastRun: currentBlock,
      outstandingTrades,
      lastUpdated: currentTime,
      contractAddress: CONTRACT_ADDRESSES.core,
    };

    this.saveLocalData(localData);
    console.log(
      `💾 Updated local data with ${outstandingTrades.length} outstanding trades (contract: ${CONTRACT_ADDRESSES.core})`
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

  /**
   * Get the symbol for a token address
   */
  private getTokenSymbol(address: string): string {
    const lowerAddress = address.toLowerCase();
    return TOKEN_ADDRESSES[lowerAddress] || address.slice(0, 6) + "...";
  }

  /**
   * Format a token amount for display
   */
  private formatTokenAmount(amount: string, decimals: number = 18): string {
    const value = ethers.formatUnits(amount, decimals);
    const num = parseFloat(value);

    if (num === 0) return "0";
    if (num < 0.0001) return "< 0.0001";
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    if (num < 1000000) return (num / 1000).toFixed(2) + "K";
    return (num / 1000000).toFixed(2) + "M";
  }

  /**
   * Calculate trade progress percentage
   */
  private calculateProgress(realised: string, target: string): string {
    const realisedNum = parseFloat(ethers.formatEther(realised));
    const targetNum = parseFloat(ethers.formatEther(target));

    if (targetNum === 0) return "0%";
    const progress = (realisedNum / targetNum) * 100;
    return `${Math.min(progress, 100).toFixed(1)}%`;
  }

  /**
   * Convert a trade to display format
   */
  private tradeToDisplay(trade: Trade): TradeDisplay {
    const tokenInSymbol = this.getTokenSymbol(trade.tokenIn);
    const tokenOutSymbol = this.getTokenSymbol(trade.tokenOut);

    return {
      tradeId: trade.tradeId,
      pair: `${tokenInSymbol}/${tokenOutSymbol}`,
      tokenIn: trade.tokenIn, // Use actual address, not symbol
      tokenOut: trade.tokenOut, // Use actual address, not symbol
      amountIn: this.formatTokenAmount(trade.amountIn),
      amountRemaining: this.formatTokenAmount(trade.amountRemaining),
      targetAmountOut: this.formatTokenAmount(trade.targetAmountOut),
      realisedAmountOut: this.formatTokenAmount(trade.realisedAmountOut),
      progress: this.calculateProgress(
        trade.realisedAmountOut,
        trade.targetAmountOut
      ),
      isInstasettlable: trade.isInstasettlable,
      lastSweetSpot: trade.lastSweetSpot,
      attempts: trade.attempts,
      owner: trade.owner.slice(0, 6) + "..." + trade.owner.slice(-4),
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
      };
    } catch (error) {
      console.error(`Error fetching trade ${tradeId}:`, error);
      return null;
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
          const trade = await this.getTrade(tradeId);
          if (trade) {
            activeTrades.push(this.tradeToDisplay(trade));
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
    fromBlock: number = 0
  ): Promise<TradeCreatedEvent[]> {
    console.log(`🔍 Scanning TradeCreated events from block ${fromBlock}`);

    try {
      // Use the contract's built-in event filtering
      const filter = this.coreContract.filters.TradeCreated();
      const events = await this.coreContract.queryFilter(filter, fromBlock);

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
          timestamp: 0, // Will be filled later
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
    fromBlock: number = 0
  ): Promise<TradeStreamExecutedEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeStreamExecuted();
      const events = await this.coreContract.queryFilter(filter, fromBlock);

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          amountIn: eventLog.args?.amountIn.toString(),
          realisedAmountOut: eventLog.args?.realisedAmountOut.toString(),
          lastSweetSpot: Number(eventLog.args?.lastSweetSpot),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          timestamp: 0, // Will be filled later
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
    fromBlock: number = 0
  ): Promise<TradeCancelledEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeCancelled();
      const events = await this.coreContract.queryFilter(filter, fromBlock);

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          amountRemaining: eventLog.args?.amountRemaining.toString(),
          realisedAmountOut: eventLog.args?.realisedAmountOut.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          timestamp: 0, // Will be filled later
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
  private async scanSettledEvents(
    fromBlock: number = 0
  ): Promise<TradeSettledEvent[]> {
    try {
      const filter = this.coreContract.filters.TradeSettled();
      const events = await this.coreContract.queryFilter(filter, fromBlock);

      return events.map((event) => {
        const eventLog = event as ethers.EventLog;
        return {
          tradeId: Number(eventLog.args?.tradeId),
          settler: eventLog.args?.settler,
          totalAmountIn: eventLog.args?.totalAmountIn.toString(),
          totalAmountOut: eventLog.args?.totalAmountOut.toString(),
          blockNumber: eventLog.blockNumber,
          transactionHash: eventLog.transactionHash,
          timestamp: 0, // Will be filled later
        };
      });
    } catch (error) {
      console.error(`❌ Error scanning TradeSettled events:`, error);
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
   * Analyze trade history and determine completion status
   */
  private async analyzeTradeHistory(): Promise<TradeHistory> {
    console.log("🔍 Scanning historical events...");

    // Get current block
    const currentBlock = await this.provider.getBlockNumber();

    // For historical analysis, always scan from deployment block to get complete history
    // Start from the actual deployment block of the Core contract
    const fromBlock = DEPLOYMENT_BLOCK;

    console.log(
      `📊 Scanning from deployment block ${fromBlock} to ${currentBlock} for complete history`
    );

    // Scan all events in parallel
    const [createdEvents, executionEvents, cancelledEvents, settledEvents] =
      await Promise.all([
        this.scanTradeCreatedEvents(fromBlock),
        this.scanExecutionEvents(fromBlock),
        this.scanCancelledEvents(fromBlock),
        this.scanSettledEvents(fromBlock),
      ]);

    console.log(
      `📊 Found events: Created=${createdEvents.length}, Executed=${executionEvents.length}, Cancelled=${cancelledEvents.length}, Settled=${settledEvents.length}`
    );

    // Fill timestamps
    const allBlocks = new Set([
      ...createdEvents.map((e) => e.blockNumber),
      ...executionEvents.map((e) => e.blockNumber),
      ...cancelledEvents.map((e) => e.blockNumber),
      ...settledEvents.map((e) => e.blockNumber),
    ]);

    const blockTimestamps = new Map<number, number>();
    for (const blockNumber of allBlocks) {
      const timestamp = await this.getBlockTimestamp(blockNumber);
      blockTimestamps.set(blockNumber, timestamp);
    }

    // Update timestamps
    createdEvents.forEach((event) => {
      event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
    });
    executionEvents.forEach((event) => {
      event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
    });
    cancelledEvents.forEach((event) => {
      event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
    });
    settledEvents.forEach((event) => {
      event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
    });

    // Group events by trade ID
    const executionMap = new Map<number, TradeStreamExecutedEvent[]>();
    executionEvents.forEach((event) => {
      if (!executionMap.has(event.tradeId)) {
        executionMap.set(event.tradeId, []);
      }
      executionMap.get(event.tradeId)!.push(event);
    });

    const cancelledMap = new Map<number, TradeCancelledEvent>();
    cancelledEvents.forEach((event) => {
      cancelledMap.set(event.tradeId, event);
    });

    const settledMap = new Map<number, TradeSettledEvent>();
    settledEvents.forEach((event) => {
      settledMap.set(event.tradeId, event);
    });

    // Determine completion status for each created trade
    const completedTrades: CompletedTrade[] = [];
    const ongoingTrades: TradeDisplay[] = [];

    for (const createdEvent of createdEvents) {
      const tradeId = createdEvent.tradeId;
      const executions = executionMap.get(tradeId) || [];
      const cancelled = cancelledMap.get(tradeId);
      const settled = settledMap.get(tradeId);

      const tokenInSymbol = this.getTokenSymbol(createdEvent.tokenIn);
      const tokenOutSymbol = this.getTokenSymbol(createdEvent.tokenOut);
      const pair = `${tokenInSymbol}/${tokenOutSymbol}`;

      // Calculate total realized amount from executions
      const totalRealized = executions.reduce(
        (sum, exec) => sum + BigInt(exec.realisedAmountOut),
        BigInt(0)
      );

      // Determine completion status
      let completionType: "executed" | "cancelled" | "settled" | null = null;
      let completionTime = 0;

      if (settled) {
        completionType = "settled";
        completionTime = settled.timestamp;
      } else if (cancelled) {
        completionType = "cancelled";
        completionTime = cancelled.timestamp;
      } else if (executions.length > 0) {
        // Check if trade is fully executed by comparing with target amount
        const targetAmount = BigInt(createdEvent.minAmountOut);
        if (totalRealized >= targetAmount) {
          completionType = "executed";
          completionTime = executions[executions.length - 1].timestamp;
        }
      }

      if (completionType) {
        // Trade is completed
        const finalProgress =
          createdEvent.minAmountOut !== "0"
            ? (Number(totalRealized) / Number(createdEvent.minAmountOut)) * 100
            : 0;

        completedTrades.push({
          tradeId,
          pair,
          tokenIn: tokenInSymbol,
          tokenOut: tokenOutSymbol,
          amountIn: this.formatTokenAmount(createdEvent.amountIn),
          finalAmountOut: this.formatTokenAmount(totalRealized.toString()),
          executionCount: executions.length,
          completionTime,
          completionType,
          owner:
            createdEvent.user.slice(0, 6) + "..." + createdEvent.user.slice(-4),
          totalExecutions: executions.length,
          finalProgress: Math.min(finalProgress, 100),
        });
      } else {
        // Trade is ongoing - get current state from contract
        try {
          const currentTrade = await this.getTrade(tradeId);
          if (currentTrade && (await this.isTradeActive(tradeId))) {
            ongoingTrades.push(this.tradeToDisplay(currentTrade));
          }
        } catch (error) {
          // Trade might not exist anymore, skip
        }
      }
    }

    // Sort completed trades by completion time (newest first)
    completedTrades.sort((a, b) => b.completionTime - a.completionTime);

    const totalTrades = createdEvents.length;
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
      console.log("📊 No ongoing trades found");
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
        "Insta"
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
          (trade.isInstasettlable ? "✓" : "✗")
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

      // Update local data with current outstanding trades (only for execution purposes)
      await this.updateLocalData(history.ongoingTrades);
    } catch (error) {
      console.error("❌ Error during historical analysis:", error);
      throw error;
    }
  }

  /**
   * Execute trades for a specific pair ID
   */
  async executeTrades(pairId: string): Promise<string> {
    try {
      if (!this.coreContractWithSigner) {
        throw new Error("Private key not available - cannot execute trades");
      }

      console.log(`🚀 Executing trades for pairId: ${pairId}`);

      // Call the executeTrades function on the contract using signer
      const tx = await this.coreContractWithSigner.executeTrades(pairId);
      console.log(`📝 Transaction submitted: ${tx.hash}`);

      // Wait for transaction to be mined with a timeout and fallback
      const provider = this.signer?.provider ?? this.provider;
      let receipt: ethers.TransactionReceipt | null = null;
      try {
        // ethers v6: waitForTransaction(hash, confirmations?, timeoutMs?)
        receipt = await provider.waitForTransaction(tx.hash, 1, 60000);
      } catch (waitErr: any) {
        const msg = (waitErr?.message || "").toLowerCase();
        if (
          msg.includes("canceled") ||
          msg.includes("cancelled") ||
          msg.includes("timeout")
        ) {
          console.warn(
            `⏱️ Timeout waiting for tx ${tx.hash}. Moving to next pair.`
          );
          return tx.hash; // return hash so caller can log progress and continue
        }
        throw waitErr;
      }

      if (receipt) {
        console.log(
          `✅ Transaction confirmed in block: ${receipt.blockNumber}`
        );
      } else {
        console.warn(`⏱️ No receipt for ${tx.hash} within timeout window.`);
      }

      return tx.hash;
    } catch (error) {
      console.error(`❌ Failed to execute trades for pairId ${pairId}:`, error);
      throw error;
    }
  }

  /**
   * Execute all outstanding trades from local data
   */
  async executeOutstandingTrades(): Promise<void> {
    try {
      console.log("🚀 Starting trade execution process...\n");

      // Load local data
      const localData = this.loadLocalData();

      if (localData.outstandingTrades.length === 0) {
        console.log("📊 No outstanding trades to execute");
        return;
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

      // Stage 1: submit all transactions (sequential sends, no waiting)
      const submissions: { pairId: string; hash: string }[] = [];
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
          const txHash = await this.executeTrades(pairId);
          submissions.push({ pairId, hash: txHash });
        } catch (error) {
          console.error(
            `❌ Failed to submit executeTrades for pairId ${pairId}:`,
            error
          );
        }
      }

      if (submissions.length === 0) {
        console.log("⚠️ No transactions submitted this round.");
        return;
      }

      // Stage 2: poll all receipts concurrently for up to 5 minutes
      console.log("\n⏳ Waiting for confirmations (up to 5 minutes)...");
      const deadline = Date.now() + 5 * 60 * 1000;
      const statuses: Record<string, "confirmed" | "pending"> = {};
      submissions.forEach((s) => (statuses[s.hash] = "pending"));

      const pollOnce = async (hash: string) => {
        try {
          return await this.provider.getTransactionReceipt(hash);
        } catch {
          return null;
        }
      };

      while (Date.now() < deadline) {
        const receipts = await Promise.all(
          submissions.map((s) => pollOnce(s.hash))
        );
        let allDone = true;
        receipts.forEach((r, idx) => {
          if (r && statuses[submissions[idx].hash] !== "confirmed") {
            console.log(
              `✅ ${submissions[idx].hash} confirmed in block ${r.blockNumber}`
            );
            statuses[submissions[idx].hash] = "confirmed";
          }
          if (!r) allDone = false;
        });
        if (allDone) break;
        await new Promise((res) => setTimeout(res, 10_000));
      }

      const confirmed = Object.values(statuses).filter(
        (s) => s === "confirmed"
      ).length;
      const pending = submissions.length - confirmed;
      console.log(
        `\n📊 Execution summary: confirmed=${confirmed}, pending=${pending}, total=${submissions.length}`
      );
      if (pending > 0) {
        console.log("ℹ️ Pending txs will be picked up by the next run.");
      }
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

      // Update local data with current outstanding trades
      await this.updateLocalData(result.activeTrades);
    } catch (error) {
      console.error("❌ Monitor failed:", error);
      process.exit(1);
    }
  }
}
