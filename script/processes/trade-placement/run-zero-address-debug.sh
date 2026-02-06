#!/bin/bash

# Zero Address Debug Test Script
# This script specifically tests for the zero address issue in StreamDaemon

echo "=== Zero Address Debug Test ==="
echo "Testing for zero address issue in StreamDaemon evaluation"
echo ""

# Start anvil fork
echo "Starting anvil fork..."
npm run anvil:start

# Wait for anvil to be ready
sleep 5

# Run the zero address debug test
echo "Running ZeroAddressDebugTest..."
npm run test:zero-address-debug-anvil

echo ""
echo "=== Debug Test Complete ==="
