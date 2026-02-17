#!/usr/bin/env node

import { TradeMonitor } from "./monitor";

async function main() {
  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes("--historical") || args.includes("-h")) {
    console.log("🚀 Starting 1SLiquidity Historical Trade Analysis...\n");
    const monitor = await TradeMonitor.create();
    await monitor.runHistoricalAnalysis();
  } else {
    console.log("🚀 Starting 1SLiquidity Trade Monitor...\n");
    const monitor = await TradeMonitor.create();
    await monitor.run();
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

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
