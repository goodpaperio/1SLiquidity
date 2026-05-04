#!/usr/bin/env bash
#
# Place a single ~$5 trade on mainnet (v1.0.6 Core). Signs with deployKey.
#
# Usage:
#   npm run place-trade -- WETH_DAI
#   npm run place-trade -- USDC_PEPE
#   ./scripts/place-trade.sh WETH_DAI [RPC_URL]
#
# Pairs: WETH_DAI, WETH_PEPE, USDC_DAI, USDC_PEPE, ETH_DAI, ETH_PEPE
#
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ -f .env ]; then source .env; fi
PAIR="${1:?Usage: place-trade.sh <PAIR> [RPC_URL]}"
RPC_URL="${2:-${MAINNET_RPC_URL:-https://mainnet.infura.io/v3/$INFURA_KEY}}"
export PAIR
echo "========================================="
echo "Place trade (mainnet)"
echo "========================================="
echo "PAIR: $PAIR"
echo "RPC:  $RPC_URL"
echo ""
forge script script/processes/PlaceTradeCast.s.sol:PlaceTradeCast \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --account deployKey \
  --via-ir \
  -vvvv
