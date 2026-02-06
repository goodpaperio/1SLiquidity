#!/usr/bin/env node

import { TradeMonitor } from "./monitor";

async function main() {
  try {
    console.log("🚀 Starting 1SLiquidity Trade Execution...\n");

    const monitor = new TradeMonitor();
    await monitor.executeOutstandingTrades();

    console.log("\n✅ Trade execution process completed!");
  } catch (error) {
    console.error("❌ Trade execution failed:", error);
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
