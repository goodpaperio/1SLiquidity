#!/usr/bin/env bash
#
# Place a single ~$5 trade on local Anvil fork. Funds signer from whales then places trade.
# Start fork first: npm run anvil:hard-start (in another terminal).
#
# Usage:
#   npm run place-trade:fork -- WETH_DAI
#   ./scripts/place-trade-fork.sh WETH_DAI
#
# Pairs: WETH_DAI, WETH_PEPE, USDC_DAI, USDC_PEPE, ETH_DAI, ETH_PEPE
#
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ -f .env ]; then source .env; fi
PAIR="${1:?Usage: place-trade-fork.sh <PAIR>}"
export PAIR
echo "========================================="
echo "Place trade (fork @ localhost:8545)"
echo "========================================="
echo "PAIR: $PAIR"
echo "RPC:  http://localhost:8545"
echo ""
forge script script/processes/PlaceTradeCastFork.s.sol:PlaceTradeCastFork \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --account deployKey \
  --via-ir \
  -vvvv
