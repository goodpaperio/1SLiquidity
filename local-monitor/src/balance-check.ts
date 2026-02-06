/**
 * Balance Check Utility
 * Checks the bot wallet's ETH balance
 */

import { ethers } from 'ethers';
import { RPC_URL, PRIVATE_KEY } from './config';

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log(`💰 Wallet: ${wallet.address}`);
    console.log(`💵 Balance: ${balanceInEth} ETH`);
    
    // Return balance for parsing by scripts
    return balanceInEth;
  } catch (error) {
    console.error('❌ Failed to check balance:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkBalance();
}

export { checkBalance };
