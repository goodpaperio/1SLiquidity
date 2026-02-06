#!/usr/bin/env node

import { TradeMonitor } from "./monitor";

async function main() {
  try {
    console.log("🧪 Testing complete 1SLiquidity workflow...\n");

    const monitor = new TradeMonitor();

    // Step 1: Run historical analysis
    console.log("🔍 Step 1: Running historical analysis...");
    await monitor.runHistoricalAnalysis();

    // Step 2: Show what would be executed
    console.log("\n🚀 Step 2: Checking outstanding trades for execution...");
    const localData = monitor["loadLocalData"]();

    if (localData.outstandingTrades.length === 0) {
      console.log("📊 No outstanding trades to execute");
      return;
    }

    const uniquePairIds = [
      ...new Set(localData.outstandingTrades.map((trade) => trade.pairId)),
    ];
    console.log(
      `📊 Found ${uniquePairIds.length} unique pair IDs that would be executed:`
    );
    uniquePairIds.forEach((pairId, index) => {
      const trades = localData.outstandingTrades.filter(
        (t) => t.pairId === pairId
      );
      console.log(`  ${index + 1}. ${pairId} (${trades.length} trades)`);
    });

    // Step 3: Simulate waiting
    console.log("\n⏳ Step 3: Simulating 24-second wait for transactions...");
    console.log(
      "   (In real execution, this would wait for transactions to be mined)"
    );

    // Step 4: Run historical analysis again
    console.log("\n🔍 Step 4: Running historical analysis again...");
    await monitor.runHistoricalAnalysis();

    console.log("\n✅ Complete workflow test completed!");
    console.log("📝 In production, Step 2 would execute actual transactions");
  } catch (error) {
    console.error("❌ Workflow test failed:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

main();
