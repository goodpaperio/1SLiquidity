#!/bin/bash

# Script to deploy all Balancer pools in batches of 3
# Each batch requires keystore password entry

set -e

source .env

echo "=========================================="
echo "Balancer Pool Deployment - All Batches"
echo "=========================================="
echo ""
echo "This will deploy 69 pools in 23 batches of 3 pools each."
echo "You will need to enter your keystore password for each batch."
echo ""
read -p "Press Enter to start..."

BATCHES=23

for i in $(seq 1 $BATCHES); do
    echo ""
    echo "=========================================="
    echo "Batch $i of $BATCHES"
    echo "=========================================="
    echo ""
    
    forge script script/processes/SetupBalancerV2Pools.s.sol:SetupBalancerV2Pools \
        --sig "addBatch${i}()" \
        --rpc-url $MAINNET_RPC_URL \
        --account deployKey \
        --broadcast \
        --gas-limit 30000000 \
        -vvvv
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Batch $i completed successfully!"
    else
        echo ""
        echo "❌ Batch $i failed!"
        echo "You can resume from batch $i by running:"
        echo "  npm run deploy:balancer:batch${i}"
        exit 1
    fi
    
    if [ $i -lt $BATCHES ]; then
        echo ""
        echo "Waiting before next batch..."
        sleep 2
    fi
done

echo ""
echo "=========================================="
echo "✅ All batches completed!"
echo "=========================================="

