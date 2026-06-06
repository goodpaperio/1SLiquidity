"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenSymbol = getTokenSymbol;
exports.formatTokenAmount = formatTokenAmount;
exports.calculateProgress = calculateProgress;
const ethers_1 = require("ethers");
const config_1 = require("./config");
function getTokenSymbol(address) {
    const lowerAddress = address.toLowerCase();
    return config_1.TOKEN_ADDRESSES[lowerAddress] || address.slice(0, 6) + "...";
}
function formatTokenAmount(amount, decimals = 18) {
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
function calculateProgress(realised, target) {
    const realisedNum = parseFloat(ethers_1.ethers.formatEther(realised));
    const targetNum = parseFloat(ethers_1.ethers.formatEther(target));
    if (targetNum === 0)
        return "0%";
    const progress = (realisedNum / targetNum) * 100;
    return `${Math.min(progress, 100).toFixed(1)}%`;
}
//# sourceMappingURL=tradeFormat.js.map