#!/bin/bash

# Deploy Balancer pools in batches, automatically extracting registry address from Batch 1
set -e

echo "=== Step 1: Deploying Balancer Batch 1 (creates registry + pools 0-22) ==="
npm run deploy:balancer:batch1

echo ""
echo "=== Extracting registry address from Batch 1 deployment ==="
REGISTRY_ADDRESS=$(cat broadcast/SetupBalancerV2Pools.s.sol/1/run-latest.json | jq -r '.transactions[] | select(.contractName == "BalancerV2PoolRegistry" and .transactionType == "CREATE") | .contractAddress' | head -1)

if [ -z "$REGISTRY_ADDRESS" ] || [ "$REGISTRY_ADDRESS" == "null" ]; then
    echo "ERROR: Could not extract registry address from Batch 1 deployment"
    echo "Please check the broadcast file manually and update REGISTRY_ADDRESS in SetupBalancerV2Pools.s.sol"
    exit 1
fi

echo "Found registry address: $REGISTRY_ADDRESS"
echo "Updating SetupBalancerV2Pools.s.sol..."

# Update the REGISTRY_ADDRESS constant in the Solidity file
SCRIPT_FILE="script/processes/SetupBalancerV2Pools.s.sol"
# Use sed with backup (macOS compatible) - replace address(0) with address(0x...)
sed -i.bak "s|address constant REGISTRY_ADDRESS = address(0);|address constant REGISTRY_ADDRESS = address($REGISTRY_ADDRESS);|" "$SCRIPT_FILE"
rm -f "$SCRIPT_FILE.bak"

echo "Registry address updated in script. Continuing with batches..."

echo ""
echo "=== Step 2: Deploying Balancer Batch 2 (pools 23-45) ==="
npm run deploy:balancer:batch2

echo ""
echo "=== Step 3: Deploying Balancer Batch 3 (pools 46-68) ==="
npm run deploy:balancer:batch3

echo ""
echo "=== All Balancer pool batches deployed successfully! ==="
