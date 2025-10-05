#!/usr/bin/env node

/**
 * Pairs Generation Script for *_pairs_clean.json files
 * 
 * This script extracts liquidity pairs for each base token
 * from the liquidity.json file and generates separate files
 * for each token (USDC, USDT, WBTC, WETH).
 * 
 * Usage:
 *   node generate-pairs.js
 * 
 * Generated files:
 *   - usdc_pairs_clean.json
 *   - usdt_pairs_clean.json
 *   - wbtc_pairs_clean.json
 *   - weth_pairs_clean.json
 */

const fs = require('fs');
const path = require('path');

// Base token configuration
const BASE_TOKENS = {
  usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  wbtc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
};

// Source file
const LIQUIDITY_FILE = path.join(__dirname, 'liquidity.json');

/**
 * Normalizes an Ethereum address for comparison
 * @param {string} addr - The address to normalize
 * @returns {string} The address in lowercase
 */
function normalizeAddress(addr) {
  return addr.toLowerCase();
}

/**
 * Checks if reserves are non-zero
 * @param {Object} reserves - Object containing token0 and token1
 * @returns {boolean} True if both reserves are > 0
 */
function hasNonZeroReserves(reserves) {
  try {
    const reserve0 = BigInt(reserves.token0);
    const reserve1 = BigInt(reserves.token1);
    return reserve0 > 0n && reserve1 > 0n;
  } catch (error) {
    console.warn('Error checking reserves:', error.message);
    return false;
  }
}

/**
 * Extracts pairs for a given base token
 * @param {Array} liquidityData - Complete liquidity data
 * @param {string} baseSymbol - Base token symbol (e.g., 'usdc')
 * @param {string} baseAddress - Base token address
 * @returns {Array} List of unique pairs with non-zero reserves
 */
function extractPairsForBaseToken(liquidityData, baseSymbol, baseAddress) {
  const normalizedBase = normalizeAddress(baseAddress);
  const tokensMap = new Map();
  
  // Add the base token itself
  tokensMap.set(normalizedBase, {
    name: baseSymbol,
    address: baseAddress
  });
  
  // Iterate through all liquidity entries
  liquidityData.forEach(entry => {
    const entryTokenAddr = normalizeAddress(entry.tokenAddress);
    const entryTokenSymbol = entry.tokenSymbol.toLowerCase();
    
    // Check if the entry itself is the base token
    if (entryTokenAddr === normalizedBase) {
      // Add all tokens that the base token has pairs with
      entry.liquidityPairs.forEach(pair => {
        if (hasNonZeroReserves(pair.reserves)) {
          const pairTokenAddr = normalizeAddress(pair.tokenAddress);
          const pairTokenSymbol = pair.tokenSymbol.toLowerCase();
          
          if (!tokensMap.has(pairTokenAddr)) {
            tokensMap.set(pairTokenAddr, {
              name: pairTokenSymbol,
              address: pair.tokenAddress
            });
          }
        }
      });
    }
    
    // Check if the entry has pairs with the base token
    entry.liquidityPairs.forEach(pair => {
      const pairTokenAddr = normalizeAddress(pair.tokenAddress);
      
      if (pairTokenAddr === normalizedBase && hasNonZeroReserves(pair.reserves)) {
        // Add the entry token
        if (!tokensMap.has(entryTokenAddr)) {
          tokensMap.set(entryTokenAddr, {
            name: entryTokenSymbol,
            address: entry.tokenAddress
          });
        }
      }
    });
  });
  
  // Convert to array and sort by name
  return Array.from(tokensMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generates a *_pairs_clean.json file for a base token
 * @param {string} baseSymbol - Base token symbol
 * @param {Array} pairs - List of pairs
 */
function generatePairsFile(baseSymbol, pairs) {
  const output = {
    description: `All liquidity pairs containing ${baseSymbol.toUpperCase()} token with non-zero reserves (including all base tokens)`,
    totalCount: pairs.length,
    extractedAt: new Date().toISOString(),
    filterCriteria: 'Reserves token0 > 0 AND token1 > 0',
    pairs: pairs
  };
  
  const filename = path.join(__dirname, `${baseSymbol}_pairs_clean.json`);
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  
  console.log(`✅ Generated: ${baseSymbol}_pairs_clean.json (${pairs.length} pairs)`);
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Generating *_pairs_clean.json files...\n');
  
  // Check if liquidity.json exists
  if (!fs.existsSync(LIQUIDITY_FILE)) {
    console.error(`❌ Error: File ${LIQUIDITY_FILE} does not exist`);
    process.exit(1);
  }
  
  // Load liquidity data
  let liquidityData;
  try {
    const fileContent = fs.readFileSync(LIQUIDITY_FILE, 'utf8');
    liquidityData = JSON.parse(fileContent);
    console.log(`📖 Loaded: liquidity.json (${liquidityData.length} tokens)\n`);
  } catch (error) {
    console.error('❌ Error reading liquidity.json:', error.message);
    process.exit(1);
  }
  
  // Generate files for each base token
  Object.entries(BASE_TOKENS).forEach(([symbol, address]) => {
    try {
      const pairs = extractPairsForBaseToken(liquidityData, symbol, address);
      generatePairsFile(symbol, pairs);
    } catch (error) {
      console.error(`❌ Error generating ${symbol}_pairs_clean.json:`, error.message);
    }
  });
  
  console.log('\n✨ Generation completed successfully!');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { extractPairsForBaseToken, normalizeAddress, hasNonZeroReserves };