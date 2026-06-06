"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyLocalData = createEmptyLocalData;
exports.migrateLocalData = migrateLocalData;
exports.hasUsableTradeCache = hasUsableTradeCache;
exports.outstandingTradesFromMetadata = outstandingTradesFromMetadata;
const types_1 = require("./types");
function createEmptyLocalData(contractAddress) {
    return {
        schemaVersion: types_1.LOCAL_DATA_SCHEMA_VERSION,
        lastScannedBlock: 0,
        outstandingTrades: [],
        tradeCache: {},
        lastUpdated: 0,
        contractAddress,
    };
}
/**
 * Normalize legacy localData.json (schema v1 / lastRun) into schema v2.
 */
function migrateLocalData(raw, contractAddress) {
    if (raw.contractAddress &&
        raw.contractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
        return createEmptyLocalData(contractAddress);
    }
    const lastScannedBlock = raw.lastScannedBlock ?? raw.lastRun ?? 0;
    return {
        schemaVersion: types_1.LOCAL_DATA_SCHEMA_VERSION,
        lastScannedBlock,
        outstandingTrades: raw.outstandingTrades ?? [],
        tradeCache: raw.tradeCache ?? {},
        lastUpdated: raw.lastUpdated ?? 0,
        contractAddress,
    };
}
function hasUsableTradeCache(data) {
    return Boolean(data.tradeCache && Object.keys(data.tradeCache).length > 0);
}
function outstandingTradesFromMetadata(ongoingTrades, pairIdFor, updatedAt) {
    return ongoingTrades.map((trade) => ({
        tradeId: parseInt(trade.tradeId, 10),
        pairId: pairIdFor(trade.tokenIn, trade.tokenOut),
        lastSweetSpot: parseInt(trade.lastSweetSpot, 10),
        tokenIn: trade.tokenIn,
        tokenOut: trade.tokenOut,
        pair: trade.pair,
        owner: trade.owner,
        isInstasettlable: trade.isInstasettlable,
        onlyInstasettle: trade.onlyInstasettle,
        lastUpdated: updatedAt,
    }));
}
//# sourceMappingURL=localDataMigration.js.map