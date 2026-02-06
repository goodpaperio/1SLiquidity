#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monitor_1 = require("./monitor");
async function main() {
    try {
        console.log("🚀 Starting 1SLiquidity Trade Execution...\n");
        const monitor = new monitor_1.TradeMonitor();
        await monitor.executeOutstandingTrades();
        console.log("\n✅ Trade execution process completed!");
    }
    catch (error) {
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
//# sourceMappingURL=execute-trades.js.map