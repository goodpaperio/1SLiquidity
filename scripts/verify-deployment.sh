#!/bin/bash

# Verification script for deployed contracts
# Uses Sourcify first (more reliable), then Etherscan as fallback

set -e

source .env

# Compiler settings
COMPILER_VERSION="0.8.30"
OPTIMIZER_RUNS=200
CHAIN_ID=1

# Deployed addresses (from latest broadcast)
CORE="0xDe054C37000a639d33b886df0E48B011c2092474"
REGISTRY="0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4"
EXECUTOR="0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878"
STREAM_DAEMON="0xaaBC29359629A93c7DC850ae938d4d8460eA5669"
UNISWAP_V2_FETCHER="0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089"
UNISWAP_V3_FETCHER_500="0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B"
UNISWAP_V3_FETCHER_3000="0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518"
UNISWAP_V3_FETCHER_10000="0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43"
SUSHISWAP_FETCHER="0x57cfC5AD0812747afbb3dCD98B23b94883A341BC"
BALANCER_REGISTRY="0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1"
BALANCER_FETCHER="0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6"
CURVE_FETCHER="0xdaa78BA8ff44351a7669746209d371bCdD85d062"

# Constants from deployment
UNISWAP_V2_FACTORY="0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
UNISWAP_V3_FACTORY="0x1F98431c8aD98523631AE4a59f267346ea31F984"
SUSHISWAP_FACTORY="0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
BALANCER_VAULT="0xBA12222222228d8Ba445958a75a0704d566BF2C8"
CURVE_META_REGISTRY="0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC"
DEPLOYER="0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"

echo "=========================================="
echo "Contract Verification Script"
echo "=========================================="
echo ""

# Function to verify with Sourcify (preferred)
verify_sourcify() {
    local address=$1
    local contract_path=$2
    local contract_name=$3
    
    echo "📤 Verifying $contract_name ($address) with Sourcify..."
    forge verify-contract \
        $address \
        $contract_path:$contract_name \
        --chain-id $CHAIN_ID \
        --compiler-version $COMPILER_VERSION \
        --num-of-optimizations $OPTIMIZER_RUNS \
        --verifier sourcify \
        --rpc-url $MAINNET_RPC_URL \
        --watch || return 1
}

# Function to verify with Etherscan (fallback)
verify_etherscan() {
    local address=$1
    local contract_path=$2
    local contract_name=$3
    local constructor_args=$4
    
    echo "📤 Verifying $contract_name ($address) with Etherscan..."
    local cmd="forge verify-contract \
        $address \
        $contract_path:$contract_name \
        --chain-id $CHAIN_ID \
        --compiler-version $COMPILER_VERSION \
        --num-of-optimizations $OPTIMIZER_RUNS \
        --etherscan-api-key $API_KEY_ETHERSCAN \
        --rpc-url $MAINNET_RPC_URL"
    
    if [ ! -z "$constructor_args" ]; then
        cmd="$cmd --constructor-args $constructor_args"
    fi
    
    eval $cmd --watch || return 1
}

# Function to try both verifiers
verify_contract() {
    local address=$1
    local contract_path=$2
    local contract_name=$3
    local constructor_args=$4
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Verifying: $contract_name"
    echo "Address: $address"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Try Sourcify first
    if verify_sourcify "$address" "$contract_path" "$contract_name"; then
        echo "✅ Verified with Sourcify"
        return 0
    fi
    
    echo "⚠️  Sourcify failed, trying Etherscan..."
    
    # Fallback to Etherscan
    if verify_etherscan "$address" "$contract_path" "$contract_name" "$constructor_args"; then
        echo "✅ Verified with Etherscan"
        return 0
    fi
    
    echo "❌ Verification failed with both verifiers"
    return 1
}

# Verify contracts

# 1. Executor (no constructor args)
verify_contract "$EXECUTOR" "src/Executor.sol" "Executor" ""

# 2. Registry (no constructor args)
verify_contract "$REGISTRY" "src/Registry.sol" "Registry" ""

# 3. UniswapV2Fetcher
UNISWAP_V2_ARGS=$(cast abi-encode "constructor(address)" "$UNISWAP_V2_FACTORY")
verify_contract "$UNISWAP_V2_FETCHER" "src/adapters/UniswapV2Fetcher.sol" "UniswapV2Fetcher" "$UNISWAP_V2_ARGS"

# 4. UniswapV3Fetcher (0.05%)
UNISWAP_V3_500_ARGS=$(cast abi-encode "constructor(address,uint24)" "$UNISWAP_V3_FACTORY" "500")
verify_contract "$UNISWAP_V3_FETCHER_500" "src/adapters/UniswapV3Fetcher.sol" "UniswapV3Fetcher" "$UNISWAP_V3_500_ARGS"

# 5. UniswapV3Fetcher (0.3%)
UNISWAP_V3_3000_ARGS=$(cast abi-encode "constructor(address,uint24)" "$UNISWAP_V3_FACTORY" "3000")
verify_contract "$UNISWAP_V3_FETCHER_3000" "src/adapters/UniswapV3Fetcher.sol" "UniswapV3Fetcher" "$UNISWAP_V3_3000_ARGS"

# 6. UniswapV3Fetcher (1%)
UNISWAP_V3_10000_ARGS=$(cast abi-encode "constructor(address,uint24)" "$UNISWAP_V3_FACTORY" "10000")
verify_contract "$UNISWAP_V3_FETCHER_10000" "src/adapters/UniswapV3Fetcher.sol" "UniswapV3Fetcher" "$UNISWAP_V3_10000_ARGS"

# 7. SushiswapFetcher
SUSHISWAP_ARGS=$(cast abi-encode "constructor(address)" "$SUSHISWAP_FACTORY")
verify_contract "$SUSHISWAP_FETCHER" "src/adapters/SushiswapFetcher.sol" "SushiswapFetcher" "$SUSHISWAP_ARGS"

# 8. BalancerV2PoolRegistry
BALANCER_REG_ARGS=$(cast abi-encode "constructor(address)" "$DEPLOYER")
verify_contract "$BALANCER_REGISTRY" "src/adapters/BalancerV2PoolRegistry.sol" "BalancerV2PoolRegistry" "$BALANCER_REG_ARGS"

# 9. BalancerV2Fetcher
BALANCER_FETCH_ARGS=$(cast abi-encode "constructor(address,address)" "$BALANCER_VAULT" "$BALANCER_REGISTRY")
verify_contract "$BALANCER_FETCHER" "src/adapters/BalancerV2Fetcher.sol" "BalancerV2Fetcher" "$BALANCER_FETCH_ARGS"

# 10. CurveMetaFetcher
CURVE_ARGS=$(cast abi-encode "constructor(address)" "$CURVE_META_REGISTRY")
verify_contract "$CURVE_FETCHER" "src/adapters/CurveMetaFetcher.sol" "CurveMetaFetcher" "$CURVE_ARGS"

# 11. StreamDaemon (complex constructor - arrays)
# StreamDaemon constructor takes two arrays: dexs[] and routers[]
# Arrays from deployment:
# dexs[0-6] = uniswapV2Fetcher, uniswapV3Fetcher500, uniswapV3Fetcher3000, uniswapV3Fetcher10000, sushiswapFetcher, balancerFetcher, curveFetcher
# routers[0-6] = UNISWAP_V2_ROUTER, UNISWAP_V3_ROUTER (x3), SUSHISWAP_ROUTER, balancerFetcher, curveFetcher

UNISWAP_V2_ROUTER="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
UNISWAP_V3_ROUTER="0xE592427A0AEce92De3Edee1F18E0157C05861564"
SUSHISWAP_ROUTER="0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"

STREAM_DAEMON_ARGS=$(cast abi-encode "constructor(address[],address[])" \
    "[$UNISWAP_V2_FETCHER,$UNISWAP_V3_FETCHER_500,$UNISWAP_V3_FETCHER_3000,$UNISWAP_V3_FETCHER_10000,$SUSHISWAP_FETCHER,$BALANCER_FETCHER,$CURVE_FETCHER]" \
    "[$UNISWAP_V2_ROUTER,$UNISWAP_V3_ROUTER,$UNISWAP_V3_ROUTER,$UNISWAP_V3_ROUTER,$SUSHISWAP_ROUTER,$BALANCER_FETCHER,$CURVE_FETCHER]")
verify_contract "$STREAM_DAEMON" "src/StreamDaemon.sol" "StreamDaemon" "$STREAM_DAEMON_ARGS"

# 12. Core (final contract)
CORE_ARGS=$(cast abi-encode "constructor(address,address,address,address)" \
    "$STREAM_DAEMON" "$EXECUTOR" "$REGISTRY" "0x0000000000000000000000000000000000000000")
verify_contract "$CORE" "src/Core.sol" "Core" "$CORE_ARGS"

echo ""
echo "=========================================="
echo "✅ Verification process completed!"
echo "=========================================="

