"use strict";
/**
 * Balance Check Utility
 * Checks the bot wallet's ETH balance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBalance = checkBalance;
const ethers_1 = require("ethers");
const config_1 = require("./config");
async function checkBalance() {
    try {
        const provider = await (0, config_1.getProvider)();
        const wallet = await (0, config_1.getSigner)();
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers_1.ethers.formatEther(balance);
        console.log(`💰 Wallet: ${wallet.address}`);
        console.log(`💵 Balance: ${balanceInEth} ETH`);
        // Return balance for parsing by scripts
        return balanceInEth;
    }
    catch (error) {
        console.error('❌ Failed to check balance:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    checkBalance();
}
//# sourceMappingURL=balance-check.js.map