#!/usr/bin/env bash
# Generate Solidity Standard-Json-Input for Etherscan verification (v1.0.5).
# Run from repo root: ./scripts/flatten-for-verification.sh
#
# Uses forge verify-contract --show-standard-json-input so the JSON matches
# the exact compilation (via-ir, optimizer runs, etc.) and avoids bytecode mismatch.

set -e
cd "$(dirname "$0")/.."

mkdir -p flattened

# v1.0.5 deployment addresses (mainnet)
CORE_ADDRESS="0x62a1e4dc903f0677ba4e06494af0a74d8a1205be"
STREAM_DAEMON_ADDRESS="0xd35f101db2ea11693c09851389494d9e297de95c"

# Constructor args (ABI-encoded) for v1.0.5
# Core: (streamDaemon, executor, registry, ethSupport=0)
CORE_CONSTRUCTOR_ARGS="0x000000000000000000000000d35f101db2ea11693c09851389494d9e297de95c00000000000000000000000072a23d256fa59b7dbc812eade5aae062ba6c21c0000000000000000000000000478044a89d7fad50a2188070d85eaf3bd7dac7bb0000000000000000000000000000000000000000000000000000000000000000"
# StreamDaemon: (dexs[6], routers[6]) – v1.0.5 fetcher addresses
STREAM_DAEMON_CONSTRUCTOR_ARGS="0x00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000600000000000000000000000097538a173e00ed37e96d8ded7c54051adb8fca7b0000000000000000000000007a88f533287ab702c7f13bbbf7112c6563c8aba800000000000000000000000d56510bbf2de389553571728807402b35920762f00000000000000000000000059590f24b3eb618fc090385e0f0ef4d22180942d000000000000000000000000fa6c98f6de087483aa74607b952ae11564962e87000000000000000000000000bfa5c66fb1131c599178c6b1fc863349e47b5d4e00000000000000000000000000000000000000000000000000000000000000060000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000d9e1ce17f2641f24ae83637ab66a2cca9c378b9f000000000000000000000000bfa5c66fb1131c599178c6b1fc863349e47b5d4e"

COMPILER_VERSION="0.8.30"
OPTIMIZER_RUNS=200

echo "Generating Standard-Json-Input for Etherscan verification (v1.0.5)..."
echo ""

echo "Core (${CORE_ADDRESS})..."
forge verify-contract "$CORE_ADDRESS" src/Core.sol:Core \
  --chain mainnet \
  --constructor-args "$CORE_CONSTRUCTOR_ARGS" \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --via-ir \
  --verifier etherscan \
  --show-standard-json-input \
  2>/dev/null > flattened/Core-standard-json-input.json
echo "  -> flattened/Core-standard-json-input.json ($(wc -c < flattened/Core-standard-json-input.json) bytes)"

echo "StreamDaemon (${STREAM_DAEMON_ADDRESS})..."
forge verify-contract "$STREAM_DAEMON_ADDRESS" src/StreamDaemon.sol:StreamDaemon \
  --chain mainnet \
  --constructor-args "$STREAM_DAEMON_CONSTRUCTOR_ARGS" \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --via-ir \
  --verifier etherscan \
  --show-standard-json-input \
  2>/dev/null > flattened/StreamDaemon-standard-json-input.json
echo "  -> flattened/StreamDaemon-standard-json-input.json ($(wc -c < flattened/StreamDaemon-standard-json-input.json) bytes)"

echo ""
echo "Done. Use these files on Etherscan with Compiler Type: Solidity (Standard-Json-Input)."
ls -la flattened/*-standard-json-input.json
