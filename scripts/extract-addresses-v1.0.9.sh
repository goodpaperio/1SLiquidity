#!/bin/bash

# Extract deployment addresses for v1.0.9
# Supports fresh deployment env file (DeployProtocolFresh) and phased env files.

set -euo pipefail

BROADCAST_DIR="broadcast"
VERSION="1.0.9"
OUTPUT_DIR="versions"
OUTPUT_FILE="${OUTPUT_DIR}/deployment-addresses-mainnet-${VERSION}.json"

FRESH_ENV="deployments/protocol-fresh-mainnet.env"
PHASE_A_ENV="deployments/phase-a-mainnet.env"
PHASE_B_ENV="deployments/phase-b-mainnet.env"

# Defaults / fallbacks for reused contracts if not present in fresh env
DEFAULT_UNISWAP_V2_FETCHER="0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089"
DEFAULT_SUSHISWAP_FETCHER="0x57cfC5AD0812747afbb3dCD98B23b94883A341BC"
DEFAULT_BALANCER_V2_FETCHER="0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6"

if [ -f "$FRESH_ENV" ]; then
  source "$FRESH_ENV"
fi

if [ -f "$PHASE_A_ENV" ]; then
  source "$PHASE_A_ENV"
fi

if [ -f "$PHASE_B_ENV" ]; then
  source "$PHASE_B_ENV"
fi

UNISWAP_V2_FETCHER="${DEPLOY_BAREBONES_V2:-$DEFAULT_UNISWAP_V2_FETCHER}"
UNISWAP_V3_FETCHER_0_01="${DEPLOY_BAREBONES_V3_100:-0x0000000000000000000000000000000000000000}"
UNISWAP_V3_FETCHER_0_05="${DEPLOY_BAREBONES_V3_500:-0x0000000000000000000000000000000000000000}"
UNISWAP_V3_FETCHER_0_3="${DEPLOY_BAREBONES_V3_3000:-0x0000000000000000000000000000000000000000}"
UNISWAP_V3_FETCHER_1="${DEPLOY_BAREBONES_V3_10000:-0x0000000000000000000000000000000000000000}"
SUSHISWAP_FETCHER="${DEPLOY_BAREBONES_SUSHI:-$DEFAULT_SUSHISWAP_FETCHER}"
BALANCER_V2_FETCHER="${DEPLOY_FRESH_BALANCER_FETCHER:-$DEFAULT_BALANCER_V2_FETCHER}"

REGISTRY_ADDRESS="${DEPLOY_BAREBONES_REGISTRY:-0x0000000000000000000000000000000000000000}"
EXECUTOR_ADDRESS="${DEPLOY_BAREBONES_EXECUTOR:-0x0000000000000000000000000000000000000000}"
ETH_SUPPORT_ADDRESS="${DEPLOY_BAREBONES_ETH_SUPPORT:-0x0000000000000000000000000000000000000000}"
STREAM_DAEMON_ADDRESS="${DEPLOY_FRESH_STREAM_DAEMON:-0x0000000000000000000000000000000000000000}"
CORE_ADDRESS="${DEPLOY_FRESH_CORE:-0x0000000000000000000000000000000000000000}"

echo "🔍 Looking for DeployProtocolFresh broadcast..."
LATEST_DEPLOYMENT=$(find "$BROADCAST_DIR/DeployProtocolFresh.s.sol" -name "run-latest.json" -type f -not -path "*/dry-run/*" 2>/dev/null | head -1 || true)

CHAIN_ID=1
NETWORK_NAME="mainnet"
DEPLOYMENT_BLOCK=0
DEPLOYER="unknown"
DEPLOYMENT_HASH="unknown"
CREATE2_FACTORY="0x0000000000000000000000000000000000000000"

if [ -n "$LATEST_DEPLOYMENT" ]; then
  echo "📁 Found: $LATEST_DEPLOYMENT"
  CHAIN_ID=$(echo "$LATEST_DEPLOYMENT" | sed -n 's|.*/\([0-9]*\)/run-latest.json|\1|p')
  BLOCK_HEX=$(jq -r '.receipts[0].blockNumber // "0"' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "0")
  if [[ "$BLOCK_HEX" =~ ^0x ]]; then
      DEPLOYMENT_BLOCK=$(printf "%d" "$BLOCK_HEX")
  else
      DEPLOYMENT_BLOCK="$BLOCK_HEX"
  fi
  DEPLOYER=$(jq -r '.transactions[0].from // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "unknown")
  DEPLOYMENT_HASH=$(jq -r '.receipts[0].transactionHash // "unknown"' "$LATEST_DEPLOYMENT" 2>/dev/null || echo "unknown")
  CREATE2_FACTORY=$(jq -r '.transactions[] | select(.transactionType == "CREATE" and (.contractName // "") == "Create2Factory") | .contractAddress' "$LATEST_DEPLOYMENT" 2>/dev/null | head -1)
  if [ -z "$CREATE2_FACTORY" ]; then
      CREATE2_FACTORY="0x0000000000000000000000000000000000000000"
  fi
else
  echo "⚠️  No DeployProtocolFresh broadcast found; building JSON from env only."
fi

mkdir -p "$OUTPUT_DIR"

jq -n \
  --arg network "$NETWORK_NAME" \
  --argjson chainId "${CHAIN_ID:-1}" \
  --arg version "$VERSION" \
  --arg date "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --argjson block "${DEPLOYMENT_BLOCK:-0}" \
  --arg deployer "$DEPLOYER" \
  --arg hash "$DEPLOYMENT_HASH" \
  --arg executor "$EXECUTOR_ADDRESS" \
  --arg registry "$REGISTRY_ADDRESS" \
  --arg core "$CORE_ADDRESS" \
  --arg streamDaemon "$STREAM_DAEMON_ADDRESS" \
  --arg ethSupport "$ETH_SUPPORT_ADDRESS" \
  --arg uv2 "$UNISWAP_V2_FETCHER" \
  --arg uv3_001 "$UNISWAP_V3_FETCHER_0_01" \
  --arg uv3_005 "$UNISWAP_V3_FETCHER_0_05" \
  --arg uv3_03 "$UNISWAP_V3_FETCHER_0_3" \
  --arg uv3_1 "$UNISWAP_V3_FETCHER_1" \
  --arg sushi "$SUSHISWAP_FETCHER" \
  --arg bal "$BALANCER_V2_FETCHER" \
  --arg factory "$CREATE2_FACTORY" \
  '{
    network: $network,
    chainId: $chainId,
    version: $version,
    deploymentDate: $date,
    deploymentBlock: $block,
    deployer: $deployer,
    deploymentHash: $hash,
    contracts: {
      Executor: $executor,
      Registry: $registry,
      UniswapV2Fetcher: $uv2,
      UniswapV3Fetcher_0_01: $uv3_001,
      UniswapV3Fetcher_0_05: $uv3_005,
      UniswapV3Fetcher_0_3: $uv3_03,
      UniswapV3Fetcher_1: $uv3_1,
      SushiswapFetcher: $sushi,
      BalancerV2Fetcher: $bal,
      StreamDaemon: $streamDaemon,
      Core: $core,
      ETHSupport: $ethSupport,
      Create2Factory: $factory
    },
    notes: {
      changes: "Fresh deploy: V2, Sushi, V3 tiers (100/500/3000/10000), new Registry, Executor, StreamDaemon, Core, ETHSupport."
    }
  }' > "$OUTPUT_FILE"

echo "✅ Saved: $OUTPUT_FILE"
cat "$OUTPUT_FILE" | jq '.'

if [[ -f "scripts/sync-mainnet-addresses-sol.sh" ]]; then
  echo ""
  echo "🔗 Syncing script/addresses/MainnetAddresses.sol..."
  bash scripts/sync-mainnet-addresses-sol.sh
fi
