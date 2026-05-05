#!/bin/bash

# Extract deployment addresses for v1.0.7
# New: 3x UniswapV3Fetcher, Registry, Core, StreamDaemon
# Reused: Executor, ETHSupport, UniswapV2Fetcher, SushiswapFetcher, BalancerV2Fetcher

BROADCAST_DIR="broadcast"
VERSION="1.0.7"
OUTPUT_DIR="versions"
OUTPUT_FILE="${OUTPUT_DIR}/deployment-addresses-mainnet-${VERSION}.json"

# Reused contracts (unchanged from v1.0.3)
EXISTING_EXECUTOR="0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878"
EXISTING_ETH_SUPPORT="0xB970aF8dA1909230a32819602d97a0C0d44C5FB5"
UNISWAP_V2_FETCHER="0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089"
SUSHISWAP_FETCHER="0x57cfC5AD0812747afbb3dCD98B23b94883A341BC"
BALANCER_V2_FETCHER="0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6"

# Phase A — V3 fetcher addresses (written by DeployUniswapV3FetchersPhaseA)
PHASE_A_ENV="deployments/phase-a-mainnet.env"
if [ ! -f "$PHASE_A_ENV" ]; then
    echo "❌ $PHASE_A_ENV not found. Run: npm run deploy:phase-a:v3-fetchers"
    exit 1
fi
source "$PHASE_A_ENV"
UNISWAP_V3_FETCHER_0_05="${DEPLOY_BAREBONES_V3_500}"
UNISWAP_V3_FETCHER_0_3="${DEPLOY_BAREBONES_V3_3000}"
UNISWAP_V3_FETCHER_1="${DEPLOY_BAREBONES_V3_10000}"

# Phase B — Registry address (written by DeployRegistryAndConfigureRouters)
PHASE_B_ENV="deployments/phase-b-mainnet.env"
if [ ! -f "$PHASE_B_ENV" ]; then
    echo "❌ $PHASE_B_ENV not found. Run: npm run deploy:phase-b:registry"
    exit 1
fi
source "$PHASE_B_ENV"
NEW_REGISTRY="${DEPLOY_BAREBONES_REGISTRY}"

# ContractCreated topic (Create2Factory)
CONTRACT_CREATED_TOPIC="0x345fe8f41c1624b2bef5ee139b5b5fa4b3dec60c3bf0ce05f0ac5e6f95b6bba3"

echo "🔍 Looking for DeployBarebonesCore broadcast..."
LATEST_DEPLOYMENT=$(find "$BROADCAST_DIR/DeployBarebonesCore.s.sol" -name "run-latest.json" -type f -not -path "*/dry-run/*" 2>/dev/null | head -1)

if [ -z "$LATEST_DEPLOYMENT" ]; then
    echo "❌ No DeployBarebonesCore broadcast found. Run: npm run deploy:phase-c:barebones:core"
    exit 1
fi

echo "📁 Found: $LATEST_DEPLOYMENT"

CHAIN_ID=$(echo "$LATEST_DEPLOYMENT" | sed -n 's|.*/\([0-9]*\)/run-latest.json|\1|p')
case $CHAIN_ID in
    1) NETWORK_NAME="mainnet" ;;
    *) NETWORK_NAME="unknown-${CHAIN_ID}" ;;
esac

BLOCK_HEX=$(jq -r '.receipts[0].blockNumber' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "0")
if [[ "$BLOCK_HEX" =~ ^0x ]]; then
    DEPLOYMENT_BLOCK=$(printf "%d" "$BLOCK_HEX")
else
    DEPLOYMENT_BLOCK="$BLOCK_HEX"
fi

DEPLOYER=$(jq -r '.transactions[0].from // "0x538e5e9797fa86ee25e97289439b6a3aba0165b0"' "$LATEST_DEPLOYMENT" 2>/dev/null)
DEPLOYMENT_HASH=$(jq -r '.receipts[0].transactionHash // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null)

# Create2Factory = first CREATE tx
FACTORY_ADDRESS=$(jq -r '[.transactions[] | select(.transactionType == "CREATE")] | .[0].contractAddress' "$LATEST_DEPLOYMENT" 2>/dev/null)

# StreamDaemon + Core from ContractCreated events on the factory
STREAMDAEMON_HEX=$(jq -r --arg topic "$CONTRACT_CREATED_TOPIC" --arg factory "$FACTORY_ADDRESS" \
  '[.receipts[].logs[]? | select(.address == $factory and .topics[0] == $topic)] | .[0].topics[1]' "$LATEST_DEPLOYMENT" 2>/dev/null)
CORE_HEX=$(jq -r --arg topic "$CONTRACT_CREATED_TOPIC" --arg factory "$FACTORY_ADDRESS" \
  '[.receipts[].logs[]? | select(.address == $factory and .topics[0] == $topic)] | .[1].topics[1]' "$LATEST_DEPLOYMENT" 2>/dev/null)

STREAMDAEMON_ADDRESS="0x${STREAMDAEMON_HEX: -40}"
CORE_ADDRESS="0x${CORE_HEX: -40}"

if [ -z "$CORE_ADDRESS" ] || [ "$CORE_ADDRESS" == "0xnull" ]; then
    echo "❌ Could not extract Core/StreamDaemon from broadcast."
    exit 1
fi

echo ""
echo "📝 Addresses:"
echo "   Registry (new):               $NEW_REGISTRY"
echo "   UniswapV3Fetcher 0.05% (new): $UNISWAP_V3_FETCHER_0_05"
echo "   UniswapV3Fetcher 0.3%  (new): $UNISWAP_V3_FETCHER_0_3"
echo "   UniswapV3Fetcher 1%    (new): $UNISWAP_V3_FETCHER_1"
echo "   StreamDaemon (new):           $STREAMDAEMON_ADDRESS"
echo "   Core (new):                   $CORE_ADDRESS"
echo "   Create2Factory:               $FACTORY_ADDRESS"
echo "   Executor (reused):            $EXISTING_EXECUTOR"
echo "   ETHSupport (reused):          $EXISTING_ETH_SUPPORT"

mkdir -p "$OUTPUT_DIR"

CONTRACTS_JSON=$(jq -n \
  --arg executor "$EXISTING_EXECUTOR" \
  --arg registry "$NEW_REGISTRY" \
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

jq -n \
  --arg network "$NETWORK_NAME" \
  --argjson chainId "$CHAIN_ID" \
  --arg version "$VERSION" \
  --arg date "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --argjson block "$DEPLOYMENT_BLOCK" \
  --arg deployer "$DEPLOYER" \
  --arg hash "$DEPLOYMENT_HASH" \
  --argjson contracts "$CONTRACTS_JSON" \
  '{network: $network, chainId: $chainId, version: $version, deploymentDate: $date, deploymentBlock: $block, deployer: $deployer, deploymentHash: $hash, contracts: $contracts, notes: { changes: "New: 3x UniswapV3Fetcher (fixed getQuote ABI + QuoterV2), Registry (prepareTradeData 8-arg), Core+StreamDaemon. Reused: Executor, ETHSupport, UniswapV2Fetcher, SushiswapFetcher, BalancerV2Fetcher." }}' \
  > "$OUTPUT_FILE"

echo ""
echo "✅ Saved: $OUTPUT_FILE"
echo ""
cat "$OUTPUT_FILE" | jq '.'

if [[ -f "scripts/sync-mainnet-addresses-sol.sh" ]]; then
  echo ""
  echo "🔗 Syncing script/addresses/MainnetAddresses.sol..."
  bash scripts/sync-mainnet-addresses-sol.sh
fi
