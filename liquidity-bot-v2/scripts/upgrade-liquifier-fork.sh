#!/usr/bin/env bash
# Upgrade LiquifierV1 proxy on a local Anvil fork to the Permit2-spender fix.
set -euo pipefail

RPC="${1:-http://127.0.0.1:8545}"
PROXY="0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95"
OWNER="0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"
CONTRACTS_DIR="${SPLITTER_CONTRACTS:-$HOME/code/splittter/contracts}"

if [[ ! -d "$CONTRACTS_DIR" ]]; then
  echo "splittter contracts not found at $CONTRACTS_DIR" >&2
  exit 1
fi

cd "$CONTRACTS_DIR"
forge build --contracts src/LiquifierV1.sol >/dev/null

cast rpc anvil_impersonateAccount "$OWNER" --rpc-url "$RPC" >/dev/null
cast rpc anvil_setBalance "$OWNER" 0x56BC75E2D63100000 --rpc-url "$RPC" >/dev/null

echo "deploying fixed LiquifierV1 implementation..."
OUT=$(forge create src/LiquifierV1.sol:LiquifierV1 \
  --rpc-url "$RPC" \
  --from "$OWNER" \
  --unlocked \
  --broadcast 2>&1)
IMPL=$(echo "$OUT" | grep "Deployed to:" | awk '{print $3}')
if [[ -z "$IMPL" ]]; then
  echo "$OUT" >&2
  echo "failed to deploy implementation" >&2
  exit 1
fi

echo "implementation: $IMPL"
echo "upgrading proxy $PROXY..."
cast send "$PROXY" "upgradeToAndCall(address,bytes)" "$IMPL" 0x \
  --rpc-url "$RPC" \
  --from "$OWNER" \
  --unlocked \
  --gas-limit 500000 >/dev/null

cast rpc anvil_stopImpersonatingAccount "$OWNER" --rpc-url "$RPC" >/dev/null
echo "Liquifier proxy upgraded on fork."
