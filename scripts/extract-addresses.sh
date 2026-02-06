#!/bin/bash

# Extract deployment addresses from Foundry broadcast files
# This script will create deployment-addresses.json in the root directory

BROADCAST_DIR="broadcast"
OUTPUT_FILE="deployment-addresses.json"

echo "🔍 Looking for deployment broadcast files..."

# Find the most recent DeployBarebones deployment file (excluding dry-run)
LATEST_DEPLOYMENT=$(find "$BROADCAST_DIR/DeployBarebones.s.sol" -name "run-latest.json" -type f -not -path "*/dry-run/*" 2>/dev/null | head -1)

if [ -z "$LATEST_DEPLOYMENT" ]; then
    echo "❌ No deployment broadcast files found."
    echo "   Make sure to run a deployment script first with --broadcast flag."
    exit 1
fi

echo "📁 Found deployment file: $LATEST_DEPLOYMENT"

# Extract network info from the path
NETWORK=$(echo "$LATEST_DEPLOYMENT" | sed -n 's|.*/\([^/]*\)/[^/]*/run-latest.json|\1|p')
CHAIN_ID=$(echo "$LATEST_DEPLOYMENT" | sed -n 's|.*/\([0-9]*\)/run-latest.json|\1|p')

# Determine network name based on chain ID
case $CHAIN_ID in
    1) NETWORK_NAME="mainnet" ;;
    137) NETWORK_NAME="polygon" ;;
    56) NETWORK_NAME="bsc" ;;
    42161) NETWORK_NAME="arbitrum" ;;
    *) NETWORK_NAME="unknown" ;;
esac

echo "🌐 Network: $NETWORK_NAME (Chain ID: $CHAIN_ID)"

# Create deployment JSON
cat > "$OUTPUT_FILE" << EOF
{
  "network": "$NETWORK_NAME",
  "chainId": $CHAIN_ID,
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "$(jq -r '.transactions[0].from' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "unknown")",
  "deploymentHash": "$(jq -r '.transactions[0].hash' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "unknown")",
  "contracts": {
EOF

# Extract contract names and addresses
echo "📝 Extracting contract addresses..."

# Get all transactions that deployed contracts
jq -r '.transactions[] | select(.contractAddress != null) | "    \"\(.contractName)\": \"\(.contractAddress)\","' "$LATEST_DEPLOYMENT" 2>/dev/null | \
sed '$s/,$//' >> "$OUTPUT_FILE"

# If no contracts found, add a placeholder
if [ ! -s "$OUTPUT_FILE" ] || [ "$(tail -1 "$OUTPUT_FILE" | grep -c '^  }$')" -eq 0 ]; then
    echo "    \"No contracts deployed\"" >> "$OUTPUT_FILE"
fi

# Close the JSON
echo "  }" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo "✅ Deployment addresses saved to: $OUTPUT_FILE"
echo ""
echo "📋 Deployment Summary:"
echo "   Network: $NETWORK_NAME"
echo "   Chain ID: $CHAIN_ID"
echo "   Contracts: $(jq '.contracts | length' "$OUTPUT_FILE")"
echo "   Output: $OUTPUT_FILE"
echo ""

# Display the JSON file
echo "📄 Generated JSON:"
cat "$OUTPUT_FILE"
echo ""

echo "🎯 You can now use this JSON file for:"
echo "   - UI development"
echo "   - Contract verification"
echo "   - Team documentation"
echo "   - Cross-chain deployments"
