#!/usr/bin/env node

/**
 * Generate test functions dynamically based on pair files
 * This script generates CoreFork.t.sol test functions automatically
 * 
 * Usage: node scripts/generate-test-functions.js
 */

const fs = require('fs');
const path = require('path');

const CHUNK_SIZE = 10;

const BASE_TOKENS = {
  usdc: {
    whale: '0x55FE002aefF02F77364de339a1292923A15844B8',
    amount: 'formatTokenAmount(usdc, 1000)'
  },
  usdt: {
    whale: '0x5754284f345afc66a98fbB0a0Afe71e0F007B949',
    amount: 'formatTokenAmount(usdt, 1000)'
  },
  weth: {
    whale: '0x8EB8a3b98659Cce290402893d0123abb75E3ab28',
    amount: '5 * 10 ** 17'
  },
  wbtc: {
    whale: '0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5',
    amount: '1 * 10 ** 6'
  }
};

function generateTestFunctions() {
  console.log('🚀 Generating test functions...\n');
  
  let output = '';
  let totalTests = 0;
  
  Object.entries(BASE_TOKENS).forEach(([symbol, config]) => {
    const pairFile = path.join(__dirname, '..', 'config', `${symbol}_pairs_clean.json`);
    
    if (!fs.existsSync(pairFile)) {
      console.log(`⚠️  Skipping ${symbol.toUpperCase()}: file not found`);
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(pairFile, 'utf8'));
    const totalPairs = data.totalCount;
    const numChunks = Math.ceil(totalPairs / CHUNK_SIZE);
    
    console.log(`${symbol.toUpperCase()}: ${totalPairs} pairs → ${numChunks} chunks`);
    
    output += `    // === ${symbol.toUpperCase()} Tests (${totalPairs} pairs, ${numChunks} chunks of ${CHUNK_SIZE}) ===\n\n`;
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalPairs);
      
      output += `    function test_PlaceTradeWith${symbol.toUpperCase()}Tokens_${start}_${end}() public {\n`;
      output += `        address ${symbol} = getTokenByName("${symbol}");\n`;
      output += `        _testTradesForTokenRange("${symbol.toUpperCase()}_${start}_${end}", ${symbol}PairAddresses, ${symbol}, ${config.whale}, ${config.amount}, ${start}, ${end});\n`;
      output += `    }\n\n`;
      
      totalTests++;
    }
    
    output += '\n';
  });
  
  console.log(`\n✅ Generated ${totalTests} test functions\n`);
  console.log('📋 Copy this into your CoreFork.t.sol:\n');
  console.log('─'.repeat(80));
  console.log(output);
  console.log('─'.repeat(80));
  
  // Save to file
  const outputFile = path.join(__dirname, 'generated-tests.sol');
  fs.writeFileSync(outputFile, output);
  console.log(`\n💾 Also saved to: ${outputFile}`);
}

generateTestFunctions();
