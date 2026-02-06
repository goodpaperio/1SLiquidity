#!/bin/bash

# Custom Trade Placement Test Script
# This script runs a simplified USDC/DAI trade test with only SushiSwap and UniswapV2

echo "=== Custom Trade Placement Test ==="
echo "Testing USDC/DAI trade with simplified DEX setup"
echo ""

# Start anvil fork
echo "Starting anvil fork..."
npm run anvil:start

# Wait for anvil to be ready
sleep 5

# Run the custom trade placement test
echo "Running CustomTradePlacement test..."
npm run test:custom-trade-placement-anvil

echo ""
echo "=== Test Complete ==="
