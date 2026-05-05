#!/usr/bin/env bash
#
# Deploy Core/StreamDaemon hotfix (v1.0.8) reusing existing infrastructure.
# - Uses explicit hardcoded addresses (no edits to .env required)
# - Broadcasts DeployBarebonesCore with deterministic salt tag 1.0.8
# - Writes versions/deployment-addresses-mainnet-1.0.8.json
# - Syncs script/addresses/MainnetAddresses.sol
# - Updates local-monitor/src/config.ts (CONTRACT_ADDRESSES + DEPLOYMENT_BLOCK)
# - Redeploys local-monitor to EC2
#
# Usage:
#   bash scripts/deploy-core-hotfix-v1.0.8.sh
#   bash scripts/deploy-core-hotfix-v1.0.8.sh 0xYourBotEOA   # optional whitelist bot
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load environment values needed for forge broadcast (MAINNET_RPC_URL, keystore, etc.)
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT/.env"
  set +a
fi

: "${MAINNET_RPC_URL:?Set MAINNET_RPC_URL in .env (or export it before running)}"

VERSION="1.0.8"
SENDER="0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"

# Explicit reused addresses (do not depend on phase env files)
export DEPLOY_BAREBONES_SALT_TAG="$VERSION"
export DEPLOY_BAREBONES_EXECUTOR="0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878"
export DEPLOY_BAREBONES_REGISTRY="0x34d4bd3D3424B4C06bA14D68a10e1DBA5Cfb11D4"
export DEPLOY_BAREBONES_ETH_SUPPORT="0xB970aF8dA1909230a32819602d97a0C0d44C5FB5"
export DEPLOY_BAREBONES_V2="0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089"
export DEPLOY_BAREBONES_V3_500="0x15DC9274c61D9B0F20dC09bD0BFA7D1e2D504FC6"
export DEPLOY_BAREBONES_V3_3000="0xD561BC0801Fb9E85Ea151a784fCb41898C98f49a"
export DEPLOY_BAREBONES_V3_10000="0xec5545C87eE4F74d33A4af6F817a1B6eabF67852"
export DEPLOY_BAREBONES_SUSHI="0x57cfC5AD0812747afbb3dCD98B23b94883A341BC"
export DEPLOY_BAREBONES_BALANCER="0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6"

OPTIONAL_BOT="${1:-}"
if [ -n "$OPTIONAL_BOT" ]; then
  export DEPLOY_BAREBONES_BOT="$OPTIONAL_BOT"
  echo ">>> Optional bot whitelist enabled: $DEPLOY_BAREBONES_BOT"
fi

echo ">>> Building contracts"
forge build --via-ir

echo ">>> Deploying Phase C hotfix (DeployBarebonesCore)"
forge script script/processes/deployment/DeployBarebonesCore.s.sol:DeployBarebonesCore \
  --rpc-url "$MAINNET_RPC_URL" \
  --broadcast \
  --account deployKey \
  --sender "$SENDER" \
  --via-ir \
  -vvvv

LATEST_DEPLOYMENT="broadcast/DeployBarebonesCore.s.sol/1/run-latest.json"
if [ ! -f "$LATEST_DEPLOYMENT" ]; then
  echo "❌ Expected broadcast not found: $LATEST_DEPLOYMENT"
  exit 1
fi

echo ">>> Parsing deployment artifacts: $LATEST_DEPLOYMENT"

CONTRACT_CREATED_TOPIC="0x345fe8f41c1624b2bef5ee139b5b5fa4b3dec60c3bf0ce05f0ac5e6f95b6bba3"
FACTORY_ADDRESS="$(jq -r '[.transactions[] | select(.transactionType == "CREATE")] | .[0].contractAddress' "$LATEST_DEPLOYMENT")"
STREAMDAEMON_HEX="$(jq -r --arg topic "$CONTRACT_CREATED_TOPIC" --arg factory "$FACTORY_ADDRESS" \
  '[.receipts[].logs[]? | select(.address == $factory and .topics[0] == $topic)] | .[0].topics[1]' "$LATEST_DEPLOYMENT")"
CORE_HEX="$(jq -r --arg topic "$CONTRACT_CREATED_TOPIC" --arg factory "$FACTORY_ADDRESS" \
  '[.receipts[].logs[]? | select(.address == $factory and .topics[0] == $topic)] | .[1].topics[1]' "$LATEST_DEPLOYMENT")"

STREAMDAEMON_ADDRESS="0x${STREAMDAEMON_HEX: -40}"
CORE_ADDRESS="0x${CORE_HEX: -40}"

if [ "${CORE_ADDRESS}" = "0x" ] || [ "${STREAMDAEMON_ADDRESS}" = "0x" ]; then
  echo "❌ Failed to parse Core/StreamDaemon from broadcast logs"
  exit 1
fi

BLOCK_HEX="$(jq -r '.receipts[0].blockNumber' "$LATEST_DEPLOYMENT")"
if [[ "$BLOCK_HEX" =~ ^0x ]]; then
  DEPLOYMENT_BLOCK="$(printf "%d" "$BLOCK_HEX")"
else
  DEPLOYMENT_BLOCK="$BLOCK_HEX"
fi

DEPLOYER="$(jq -r '.transactions[0].from // "0x538e5e9797fa86ee25e97289439b6a3aba0165b0"' "$LATEST_DEPLOYMENT")"
DEPLOYMENT_HASH="$(jq -r '.receipts[0].transactionHash // "unknown"' "$LATEST_DEPLOYMENT")"

OUTPUT_FILE="versions/deployment-addresses-mainnet-${VERSION}.json"

echo ">>> Writing $OUTPUT_FILE"
jq -n \
  --arg network "mainnet" \
  --argjson chainId 1 \
  --arg version "$VERSION" \
  --arg date "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --argjson block "$DEPLOYMENT_BLOCK" \
  --arg deployer "$DEPLOYER" \
  --arg hash "$DEPLOYMENT_HASH" \
  --arg executor "$DEPLOY_BAREBONES_EXECUTOR" \
  --arg registry "$DEPLOY_BAREBONES_REGISTRY" \
  --arg ethSupport "$DEPLOY_BAREBONES_ETH_SUPPORT" \
  --arg uv2 "$DEPLOY_BAREBONES_V2" \
  --arg uv3_005 "$DEPLOY_BAREBONES_V3_500" \
  --arg uv3_03 "$DEPLOY_BAREBONES_V3_3000" \
  --arg uv3_1 "$DEPLOY_BAREBONES_V3_10000" \
  --arg sushi "$DEPLOY_BAREBONES_SUSHI" \
  --arg bal "$DEPLOY_BAREBONES_BALANCER" \
  --arg streamDaemon "$STREAMDAEMON_ADDRESS" \
  --arg core "$CORE_ADDRESS" \
  --arg factory "$FACTORY_ADDRESS" \
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
      changes: "Core hotfix v1.0.8 (executeStream payout/dequeue fix). Reused: Registry, Executor, ETHSupport, UniswapV2/V3, Sushiswap, Balancer fetchers."
    }
  }' > "$OUTPUT_FILE"

echo ">>> Syncing MainnetAddresses.sol"
bash scripts/sync-mainnet-addresses-sol.sh

echo ">>> Updating local-monitor/src/config.ts"
node <<'NODE'
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cfgPath = path.join(root, "local-monitor/src/config.ts");
const jsonPath = path.join(root, "versions/deployment-addresses-mainnet-1.0.8.json");

const cfg = fs.readFileSync(cfgPath, "utf8");
const deploy = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const c = deploy.contracts;

let next = cfg;

next = next.replace(
  /export const CONTRACT_ADDRESSES: ContractAddresses = \{[\s\S]*?\n\};/,
  `export const CONTRACT_ADDRESSES: ContractAddresses = {\n  core: "${c.Core}",\n  registry: "${c.Registry}",\n  executor: "${c.Executor}",\n  streamDaemon: "${c.StreamDaemon}",\n};`
);

next = next.replace(
  /export const DEPLOYMENT_BLOCK = \d+;/,
  `export const DEPLOYMENT_BLOCK = ${deploy.deploymentBlock};`
);

if (next === cfg) {
  throw new Error("Failed to update local-monitor/src/config.ts (pattern not found).");
}

fs.writeFileSync(cfgPath, next);
console.log("✅ Updated local-monitor/src/config.ts");
NODE

echo ">>> Rebuilding local-monitor"
(cd local-monitor && npm run build)

echo ">>> Redeploying monitor server"
npm run redeploy-server

echo ""
echo "✅ v${VERSION} hotfix flow complete"
echo "   Core:         $CORE_ADDRESS"
echo "   StreamDaemon: $STREAMDAEMON_ADDRESS"
echo "   Block:        $DEPLOYMENT_BLOCK"
echo "   Manifest:     $OUTPUT_FILE"
