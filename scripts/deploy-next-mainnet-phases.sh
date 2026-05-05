#!/usr/bin/env bash
# Phase A → B → C mainnet deploy (V3 fetchers, Registry+routers, CREATE2 Core+StreamDaemon).
# Prereqs: .env with MAINNET_RPC_URL; Foundry account `deployKey`; new CREATE2 salt tag.
#
# Usage:
#   export DEPLOY_BAREBONES_SALT_TAG=1.0.7   # must be new vs any prior CREATE2 deploy
#   source .env
#   bash scripts/deploy-next-mainnet-phases.sh
#
# Or run phases individually (see docs/MAINNET_DEPLOY_NEXT.md).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# npm does not load .env; load repo .env when present (export MAINNET_RPC_URL, etc.)
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT/.env"
  set +a
fi

: "${MAINNET_RPC_URL:?Set MAINNET_RPC_URL in .env (or export it before npm run)}"
: "${DEPLOY_BAREBONES_SALT_TAG:?Set a new tag, e.g. export DEPLOY_BAREBONES_SALT_TAG=1.0.7}"

SENDER="${DEPLOY_SENDER:-0x538e5E9797fa86eE25e97289439b6A3AbA0165b0}"

forge build --via-ir

echo ">>> Phase A: 3× UniswapV3Fetcher + QuoterV2"
forge script script/processes/deployment/DeployUniswapV3FetchersPhaseA.s.sol:DeployUniswapV3FetchersPhaseA \
  --rpc-url "$MAINNET_RPC_URL" \
  --broadcast \
  --account deployKey \
  --sender "$SENDER" \
  --via-ir \
  -vvvv

set -a
# shellcheck source=/dev/null
source "$ROOT/deployments/phase-a-mainnet.env"
set +a

echo ">>> Phase B: Registry + configure routers"
forge script script/processes/deployment/DeployRegistryAndConfigureRouters.s.sol:DeployRegistryAndConfigureRouters \
  --rpc-url "$MAINNET_RPC_URL" \
  --broadcast \
  --account deployKey \
  --sender "$SENDER" \
  --via-ir \
  -vvvv

# shellcheck source=/dev/null
source "$ROOT/deployments/phase-b-mainnet.env"

echo ">>> Phase C: DeployBarebonesCore (env: V3 + Registry + SALT_TAG)"
forge script script/processes/deployment/DeployBarebonesCore.s.sol:DeployBarebonesCore \
  --rpc-url "$MAINNET_RPC_URL" \
  --broadcast \
  --account deployKey \
  --sender "$SENDER" \
  --via-ir \
  -vvvv

echo "Done. Artifacts: deployments/phase-a-mainnet.env, deployments/phase-b-mainnet.env"
echo "Next: verify contracts, update versions/*.json, npm run sync:mainnet-addresses:sol, npm run test:mainnet-fetcher-alignment"
