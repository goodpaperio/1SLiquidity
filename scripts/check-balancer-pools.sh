#!/bin/bash
# Check which Balancer pools are already added to the registry

source .env

REGISTRY="0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1"

# Check a few common pairs
echo "Checking Balancer pools in registry..."
echo ""

pairs=(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0ce3606eB48,0xC02aaA39b223FE8D0A0e5C4f27eAD9083C756Cc2|USDC-WETH"
    "0xdAC17F958D2ee523a2206206994597C13D831ec7,0xba100000625a3754423978a60c9317c58a424e3D|USDT-BAL"
    "0x6B175474e89094c44da98b954EEdeaC495271D0F,0xC02aaA39b223FE8D0A0e5C4f27eAD9083C756Cc2|DAI-WETH"
)

for pair in "${pairs[@]}"; do
    IFS='|' read -r tokens name <<< "$pair"
    IFS=',' read -r tokenA tokenB <<< "$tokens"
    
    result=$(cast call $REGISTRY "getPools(address,address)(address[],bytes32[])" $tokenA $tokenB --rpc-url $MAINNET_RPC_URL 2>&1)
    count=$(echo "$result" | grep -o "0x[0-9a-fA-F]\{40\}" | wc -l | tr -d ' ')
    
    echo "$name: $count pools"
done

