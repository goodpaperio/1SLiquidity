"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeMonitor = void 0;
const ethers_1 = require("ethers");
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
const Core_json_1 = __importDefault(require("./abi/Core.json"));
class TradeMonitor {
    constructor() {
        this.provider = (0, config_1.getProvider)();
        this.coreContract = new ethers_1.ethers.Contract(config_1.CONTRACT_ADDRESSES.core, Core_json_1.default, this.provider);
        // Only create signer if private key is available
        try {
            this.signer = (0, config_1.getSigner)();
            this.coreContractWithSigner = new ethers_1.ethers.Contract(config_1.CONTRACT_ADDRESSES.core, Core_json_1.default, this.signer);
        }
        catch (error) {
            // No private key available - only read operations allowed
            this.signer = null;
            this.coreContractWithSigner = null;
        }
        this.localDataPath = (0, path_1.join)(process.cwd(), "localData.json");
    }
    /**
     * Load local data from file
     */
    loadLocalData() {
        if (!(0, fs_1.existsSync)(this.localDataPath)) {
            return {
                lastRun: 0,
                outstandingTrades: [],
                lastUpdated: 0,
                contractAddress: config_1.CONTRACT_ADDRESSES.core,
            };
        }
        try {
            const data = (0, fs_1.readFileSync)(this.localDataPath, "utf8");
            const loadedData = JSON.parse(data);
            // Validate contract address - if it changed, clear outstanding trades
            if (loadedData.contractAddress &&
                loadedData.contractAddress.toLowerCase() !==
                    config_1.CONTRACT_ADDRESSES.core.toLowerCase()) {
                console.warn(`⚠️ Contract address changed from ${loadedData.contractAddress} to ${config_1.CONTRACT_ADDRESSES.core}. Clearing outstanding trades from old contract.`);
                return {
                    lastRun: 0,
                    outstandingTrades: [],
                    lastUpdated: 0,
                    contractAddress: config_1.CONTRACT_ADDRESSES.core,
                };
            }
            // Ensure contract address is set for backward compatibility
            if (!loadedData.contractAddress) {
                loadedData.contractAddress = config_1.CONTRACT_ADDRESSES.core;
            }
            return loadedData;
        }
        catch (error) {
            console.warn("⚠️ Failed to load local data, starting fresh:", error);
            return {
                lastRun: 0,
                outstandingTrades: [],
                lastUpdated: 0,
                contractAddress: config_1.CONTRACT_ADDRESSES.core,
            };
        }
    }
    /**
     * Save local data to file
     */
    saveLocalData(data) {
        try {
            (0, fs_1.writeFileSync)(this.localDataPath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error("❌ Failed to save local data:", error);
        }
    }
    /**
     * Update local data with current outstanding trades
     */
    async updateLocalData(ongoingTrades) {
        const currentTime = Math.floor(Date.now() / 1000);
        const currentBlock = await this.provider.getBlockNumber();
        // Convert TradeDisplay to TradeMetadata
        const outstandingTrades = ongoingTrades.map((trade) => ({
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
        const localData = {
            lastRun: currentBlock,
            outstandingTrades,
            lastUpdated: currentTime,
            contractAddress: config_1.CONTRACT_ADDRESSES.core,
        };
        this.saveLocalData(localData);
        console.log(`💾 Updated local data with ${outstandingTrades.length} outstanding trades (contract: ${config_1.CONTRACT_ADDRESSES.core})`);
    }
    /**
     * Calculate pair ID (keccak256 hash of token addresses) - matches contract logic
     */
    calculatePairId(tokenIn, tokenOut) {
        // Use the same calculation as the smart contract: keccak256(abi.encode(tokenIn, tokenOut))
        return ethers_1.ethers.keccak256(ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["address", "address"], [tokenIn, tokenOut]));
    }
    /**
     * Get the symbol for a token address
     */
    getTokenSymbol(address) {
        const lowerAddress = address.toLowerCase();
        return config_1.TOKEN_ADDRESSES[lowerAddress] || address.slice(0, 6) + "...";
    }
    /**
     * Format a token amount for display
     */
    formatTokenAmount(amount, decimals = 18) {
        const value = ethers_1.ethers.formatUnits(amount, decimals);
        const num = parseFloat(value);
        if (num === 0)
            return "0";
        if (num < 0.0001)
            return "< 0.0001";
        if (num < 1)
            return num.toFixed(6);
        if (num < 1000)
            return num.toFixed(4);
        if (num < 1000000)
            return (num / 1000).toFixed(2) + "K";
        return (num / 1000000).toFixed(2) + "M";
    }
    /**
     * Calculate trade progress percentage
     */
    calculateProgress(realised, target) {
        const realisedNum = parseFloat(ethers_1.ethers.formatEther(realised));
        const targetNum = parseFloat(ethers_1.ethers.formatEther(target));
        if (targetNum === 0)
            return "0%";
        const progress = (realisedNum / targetNum) * 100;
        return `${Math.min(progress, 100).toFixed(1)}%`;
    }
    /**
     * Convert a trade to display format
     */
    tradeToDisplay(trade) {
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
            progress: this.calculateProgress(trade.realisedAmountOut, trade.targetAmountOut),
            isInstasettlable: trade.isInstasettlable,
            lastSweetSpot: trade.lastSweetSpot,
            attempts: trade.attempts,
            owner: trade.owner.slice(0, 6) + "..." + trade.owner.slice(-4),
        };
    }
    /**
     * Check if a trade exists and is active
     */
    async isTradeActive(tradeId) {
        try {
            const trade = await this.coreContract.trades(tradeId);
            // A trade is active if it has a non-zero owner address
            return trade.owner !== "0x0000000000000000000000000000000000000000";
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get a single trade by ID
     */
    async getTrade(tradeId) {
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
        }
        catch (error) {
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
    async getAllActiveTrades() {
        try {
            console.log("🔍 Fetching contract state...");
            // Get the last trade ID
            const lastTradeId = await this.coreContract.lastTradeId();
            const lastTradeIdNum = Number(lastTradeId);
            console.log(`📊 Last trade ID: ${lastTradeIdNum}`);
            const activeTrades = [];
            // Iterate through all possible trade IDs
            for (let tradeId = 0; tradeId <= lastTradeIdNum; tradeId++) {
                if (await this.isTradeActive(tradeId)) {
                    try {
                        const trade = await this.getTrade(tradeId);
                        if (trade) {
                            activeTrades.push(this.tradeToDisplay(trade));
                        }
                    }
                    catch (error) {
                        // Trade might have been removed between isTradeActive check and getTrade
                        // This is rare but can happen - skip it
                        const errorMsg = error?.reason || error?.message || "";
                        if (!errorMsg.includes("Trade not found")) {
                            console.warn(`⚠️ Error fetching active trade ${tradeId}:`, errorMsg);
                        }
                    }
                }
            }
            return {
                totalTrades: lastTradeIdNum + 1,
                activeTrades,
                lastTradeId: lastTradeId.toString(),
            };
        }
        catch (error) {
            console.error("❌ Error fetching trades:", error);
            throw error;
        }
    }
    /**
     * Scan for TradeCreated events
     */
    async scanTradeCreatedEvents(fromBlock = 0) {
        console.log(`🔍 Scanning TradeCreated events from block ${fromBlock}`);
        try {
            // Use the contract's built-in event filtering
            const filter = this.coreContract.filters.TradeCreated();
            const events = await this.coreContract.queryFilter(filter, fromBlock);
            console.log(`📊 Found ${events.length} TradeCreated events`);
            return events.map((event) => {
                const eventLog = event;
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
        }
        catch (error) {
            console.error(`❌ Error scanning TradeCreated events:`, error);
            return [];
        }
    }
    /**
     * Scan for TradeStreamExecuted events
     */
    async scanExecutionEvents(fromBlock = 0) {
        try {
            const filter = this.coreContract.filters.TradeStreamExecuted();
            const events = await this.coreContract.queryFilter(filter, fromBlock);
            return events.map((event) => {
                const eventLog = event;
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
        }
        catch (error) {
            console.error(`❌ Error scanning TradeStreamExecuted events:`, error);
            return [];
        }
    }
    /**
     * Scan for TradeCancelled events
     */
    async scanCancelledEvents(fromBlock = 0) {
        try {
            const filter = this.coreContract.filters.TradeCancelled();
            const events = await this.coreContract.queryFilter(filter, fromBlock);
            return events.map((event) => {
                const eventLog = event;
                return {
                    isAutocancelled: Boolean(eventLog.args?.isAutocancelled),
                    tradeId: Number(eventLog.args?.tradeId),
                    amountRemaining: eventLog.args?.amountRemaining.toString(),
                    realisedAmountOut: eventLog.args?.realisedAmountOut.toString(),
                    blockNumber: eventLog.blockNumber,
                    transactionHash: eventLog.transactionHash,
                    timestamp: 0, // Will be filled later
                };
            });
        }
        catch (error) {
            console.error(`❌ Error scanning TradeCancelled events:`, error);
            return [];
        }
    }
    /**
     * Scan for TradeSettled events
     */
    async scanTradeInstasettledEvents(fromBlock = 0) {
        try {
            const filter = this.coreContract.filters.TradeInstasettled();
            const events = await this.coreContract.queryFilter(filter, fromBlock);
            return events.map((event) => {
                const eventLog = event;
                return {
                    tradeId: Number(eventLog.args?.tradeId),
                    settler: eventLog.args?.settler,
                    totalAmountIn: eventLog.args?.totalAmountIn.toString(),
                    totalAmountOut: eventLog.args?.totalAmountOut.toString(),
                    totalFees: eventLog.args?.totalFees.toString(),
                    blockNumber: eventLog.blockNumber,
                    transactionHash: eventLog.transactionHash,
                    timestamp: 0, // Will be filled later
                };
            });
        }
        catch (error) {
            console.error(`❌ Error scanning TradeInstasettled events:`, error);
            return [];
        }
    }
    /**
     * Scan for TradeCompleted events
     */
    async scanTradeCompletedEvents(fromBlock = 0) {
        try {
            const filter = this.coreContract.filters.TradeCompleted();
            const events = await this.coreContract.queryFilter(filter, fromBlock);
            return events.map((event) => {
                const eventLog = event;
                return {
                    tradeId: Number(eventLog.args?.tradeId),
                    finalRealisedAmountOut: eventLog.args?.finalRealisedAmountOut.toString(),
                    blockNumber: eventLog.blockNumber,
                    transactionHash: eventLog.transactionHash,
                    timestamp: 0, // Will be filled later
                };
            });
        }
        catch (error) {
            console.error(`❌ Error scanning TradeCompleted events:`, error);
            return [];
        }
    }
    /**
     * Get block timestamp
     */
    async getBlockTimestamp(blockNumber) {
        try {
            const block = await this.provider.getBlock(blockNumber);
            return block?.timestamp || 0;
        }
        catch (error) {
            console.warn(`Failed to get timestamp for block ${blockNumber}:`, error);
            return 0;
        }
    }
    /**
     * Analyze trade history and determine completion status
     */
    async analyzeTradeHistory() {
        console.log("🔍 Scanning historical events...");
        // Get current block
        const currentBlock = await this.provider.getBlockNumber();
        // For historical analysis, always scan from deployment block to get complete history
        // Start from the actual deployment block of the Core contract
        const fromBlock = config_1.DEPLOYMENT_BLOCK;
        console.log(`📊 Scanning from deployment block ${fromBlock} to ${currentBlock} for complete history`);
        // Scan all events in parallel
        const [createdEvents, executionEvents, cancelledEvents, instasettledEvents, completedEvents,] = await Promise.all([
            this.scanTradeCreatedEvents(fromBlock),
            this.scanExecutionEvents(fromBlock),
            this.scanCancelledEvents(fromBlock),
            this.scanTradeInstasettledEvents(fromBlock),
            this.scanTradeCompletedEvents(fromBlock),
        ]);
        console.log(`📊 Found events: Created=${createdEvents.length}, Executed=${executionEvents.length}, Cancelled=${cancelledEvents.length}, Instasettled=${instasettledEvents.length}, Completed=${completedEvents.length}`);
        // Fill timestamps
        const allBlocks = new Set([
            ...createdEvents.map((e) => e.blockNumber),
            ...executionEvents.map((e) => e.blockNumber),
            ...cancelledEvents.map((e) => e.blockNumber),
            ...instasettledEvents.map((e) => e.blockNumber),
            ...completedEvents.map((e) => e.blockNumber),
        ]);
        const blockTimestamps = new Map();
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
        instasettledEvents.forEach((event) => {
            event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
        });
        completedEvents.forEach((event) => {
            event.timestamp = blockTimestamps.get(event.blockNumber) || 0;
        });
        // Group events by trade ID
        const executionMap = new Map();
        executionEvents.forEach((event) => {
            if (!executionMap.has(event.tradeId)) {
                executionMap.set(event.tradeId, []);
            }
            executionMap.get(event.tradeId).push(event);
        });
        const cancelledMap = new Map();
        cancelledEvents.forEach((event) => {
            cancelledMap.set(event.tradeId, event);
        });
        const instasettledMap = new Map();
        instasettledEvents.forEach((event) => {
            instasettledMap.set(event.tradeId, event);
        });
        const completedMap = new Map();
        completedEvents.forEach((event) => {
            completedMap.set(event.tradeId, event);
        });
        // Determine completion status for each created trade (purely event-based)
        const completedTrades = [];
        const ongoingTrades = [];
        for (const createdEvent of createdEvents) {
            const tradeId = createdEvent.tradeId;
            const executions = executionMap.get(tradeId) || [];
            const cancelled = cancelledMap.get(tradeId);
            const instasettled = instasettledMap.get(tradeId);
            const completed = completedMap.get(tradeId);
            const tokenInSymbol = this.getTokenSymbol(createdEvent.tokenIn);
            const tokenOutSymbol = this.getTokenSymbol(createdEvent.tokenOut);
            const pair = `${tokenInSymbol}/${tokenOutSymbol}`;
            // Calculate total realized amount from executions
            const totalRealized = executions.reduce((sum, exec) => sum + BigInt(exec.realisedAmountOut), BigInt(0));
            // Determine completion status (priority: cancelled > instasettled > completed > executed)
            let completionType = null;
            let completionTime = 0;
            let finalAmountOut = totalRealized;
            if (cancelled) {
                completionType = "cancelled";
                completionTime = cancelled.timestamp;
                finalAmountOut = BigInt(cancelled.realisedAmountOut);
            }
            else if (instasettled) {
                completionType = "instasettled";
                completionTime = instasettled.timestamp;
                finalAmountOut = BigInt(instasettled.totalAmountOut);
            }
            else if (completed) {
                completionType = "completed";
                completionTime = completed.timestamp;
                finalAmountOut = BigInt(completed.finalRealisedAmountOut);
            }
            else if (executions.length > 0) {
                // Check if trade is fully executed by comparing with target amount
                const targetAmount = BigInt(createdEvent.minAmountOut);
                if (totalRealized >= targetAmount) {
                    completionType = "executed";
                    completionTime = executions[executions.length - 1].timestamp;
                    finalAmountOut = totalRealized;
                }
            }
            if (completionType) {
                // Trade is completed - use event data
                const finalProgress = createdEvent.minAmountOut !== "0"
                    ? (Number(finalAmountOut) / Number(createdEvent.minAmountOut)) * 100
                    : 0;
                completedTrades.push({
                    tradeId,
                    pair,
                    tokenIn: tokenInSymbol,
                    tokenOut: tokenOutSymbol,
                    amountIn: this.formatTokenAmount(createdEvent.amountIn),
                    finalAmountOut: this.formatTokenAmount(finalAmountOut.toString()),
                    executionCount: executions.length,
                    completionTime,
                    completionType,
                    owner: createdEvent.user.slice(0, 6) + "..." + createdEvent.user.slice(-4),
                    totalExecutions: executions.length,
                    finalProgress: Math.min(finalProgress, 100),
                });
            }
            else {
                // Trade is ongoing - build state from events
                // Calculate current state from accumulated executions
                const lastExecution = executions[executions.length - 1];
                // Calculate remaining amount by subtracting executed amounts from initial amount
                const totalExecuted = executions.reduce((sum, exec) => sum + BigInt(exec.amountIn), BigInt(0));
                const estimatedRemaining = BigInt(createdEvent.amountIn) > totalExecuted
                    ? BigInt(createdEvent.amountIn) - totalExecuted
                    : BigInt(0);
                // Read actual attempts from contract (not just counting events)
                // This accounts for failed executions that increment attempts but don't emit TradeStreamExecuted
                let actualAttempts = executions.length;
                try {
                    const tradeFromContract = await this.coreContract.getTrade(tradeId);
                    actualAttempts = Number(tradeFromContract.attempts);
                }
                catch (error) {
                    // If read fails, fall back to event count
                    console.warn(`⚠️ Could not read attempts for trade ${tradeId}, using event count`);
                }
                ongoingTrades.push({
                    tradeId: tradeId.toString(),
                    pair,
                    tokenIn: createdEvent.tokenIn,
                    tokenOut: createdEvent.tokenOut,
                    amountIn: this.formatTokenAmount(createdEvent.amountIn),
                    amountRemaining: this.formatTokenAmount(estimatedRemaining.toString()),
                    targetAmountOut: this.formatTokenAmount(createdEvent.minAmountOut),
                    realisedAmountOut: this.formatTokenAmount(totalRealized.toString()),
                    progress: this.calculateProgress(totalRealized.toString(), createdEvent.minAmountOut),
                    isInstasettlable: createdEvent.isInstasettlable,
                    lastSweetSpot: lastExecution?.lastSweetSpot?.toString() ||
                        createdEvent.lastSweetSpot.toString(),
                    attempts: actualAttempts,
                    owner: createdEvent.user.slice(0, 6) + "..." + createdEvent.user.slice(-4),
                });
            }
        }
        // Sort completed trades by completion time (newest first)
        completedTrades.sort((a, b) => b.completionTime - a.completionTime);
        const totalTrades = createdEvents.length;
        const completionRate = totalTrades > 0 ? (completedTrades.length / totalTrades) * 100 : 0;
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
    displayTrades(result) {
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
        console.log("ID".padEnd(6) +
            "Pair".padEnd(15) +
            "Amount In".padEnd(15) +
            "Remaining".padEnd(15) +
            "Target Out".padEnd(15) +
            "Realised".padEnd(15) +
            "Progress".padEnd(10) +
            "Sweet Spot".padEnd(12) +
            "Attempts".padEnd(8) +
            "Owner".padEnd(15) +
            "Insta".padEnd(6));
        console.log("-".repeat(150));
        // Table rows
        result.activeTrades.forEach((trade) => {
            console.log(trade.tradeId.padEnd(6) +
                trade.pair.padEnd(15) +
                trade.amountIn.padEnd(15) +
                trade.amountRemaining.padEnd(15) +
                trade.targetAmountOut.padEnd(15) +
                trade.realisedAmountOut.padEnd(15) +
                trade.progress.padEnd(10) +
                trade.lastSweetSpot.padEnd(12) +
                trade.attempts.toString().padEnd(8) +
                trade.owner.padEnd(15) +
                (trade.isInstasettlable ? "✓" : "✗").padEnd(6));
        });
        console.log("=".repeat(150));
    }
    /**
     * Display completed trades in a formatted table
     */
    displayCompletedTrades(completedTrades) {
        if (completedTrades.length === 0) {
            console.log("📊 No completed trades found");
            return;
        }
        console.log("\n" + "=".repeat(120));
        console.log("✅ COMPLETED TRADES");
        console.log("=".repeat(120));
        // Header
        console.log("ID".padEnd(4) +
            "Pair".padEnd(12) +
            "Amount In".padEnd(12) +
            "Final Out".padEnd(12) +
            "Executions".padEnd(12) +
            "Progress".padEnd(10) +
            "Type".padEnd(10) +
            "Owner".padEnd(12) +
            "Completed");
        console.log("-".repeat(120));
        // Rows
        completedTrades.forEach((trade) => {
            const completionDate = new Date(trade.completionTime * 1000).toLocaleDateString();
            const progressStr = `${trade.finalProgress.toFixed(1)}%`;
            console.log(trade.tradeId.toString().padEnd(4) +
                trade.pair.padEnd(12) +
                trade.amountIn.padEnd(12) +
                trade.finalAmountOut.padEnd(12) +
                trade.executionCount.toString().padEnd(12) +
                progressStr.padEnd(10) +
                trade.completionType.padEnd(10) +
                trade.owner.padEnd(12) +
                completionDate);
        });
        console.log("=".repeat(120));
    }
    /**
     * Display ongoing trades in a formatted table
     */
    displayOngoingTrades(ongoingTrades) {
        if (ongoingTrades.length === 0) {
            console.log("📊 No ongoing trades found");
            return;
        }
        console.log("\n" + "=".repeat(120));
        console.log("🔄 ONGOING TRADES");
        console.log("=".repeat(120));
        // Header
        console.log("ID".padEnd(4) +
            "Pair".padEnd(12) +
            "Amount In".padEnd(12) +
            "Remaining".padEnd(12) +
            "Target Out".padEnd(12) +
            "Realised".padEnd(12) +
            "Progress".padEnd(10) +
            "Attempts".padEnd(10) +
            "Owner".padEnd(12) +
            "Insta");
        console.log("-".repeat(120));
        // Rows
        ongoingTrades.forEach((trade) => {
            console.log(trade.tradeId.toString().padEnd(4) +
                trade.pair.padEnd(12) +
                trade.amountIn.padEnd(12) +
                trade.amountRemaining.padEnd(12) +
                trade.targetAmountOut.padEnd(12) +
                trade.realisedAmountOut.padEnd(12) +
                trade.progress.padEnd(10) +
                trade.attempts.toString().padEnd(10) +
                trade.owner.padEnd(12) +
                (trade.isInstasettlable ? "✓" : "✗"));
        });
        console.log("=".repeat(120));
    }
    /**
     * Display trade history analysis
     */
    displayTradeHistory(history) {
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
    async runHistoricalAnalysis() {
        try {
            console.log("🚀 Starting 1SLiquidity Historical Trade Analysis...\n");
            const history = await this.analyzeTradeHistory();
            this.displayTradeHistory(history);
            // Update local data with current outstanding trades (only for execution purposes)
            await this.updateLocalData(history.ongoingTrades);
        }
        catch (error) {
            console.error("❌ Error during historical analysis:", error);
            throw error;
        }
    }
    /**
     * Execute trades for a specific pair ID (submits transaction and returns transaction response)
     */
    async executeTrades(pairId) {
        try {
            if (!this.coreContractWithSigner) {
                throw new Error("Private key not available - cannot execute trades");
            }
            console.log(`🚀 Executing trades for pairId: ${pairId}`);
            // Get fee data first
            const feeData = await this.provider.getFeeData();
            // Preflight gas estimate; skip if it reverts
            let gasLimitEst;
            try {
                gasLimitEst =
                    await this.coreContractWithSigner.executeTrades.estimateGas(pairId);
            }
            catch (estErr) {
                console.warn(`⚠️ Gas estimate failed for pairId ${pairId}; skipping this round.`, estErr);
                throw estErr;
            }
            // Add 50% padding to gas limit with 800k minimum
            let gasLimit = gasLimitEst + gasLimitEst / BigInt(2);
            if (gasLimit < BigInt(800000)) {
                gasLimit = BigInt(800000);
            }
            console.log(`⛽ Gas estimate: ${gasLimitEst}, using limit: ${gasLimit}`);
            // Call the executeTrades function on the contract using signer
            const tx = await this.coreContractWithSigner.executeTrades(pairId, {
                gasLimit,
                maxFeePerGas: feeData.maxFeePerGas ?? undefined,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
            });
            console.log(`📝 Transaction submitted: ${tx.hash}`);
            // Return full transaction object for sequential waiting
            return tx;
        }
        catch (error) {
            console.error(`❌ Failed to execute trades for pairId ${pairId}:`, error);
            throw error;
        }
    }
    /**
     * Execute all outstanding trades from local data (sequential execution)
     */
    async executeOutstandingTrades() {
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
            console.log(`📊 Found ${uniquePairIds.length} unique pair IDs to execute:`);
            uniquePairIds.forEach((pairId, index) => {
                const trades = localData.outstandingTrades.filter((t) => t.pairId === pairId);
                console.log(`  ${index + 1}. ${pairId} (${trades.length} trades)`);
            });
            // Sequential execution: submit and wait for each transaction
            let successCount = 0;
            let failCount = 0;
            const failedPairIds = [];
            for (let i = 0; i < uniquePairIds.length; i++) {
                const pairId = uniquePairIds[i];
                const tradesInQueue = localData.outstandingTrades.filter((t) => t.pairId === pairId).length;
                console.log(`\n🔄 Executing trade queue ${i + 1}/${uniquePairIds.length} (${tradesInQueue} trades in queue) for pairId: ${pairId}`);
                try {
                    // Submit transaction
                    const tx = await this.executeTrades(pairId);
                    // Wait for confirmation with 3-minute timeout
                    console.log(`⏳ Waiting for confirmation (timeout: 3 minutes)...`);
                    const receipt = await tx.wait(1, 180000); // 1 confirmation, 3min timeout
                    if (receipt && receipt.status === 1) {
                        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
                        successCount++;
                    }
                    else {
                        console.error(`❌ Transaction reverted: ${tx.hash}`);
                        failCount++;
                        failedPairIds.push(pairId);
                    }
                    // Small delay before next transaction (avoid nonce issues)
                    if (i < uniquePairIds.length - 1) {
                        console.log(`⏱️  Waiting 2 seconds before next transaction...`);
                        await new Promise((res) => setTimeout(res, 2000));
                    }
                }
                catch (error) {
                    // Check if it's a gas-related error
                    if (error.message?.includes("gas required exceeds") ||
                        error.message?.includes("out of gas") ||
                        error.code === "INSUFFICIENT_FUNDS") {
                        console.warn(`⚠️ Gas/funds insufficient for pairId ${pairId}, skipping this round`);
                        failCount++;
                        failedPairIds.push(pairId);
                        continue; // Skip to next pairId
                    }
                    // For other errors, log and continue
                    console.error(`❌ Failed to execute trades for pairId ${pairId}:`, error.shortMessage || error.message);
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
            }
            console.log(`${"=".repeat(80)}\n`);
            console.log("✅ Trade execution process completed!");
        }
        catch (error) {
            console.error("❌ Error during trade execution:", error);
            throw error;
        }
    }
    /**
     * Run the monitor
     */
    async run() {
        try {
            const result = await this.getAllActiveTrades();
            this.displayTrades(result);
            // Update local data with current outstanding trades
            await this.updateLocalData(result.activeTrades);
        }
        catch (error) {
            console.error("❌ Monitor failed:", error);
            process.exit(1);
        }
    }
}
exports.TradeMonitor = TradeMonitor;
//# sourceMappingURL=monitor.js.map