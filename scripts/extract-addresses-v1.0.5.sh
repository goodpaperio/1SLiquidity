#!/bin/bash

# Extract deployment addresses from full DeployBarebones deployment
# Creates versioned deployment file for v1.0.5

BROADCAST_DIR="broadcast"
VERSION="1.0.5"
OUTPUT_DIR="versions"
OUTPUT_FILE="${OUTPUT_DIR}/deployment-addresses-mainnet-${VERSION}.json"

# Existing ETHSupport (reused; set on Core via maintenance:set-ethsupport)
EXISTING_ETH_SUPPORT="0xB970aF8dA1909230a32819602d97a0C0d44C5FB5"

echo "🔍 Looking for DeployBarebones deployment files..."

# Find the most recent DeployBarebones deployment file (excluding dry-run)
LATEST_DEPLOYMENT=$(find "$BROADCAST_DIR/DeployBarebones.s.sol" -name "run-latest.json" -type f -not -path "*/dry-run/*" 2>/dev/null | head -1)

if [ -z "$LATEST_DEPLOYMENT" ]; then
    echo "❌ No DeployBarebones deployment broadcast files found."
    echo "   Make sure to run: npm run deploy:barebones:create2 (or deploy:barebones)"
    exit 1
fi

echo "📁 Found deployment file: $LATEST_DEPLOYMENT"

# Extract network info from the path
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

# Get deployment block number (from first receipt, convert hex to decimal if needed)
BLOCK_HEX=$(jq -r '.receipts[0].blockNumber' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "0")
if [[ "$BLOCK_HEX" =~ ^0x ]]; then
    DEPLOYMENT_BLOCK=$(printf "%d" "$BLOCK_HEX")
else
    DEPLOYMENT_BLOCK="$BLOCK_HEX"
fi

DEPLOYER=$(jq -r '.transactions[0].from // .receipts[0].from // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null)
if [ "$DEPLOYER" == "null" ] || [ -z "$DEPLOYER" ]; then
    DEPLOYER="0x538e5e9797fa86ee25e97289439b6a3aba0165b0"
fi
DEPLOYMENT_HASH=$(jq -r '.receipts[0].transactionHash // .transactions[0].hash // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null)

# Extract all deployed contract addresses (CREATE transactions only)
echo "📝 Extracting contract addresses from broadcast..."

mkdir -p "$OUTPUT_DIR"

# Build contracts JSON: all CREATE transactions; name duplicate UniswapV3Fetcher as _0_05, _0_3, _1 by order
CONTRACTS_JSON=$(jq -c '
  [.transactions[] | select(.contractAddress != null and (.transactionType == "CREATE" or .transactionType == null)) | {name: .contractName, address: .contractAddress}]
  | reduce .[] as $t ({out: {}, uv3: 0};
      if $t.name == "UniswapV3Fetcher" then
        .uv3 = (.uv3 + 1) |
        .out[(if .uv3 == 1 then "UniswapV3Fetcher_0_05" elif .uv3 == 2 then "UniswapV3Fetcher_0_3" else "UniswapV3Fetcher_1" end)] = $t.address
      else
        .out[$t.name] = $t.address
      end
    )
  | .out
' "$LATEST_DEPLOYMENT" 2>/dev/null)

if [ -z "$CONTRACTS_JSON" ] || [ "$CONTRACTS_JSON" == "null" ]; then
    echo "❌ Could not parse contracts from broadcast."
    exit 1
fi

# Add ETHSupport to contracts (existing address, set on Core via maintenance:set-ethsupport)
CONTRACTS_JSON=$(echo "$CONTRACTS_JSON" | jq -c --arg eth "$EXISTING_ETH_SUPPORT" '. + {"ETHSupport": $eth}')

# Write full JSON
jq -n \
  --arg network "$NETWORK_NAME" \
  --argjson chainId "$CHAIN_ID" \
  --arg version "$VERSION" \
  --arg date "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --argjson block "$DEPLOYMENT_BLOCK" \
  --arg deployer "$DEPLOYER" \
  --arg hash "$DEPLOYMENT_HASH" \
  --argjson contracts "$CONTRACTS_JSON" \
  '{network: $network, chainId: $chainId, version: $version, deploymentDate: $date, deploymentBlock: $block, deployer: $deployer, deploymentHash: $hash, contracts: $contracts, notes: { changes: "Full barebones deployment (DeployBarebones.s.sol). ETHSupport set on Core via maintenance:set-ethsupport." }}' \
  > "$OUTPUT_FILE"

echo "✅ Deployment addresses saved to: $OUTPUT_FILE"
echo ""
echo "📋 Deployment Summary:"
echo "   Version: ${VERSION}"
echo "   Network: ${NETWORK_NAME}"
echo "   Chain ID: ${CHAIN_ID}"
echo "   Deployer: ${DEPLOYER}"
echo "   Deployment Block: ${DEPLOYMENT_BLOCK}"
echo ""
echo "📄 Generated JSON:"
cat "$OUTPUT_FILE" | jq '.'
echo ""
echo "🎯 Next steps:"
echo "   - Run maintenance:set-ethsupport (set CORE_ADDRESS to new Core, optionally ETHSUPPORT_ADDRESS to reuse existing)"
echo "   - Add Balancer pools batch-by-batch if needed"
echo "   - Verify contracts on Etherscan manually if desired"
