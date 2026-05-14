#!/usr/bin/env bash
#
# Place a single ~$5 WETH -> USDC trade on mainnet (current Core 0xD0B6… / v2.2.1 StreamDaemon).
# Uses quote + 160 bps buffer for amountOutMin (same policy as PlaceTradeSmokeV109).
#
# Usage:
#   npm run place-trade:weth-usdc          # broadcast
#   npm run place-trade:weth-usdc:dry      # simulation only
#   ./scripts/place-trade-weth-usdc.sh [RPC_URL]
#
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ -f .env ]; then source .env; fi
RPC_URL="${1:-${MAINNET_RPC_URL:-https://mainnet.infura.io/v3/$INFURA_KEY}}"

FORGE_EXTRA=()
if [[ "${DRY_RUN:-}" == "1" ]]; then
  FORGE_EXTRA=()
  echo "Mode: DRY RUN (no broadcast)"
else
  FORGE_EXTRA=(--broadcast --account deployKey)
  echo "Mode: BROADCAST"
fi

echo "========================================="
echo "Place trade (mainnet) WETH -> USDC"
echo "========================================="
echo "RPC:  $RPC_URL"
echo ""

forge script script/processes/PlaceTradeWethUsdcCast.s.sol:PlaceTradeWethUsdcCast \
  --rpc-url "$RPC_URL" \
  "${FORGE_EXTRA[@]}" \
  --via-ir \
  -vvvv
