#!/bin/bash

# Extract deployment addresses from DeployBarebonesCore (CREATE2) deployment
# Creates versioned deployment file for v1.0.6

BROADCAST_DIR="broadcast"
VERSION="1.0.6"
OUTPUT_DIR="versions"
OUTPUT_FILE="${OUTPUT_DIR}/deployment-addresses-mainnet-${VERSION}.json"

# Existing contracts (reused from v1.0.3 / DeployBarebonesCore constants)
EXISTING_EXECUTOR="0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878"
EXISTING_REGISTRY="0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4"
EXISTING_ETH_SUPPORT="0xB970aF8dA1909230a32819602d97a0C0d44C5FB5"
UNISWAP_V2_FETCHER="0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089"
UNISWAP_V3_FETCHER_0_05="0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B"
UNISWAP_V3_FETCHER_0_3="0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518"
UNISWAP_V3_FETCHER_1="0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43"
SUSHISWAP_FETCHER="0x57cfC5AD0812747afbb3dCD98B23b94883A341BC"
BALANCER_V2_FETCHER="0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6"

# ContractCreated topic (Create2Factory)
CONTRACT_CREATED_TOPIC="0x345fe8f41c1624b2bef5ee139b5b5fa4b3dec60c3bf0ce05f0ac5e6f95b6bba3"

echo "🔍 Looking for DeployBarebonesCore deployment files..."

LATEST_DEPLOYMENT=$(find "$BROADCAST_DIR/DeployBarebonesCore.s.sol" -name "run-latest.json" -type f -not -path "*/dry-run/*" 2>/dev/null | head -1)

if [ -z "$LATEST_DEPLOYMENT" ]; then
    echo "❌ No DeployBarebonesCore deployment broadcast files found."
    echo "   Run: npm run deploy:barebones:core"
    exit 1
fi

echo "📁 Found deployment file: $LATEST_DEPLOYMENT"

CHAIN_ID=$(echo "$LATEST_DEPLOYMENT" | sed -n 's|.*/\([0-9]*\)/run-latest.json|\1|p')
case $CHAIN_ID in
    1) NETWORK_NAME="mainnet" ;;
    137) NETWORK_NAME="polygon" ;;
    56) NETWORK_NAME="bsc" ;;
    42161) NETWORK_NAME="arbitrum" ;;
    *) NETWORK_NAME="unknown" ;;
esac

echo "🌐 Network: $NETWORK_NAME (Chain ID: $CHAIN_ID)"

# Deployment block and deployer
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

# Create2Factory address (first CREATE)
FACTORY_ADDRESS=$(jq -r '[.transactions[] | select(.transactionType == "CREATE")] | .[0].contractAddress' "$LATEST_DEPLOYMENT" 2>/dev/null)

# StreamDaemon and Core from ContractCreated events (factory logs): topics[1] = indexed contractAddress
STREAMDAEMON_HEX=$(jq -r --arg topic "$CONTRACT_CREATED_TOPIC" --arg factory "$FACTORY_ADDRESS" \
  '[.receipts[].logs[]? | select(.address == $factory and .topics[0] == $topic)] | .[0].topics[1]' "$LATEST_DEPLOYMENT" 2>/dev/null)
CORE_HEX=$(jq -r --arg topic "$CONTRACT_CREATED_TOPIC" --arg factory "$FACTORY_ADDRESS" \
  '[.receipts[].logs[]? | select(.address == $factory and .topics[0] == $topic)] | .[1].topics[1]' "$LATEST_DEPLOYMENT" 2>/dev/null)

# Convert 32-byte topic to address (last 20 bytes = 40 hex chars)
STREAMDAEMON_ADDRESS="0x${STREAMDAEMON_HEX: -40}"
CORE_ADDRESS="0x${CORE_HEX: -40}"

if [ -z "$CORE_ADDRESS" ] || [ "$CORE_ADDRESS" == "0xnull" ]; then
    echo "❌ Could not extract Core/StreamDaemon from broadcast."
    exit 1
fi

echo "📝 Extracting contract addresses..."
echo "   Create2Factory: $FACTORY_ADDRESS"
echo "   StreamDaemon:   $STREAMDAEMON_ADDRESS"
echo "   Core:           $CORE_ADDRESS"

mkdir -p "$OUTPUT_DIR"

# Build contracts JSON (same shape as v1.0.5: include fetchers + Core + StreamDaemon + existing)
CONTRACTS_JSON=$(jq -n \
  --arg executor "$EXISTING_EXECUTOR" \
  --arg registry "$EXISTING_REGISTRY" \
  --arg ethSupport "$EXISTING_ETH_SUPPORT" \
  --arg uv2 "$UNISWAP_V2_FETCHER" \
  --arg uv3_005 "$UNISWAP_V3_FETCHER_0_05" \
  --arg uv3_03 "$UNISWAP_V3_FETCHER_0_3" \
  --arg uv3_1 "$UNISWAP_V3_FETCHER_1" \
  --arg sushi "$SUSHISWAP_FETCHER" \
  --arg bal "$BALANCER_V2_FETCHER" \
  --arg streamDaemon "$STREAMDAEMON_ADDRESS" \
  --arg core "$CORE_ADDRESS" \
  --arg factory "$FACTORY_ADDRESS" \
  '{
    Executor: $executor,
    Registry: $registry,
    UniswapV2Fetcher: $uv2,
    UniswapV3Fetcher_0_05: $uv3_005,
    UniswapV3Fetcher_0_3: $uv3_03,
    UniswapV3Fetcher_1: $uv3_1,
    SushiswapFetcher: $sushi,
    BalancerV2Fetcher: $bal,
    StreamDaemon: $streamDaemon,
    Core: $core,
    ETHSupport: $ethSupport,
    Create2Factory: $factory
  }')

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
  '{network: $network, chainId: $chainId, version: $version, deploymentDate: $date, deploymentBlock: $block, deployer: $deployer, deploymentHash: $hash, contracts: $contracts, notes: { changes: "DeployBarebonesCore (CREATE2): new Core and StreamDaemon; existing Executor, Registry, ETHSupport, fetchers. Fixes amountIn storage layout." }}' \
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

# Keep Solidity fork tests in sync with this JSON
if [[ -x "scripts/sync-mainnet-addresses-sol.sh" ]] || [[ -f "scripts/sync-mainnet-addresses-sol.sh" ]]; then
  echo "🔗 Syncing script/addresses/MainnetAddresses.sol..."
  bash scripts/sync-mainnet-addresses-sol.sh
fi
