#!/usr/bin/env bash
#
# Place a single ~$5 WETH -> USDC trade on mainnet (v1.0.8 Core).
# Uses quote-minus-slippage amountOutMin (non-zero).
#
# Usage:
#   npm run place-trade:weth-usdc
#   ./scripts/place-trade-weth-usdc.sh [RPC_URL]
#
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ -f .env ]; then source .env; fi
RPC_URL="${1:-${MAINNET_RPC_URL:-https://mainnet.infura.io/v3/$INFURA_KEY}}"

echo "========================================="
echo "Place trade (mainnet) WETH -> USDC"
echo "========================================="
echo "RPC:  $RPC_URL"
echo ""

forge script script/processes/PlaceTradeWethUsdcCast.s.sol:PlaceTradeWethUsdcCast \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --account deployKey \
  --via-ir \
  -vvvv
