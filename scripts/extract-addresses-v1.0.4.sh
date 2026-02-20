#!/bin/bash

# Extract deployment addresses from DeployBarebonesCore deployment
# Creates versioned deployment file for v1.0.4

BROADCAST_DIR="broadcast"
VERSION="1.0.4"
OUTPUT_DIR="versions"
OUTPUT_FILE="${OUTPUT_DIR}/deployment-addresses-mainnet-${VERSION}.json"

echo "🔍 Looking for DeployBarebonesCore deployment files..."

# Find the most recent DeployBarebonesCore deployment file (excluding dry-run)
LATEST_DEPLOYMENT=$(find "$BROADCAST_DIR/DeployBarebonesCore.s.sol" -name "run-latest.json" -type f -not -path "*/dry-run/*" 2>/dev/null | head -1)

if [ -z "$LATEST_DEPLOYMENT" ]; then
    echo "❌ No DeployBarebonesCore deployment broadcast files found."
    echo "   Make sure to run: npm run deploy:barebones:core"
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

# Get deployment block number (from first transaction, convert hex to decimal if needed)
BLOCK_HEX=$(jq -r '.receipts[0].blockNumber' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "0")
if [[ "$BLOCK_HEX" =~ ^0x ]]; then
    DEPLOYMENT_BLOCK=$(printf "%d" "$BLOCK_HEX")
else
    DEPLOYMENT_BLOCK="$BLOCK_HEX"
fi

# Try to get deployer from transactions or receipts
DEPLOYER=$(jq -r '.transactions[0].from // .receipts[0].from // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null)
if [ "$DEPLOYER" == "null" ] || [ -z "$DEPLOYER" ]; then
    DEPLOYER="0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"
fi
DEPLOYMENT_HASH=$(jq -r '.receipts[0].transactionHash // .transactions[0].hash // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null)

# Extract new contract addresses
echo "📝 Extracting new contract addresses..."
NEW_CORE=$(jq -r '.transactions[] | select(.contractName == "Core") | .contractAddress' "$LATEST_DEPLOYMENT" 2>/dev/null | head -1)
NEW_STREAM_DAEMON=$(jq -r '.transactions[] | select(.contractName == "StreamDaemon") | .contractAddress' "$LATEST_DEPLOYMENT" 2>/dev/null | head -1)

if [ -z "$NEW_CORE" ] || [ "$NEW_CORE" == "null" ]; then
    echo "⚠️  Warning: Core address not found in deployment"
fi

if [ -z "$NEW_STREAM_DAEMON" ] || [ "$NEW_STREAM_DAEMON" == "null" ]; then
    echo "⚠️  Warning: StreamDaemon address not found in deployment"
fi

# Existing contracts from v1.0.3 (unchanged)
EXISTING_EXECUTOR="0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878"
EXISTING_REGISTRY="0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4"
EXISTING_ETH_SUPPORT="0xB970aF8dA1909230a32819602d97a0C0d44C5FB5"
EXISTING_UNISWAP_V2_FETCHER="0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089"
EXISTING_UNISWAP_V3_FETCHER_0_05="0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B"
EXISTING_UNISWAP_V3_FETCHER_0_3="0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518"
EXISTING_UNISWAP_V3_FETCHER_1="0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43"
EXISTING_SUSHISWAP_FETCHER="0x57cfC5AD0812747afbb3dCD98B23b94883A341BC"
EXISTING_BALANCER_V2_POOL_REGISTRY="0xDdBbF78b2BF532d1637551a0186b26FbC9bfB5b1"
EXISTING_BALANCER_V2_FETCHER="0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6"
EXISTING_CURVE_META_FETCHER="0xdaa78BA8ff44351a7669746209d371bCdD85d062"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Create deployment JSON with version and all contracts
cat > "$OUTPUT_FILE" << EOF
{
  "network": "${NETWORK_NAME}",
  "chainId": ${CHAIN_ID},
  "version": "${VERSION}",
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deploymentBlock": ${DEPLOYMENT_BLOCK},
  "deployer": "${DEPLOYER}",
  "deploymentHash": "${DEPLOYMENT_HASH}",
  "contracts": {
    "Executor": "${EXISTING_EXECUTOR}",
    "Registry": "${EXISTING_REGISTRY}",
    "Core": "${NEW_CORE}",
    "StreamDaemon": "${NEW_STREAM_DAEMON}",
    "UniswapV2Fetcher": "${EXISTING_UNISWAP_V2_FETCHER}",
    "UniswapV3Fetcher_0_05": "${EXISTING_UNISWAP_V3_FETCHER_0_05}",
    "UniswapV3Fetcher_0_3": "${EXISTING_UNISWAP_V3_FETCHER_0_3}",
    "UniswapV3Fetcher_1": "${EXISTING_UNISWAP_V3_FETCHER_1}",
    "SushiswapFetcher": "${EXISTING_SUSHISWAP_FETCHER}",
    "BalancerV2PoolRegistry": "${EXISTING_BALANCER_V2_POOL_REGISTRY}",
    "BalancerV2Fetcher": "${EXISTING_BALANCER_V2_FETCHER}",
    "CurveMetaFetcher": "${EXISTING_CURVE_META_FETCHER}",
    "ETHSupport": "${EXISTING_ETH_SUPPORT}"
  },
  "notes": {
    "changes": "Redeployed Core and StreamDaemon (non-CREATE2) with Curve excluded from StreamDaemon DEX arrays",
    "streamDaemonChanges": "New StreamDaemon deployed without CREATE2 for proper ownership. Configured with 6 DEXs excluding Curve.",
    "curveMetaFetcher": "CurveMetaFetcher contract still exists but is excluded from StreamDaemon configuration"
  }
}
EOF

echo "✅ Deployment addresses saved to: $OUTPUT_FILE"
echo ""
echo "📋 Deployment Summary:"
echo "   Version: ${VERSION}"
echo "   Network: ${NETWORK_NAME}"
echo "   Chain ID: ${CHAIN_ID}"
echo "   Deployer: ${DEPLOYER}"
echo "   Deployment Block: ${DEPLOYMENT_BLOCK}"
echo ""
echo "📄 New Contracts:"
echo "   Core: ${NEW_CORE}"
echo "   StreamDaemon: ${NEW_STREAM_DAEMON}"
echo ""
echo "📄 Existing Contracts (from v1.0.3):"
echo "   Executor: ${EXISTING_EXECUTOR}"
echo "   Registry: ${EXISTING_REGISTRY}"
echo "   ETHSupport: ${EXISTING_ETH_SUPPORT}"
echo "   All Fetchers (including CurveMetaFetcher): Unchanged"
echo ""
echo "📄 Generated JSON:"
cat "$OUTPUT_FILE" | jq '.'
echo ""
echo "🎯 Next steps:"
echo "   - Verify Core contract on Etherscan: ${NEW_CORE}"
echo "   - Verify StreamDaemon contract on Etherscan: ${NEW_STREAM_DAEMON}"
echo "   - Update frontend/monitor with new addresses"

