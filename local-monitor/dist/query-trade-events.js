"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Query TradeStreamExecuted events for a specific tradeId and analyze execution sequence.
 * Usage: npx ts-node src/query-trade-events.ts [tradeId]
 * Uses MAINNET_RPC_HTTP_URL from .env if set, otherwise public RPC.
 */
const ethers_1 = require("ethers");
require("dotenv/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("./config");
async function getProvider() {
    const rpc = process.env.MAINNET_RPC_HTTP_URL ||
        process.env.RPC_HTTP_URL ||
        "https://eth.llamarpc.com";
    return new ethers_1.ethers.JsonRpcProvider(rpc);
}
const CORE_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, "abi/Core.json"), "utf8"));
async function main() {
    const tradeId = parseInt(process.argv[2] ?? "2", 10);
    console.log(`\nQuerying TradeStreamExecuted events for tradeId ${tradeId}...\n`);
    const provider = await getProvider();
    const core = new ethers_1.ethers.Contract(config_1.CONTRACT_ADDRESSES.core, CORE_ABI, provider);
    // Get amountIn from contract (if trade exists)
    let amountIn;
    try {
        const trade = await core.getTrade(tradeId);
        amountIn = BigInt(trade.amountIn.toString());
    }
    catch {
        amountIn = 5000000n; // fallback
    }
    // Query TradeCreated to see initial state at placement
    const createdFilter = core.filters.TradeCreated(tradeId);
    const createdEvents = await core.queryFilter(createdFilter, config_1.DEPLOYMENT_BLOCK, 24490798 + 1000);
    const streamFilter = core.filters.TradeStreamExecuted(tradeId);
    const events = await core.queryFilter(streamFilter, config_1.DEPLOYMENT_BLOCK, 24490798 + 1000 // past the failed block
    );
    const completedFilter = core.filters.TradeCompleted(tradeId);
    const completedEvents = await core.queryFilter(completedFilter, config_1.DEPLOYMENT_BLOCK, 24490798 + 1000);
    // Report TradeCreated (placement) metadata
    if (createdEvents.length > 0) {
        const ce = createdEvents[0];
        const cargs = ce.args;
        console.log("\n--- TRADE CREATED (at placement, block " + ce.blockNumber + ") ---");
        console.log("  amountIn (ORIGINAL, immutable):     " + (cargs?.amountIn ?? "?")?.toString());
        console.log("  amountRemaining (after 1st stream): " + (cargs?.amountRemaining ?? "?")?.toString());
        console.log("  minAmountOut / target:              " + (cargs?.minAmountOut ?? "?")?.toString());
        console.log("  realisedAmountOut (after 1st):      " + (cargs?.realisedAmountOut ?? "?")?.toString());
        console.log("  lastSweetSpot:                      " + (cargs?.lastSweetSpot ?? "?")?.toString());
    }
    if (events.length === 0) {
        console.log("No TradeStreamExecuted events found for this tradeId.");
        return;
    }
    // Sort by block, then tx index
    events.sort((a, b) => a.blockNumber - b.blockNumber ||
        a.index - b.index);
    console.log("=".repeat(80));
    console.log(`TRADE ${tradeId} - EXECUTION SEQUENCE (${events.length} streams)`);
    console.log("=".repeat(80));
    let runningRemaining = amountIn;
    console.log(`amountIn (from contract): ${amountIn.toString()} (${Number(amountIn) / 1e6} USDC)\n`);
    let cumulativeOut = 0n;
    events.forEach((evt, i) => {
        const log = evt;
        const args = log.args;
        const streamVolume = args?.amountIn ?? 0n;
        const amountOut = args?.realisedAmountOut ?? 0n;
        const lastSweetSpot = Number(args?.lastSweetSpot ?? 0);
        // lastSweetSpot in the event is AFTER the decrement; sweetSpot used for this chunk was lastSweetSpot+1 when lastSweetSpot was 1,2,3
        // Or when lastSweetSpot=0, we used sweetSpot=1 (final chunk)
        const sweetSpotUsed = lastSweetSpot === 0 ? 1 : lastSweetSpot + 1;
        runningRemaining -= streamVolume;
        cumulativeOut += amountOut;
        console.log(`\nStream #${i + 1} (block ${log.blockNumber}, tx ${log.transactionHash})`);
        console.log(`  streamVolume (USDC):  ${streamVolume.toString().padStart(12)} (${Number(streamVolume) / 1e6} USDC)`);
        console.log(`  amountOut (WETH):     ${amountOut.toString().padStart(12)} wei`);
        console.log(`  lastSweetSpot (after): ${lastSweetSpot}`);
        console.log(`  sweetSpot used:        ${sweetSpotUsed} (inferred)`);
        console.log(`  amountRemaining after: ${runningRemaining.toString().padStart(12)}`);
    });
    console.log("\n" + "=".repeat(80));
    console.log("ANALYSIS");
    console.log("=".repeat(80));
    const sweetSpots = events.map((evt) => {
        const log = evt;
        const lastSweetSpot = Number(log.args?.lastSweetSpot ?? 0);
        return lastSweetSpot === 0 ? 1 : lastSweetSpot + 1;
    });
    console.log(`\n1. Sweet spot sequence: ${sweetSpots.join(" → ")}`);
    const isStrict4321 = sweetSpots.length === 4 &&
        sweetSpots[0] === 4 &&
        sweetSpots[1] === 3 &&
        sweetSpots[2] === 2 &&
        sweetSpots[3] === 1;
    console.log(`   Strict 4→3→2→1 pattern: ${isStrict4321 ? "YES" : "NO"}`);
    const streamVolumes = events.map((evt) => {
        const log = evt;
        return BigInt(log.args?.amountIn ?? 0);
    });
    const lastStreamVolume = streamVolumes[streamVolumes.length - 1] ?? 0n;
    const overAchieved = lastStreamVolume > amountIn / 4n &&
        streamVolumes.length < 4;
    console.log(`\n2. Over-achieved branch (large final chunk, few streams): ${overAchieved ? "LIKELY" : "no"}`);
    const totalStreamed = streamVolumes.reduce((a, b) => a + b, 0n);
    console.log(`\n3. Total streamed (USDC): ${totalStreamed.toString()} (${Number(totalStreamed) / 1e6} USDC)`);
    console.log(`   Initial amountIn:      ${amountIn.toString()} (5 USDC)`);
    console.log(`   amountRemaining after: ${(amountIn - totalStreamed).toString()}`);
    if (amountIn - totalStreamed === 0n) {
        console.log("\n   → All funds were streamed. Trade reached amountRemaining=0.");
        console.log("   → Trade should have been completed/removed. If still stuck, completion logic may have failed.");
    }
    else {
        console.log(`\n   → ${(amountIn - totalStreamed).toString()} USDC not yet streamed.`);
    }
    const totalOut = events.reduce((acc, evt) => {
        const log = evt;
        const args = log.args;
        return acc + BigInt(args?.realisedAmountOut ?? 0);
    }, 0n);
    console.log(`\n4. Total amountOut (WETH wei): ${totalOut.toString()}`);
    console.log(`   Target was: 2,241,110,000,000,000 wei`);
    console.log(`\n--- SETTLEMENT SUMMARY (for frontend comparison) ---`);
    console.log(`  Trade amountIn: ${amountIn.toString()} (${Number(amountIn) / 1e6} USDC)`);
    try {
        const t = await core.getTrade(tradeId);
        console.log(`  Contract realisedAmountOut: ${t.realisedAmountOut.toString()} (after fees)`);
    }
    catch {
        console.log(`  Contract realisedAmountOut: N/A (trade not in storage)`);
    }
    console.log(`\n  Per-stream (as stored in TradeStreamExecuted event):`);
    let sumIn = 0n;
    let sumOut = 0n;
    events.forEach((evt, i) => {
        const log = evt;
        const args = log.args;
        const sv = args?.amountIn ?? 0n;
        const ao = args?.realisedAmountOut ?? 0n;
        sumIn += sv;
        sumOut += ao;
        console.log(`    Stream ${i + 1} (block ${log.blockNumber}): amountIn=${sv.toString()}, realisedAmountOut=${ao.toString()}`);
    });
    console.log(`  Sum of event amountIn: ${sumIn.toString()}`);
    console.log(`  Sum of event realisedAmountOut: ${sumOut.toString()}`);
    if (sumIn !== amountIn) {
        console.log(`  ⚠️  DISCREPANCY: sum(amountIn) ${sumIn} != trade amountIn ${amountIn}`);
    }
    // Verify first tx raw logs
    if (events.length > 0) {
        const firstTxHash = events[0].transactionHash;
        const receipt = await provider.getTransactionReceipt(firstTxHash);
        const iface = new ethers_1.ethers.Interface(CORE_ABI.filter((x) => x.type === 'event'));
        const coreLogs = receipt?.logs.filter((l) => l.address.toLowerCase() === config_1.CONTRACT_ADDRESSES.core.toLowerCase()) ?? [];
        const streamLogs = coreLogs.filter((l) => {
            try {
                const parsed = iface.parseLog({ topics: l.topics, data: l.data });
                return parsed?.name === 'TradeStreamExecuted';
            }
            catch {
                return false;
            }
        });
        console.log(`\n--- RAW VERIFICATION (first tx ${firstTxHash.slice(0, 18)}...) ---`);
        streamLogs.forEach((l, i) => {
            const parsed = iface.parseLog({ topics: l.topics, data: l.data });
            if (parsed && parsed.args) {
                console.log(`  Log ${i}: tradeId=${parsed.args[0]}, amountIn=${parsed.args[1]}, realisedAmountOut=${parsed.args[2]}`);
            }
        });
    }
    console.log(`\n5. TradeCompleted events: ${completedEvents.length}`);
    if (completedEvents.length > 0) {
        completedEvents.forEach((evt, i) => {
            const log = evt;
            console.log(`   #${i + 1}: block ${log.blockNumber}, tx ${log.transactionHash}, finalRealised=${log.args?.finalRealisedAmountOut?.toString()} wei`);
        });
    }
    // Query current on-chain state via getTrade
    console.log(`\n6. Current contract state (getTrade(${tradeId})):`);
    try {
        const trade = await core.getTrade(tradeId);
        console.log(`   Trade exists in storage: YES`);
        console.log(`   owner: ${trade.owner}`);
        console.log(`   amountRemaining: ${trade.amountRemaining.toString()}`);
        console.log(`   realisedAmountOut: ${trade.realisedAmountOut.toString()}`);
        console.log(`   lastSweetSpot: ${trade.lastSweetSpot.toString()}`);
        console.log(`   attempts: ${trade.attempts}`);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`   Trade NOT in storage (getTrade reverts): ${msg}`);
    }
}
main().catch(console.error);
//# sourceMappingURL=query-trade-events.js.map