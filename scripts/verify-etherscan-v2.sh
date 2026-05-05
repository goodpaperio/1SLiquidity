#!/bin/bash

# Direct Etherscan V2 API verification script
# Bypasses Forge's deprecated V1 API issues

set -e

source .env

# Etherscan V2 API endpoint
ETHERSCAN_API="https://api.etherscan.io/v2/api"

# Compiler settings
COMPILER_VERSION="v0.8.30+commit.8c972834"
OPTIMIZER_RUNS=200

# Contract addresses (format: address|contract_path|contract_name)
CONTRACTS=(
    "0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878|src/Executor.sol|Executor"
    "0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4|src/Registry.sol|Registry"
    "0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089|src/adapters/UniswapV2Fetcher.sol|UniswapV2Fetcher"
    "0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B|src/adapters/UniswapV3Fetcher.sol|UniswapV3Fetcher"
    "0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518|src/adapters/UniswapV3Fetcher.sol|UniswapV3Fetcher"
    "0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43|src/adapters/UniswapV3Fetcher.sol|UniswapV3Fetcher"
    "0x57cfC5AD0812747afbb3dCD98B23b94883A341BC|src/adapters/SushiswapFetcher.sol|SushiswapFetcher"
    "0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1|src/adapters/BalancerV2PoolRegistry.sol|BalancerV2PoolRegistry"
    "0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6|src/adapters/BalancerV2Fetcher.sol|BalancerV2Fetcher"
    "0xdaa78BA8ff44351a7669746209d371bCdD85d062|src/adapters/CurveMetaFetcher.sol|CurveMetaFetcher"
    "0xaaBC29359629A93c7DC850ae938d4d8460eA5669|src/StreamDaemon.sol|StreamDaemon"
    "0xDe054C37000a639d33b886df0E48B011c2092474|src/Core.sol|Core"
)

echo "=========================================="
echo "Etherscan V2 API Verification"
echo "=========================================="
echo ""
echo "⚠️  Note: This script requires manual source code upload."
echo "For automated verification, please update Forge to latest version."
echo ""
echo "For each contract:"
echo "1. Go to https://etherscan.io/address/[ADDRESS]#code"
echo "2. Click 'Verify and Publish'"
echo "3. Use these settings:"
echo "   - Compiler: $COMPILER_VERSION"
echo "   - Optimization: YES ($OPTIMIZER_RUNS runs)"
echo "   - Via IR: YES"
echo "   - Constructor arguments: (see below)"
echo ""
echo "=========================================="
echo ""

for contract_info in "${CONTRACTS[@]}"; do
    IFS='|' read -r address contract_path contract_name <<< "$contract_info"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Contract: $contract_name"
    echo "Address: $address"
    echo "Path: $contract_path"
    echo "Etherscan: https://etherscan.io/address/$address#code"
    
    # Generate constructor args for contracts that need them
    case "$contract_name" in
        "UniswapV2Fetcher")
            echo "Constructor args: $(cast abi-encode 'constructor(address)' '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f')"
            ;;
        "UniswapV3Fetcher")
            if [ "$address" == "0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B" ]; then
                echo "Constructor args: $(cast abi-encode 'constructor(address,uint24)' '0x1F98431c8aD98523631AE4a59f267346ea31F984' '500')"
            elif [ "$address" == "0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518" ]; then
                echo "Constructor args: $(cast abi-encode 'constructor(address,uint24)' '0x1F98431c8aD98523631AE4a59f267346ea31F984' '3000')"
            elif [ "$address" == "0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43" ]; then
                echo "Constructor args: $(cast abi-encode 'constructor(address,uint24)' '0x1F98431c8aD98523631AE4a59f267346ea31F984' '10000')"
            fi
            ;;
        "SushiswapFetcher")
            echo "Constructor args: $(cast abi-encode 'constructor(address)' '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac')"
            ;;
        "BalancerV2PoolRegistry")
            echo "Constructor args: $(cast abi-encode 'constructor(address)' '0x538e5E9797fa86eE25e97289439b6A3AbA0165b0')"
            ;;
        "BalancerV2Fetcher")
            echo "Constructor args: $(cast abi-encode 'constructor(address,address)' '0xBA12222222228d8Ba445958a75a0704d566BF2C8' '0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1')"
            ;;
        "CurveMetaFetcher")
            echo "Constructor args: $(cast abi-encode 'constructor(address)' '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC')"
            ;;
        "StreamDaemon")
            echo "Constructor args: (complex - see deployment script)"
            echo "  dexs[]: [0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089,0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B,0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518,0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43,0x57cfC5AD0812747afbb3dCD98B23b94883A341BC,0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6,0xdaa78BA8ff44351a7669746209d371bCdD85d062]"
            echo "  routers[]: [0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D,0xE592427A0AEce92De3Edee1F18E0157C05861564,0xE592427A0AEce92De3Edee1F18E0157C05861564,0xE592427A0AEce92De3Edee1F18E0157C05861564,0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F,0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6,0xdaa78BA8ff44351a7669746209d371bCdD85d062]"
            ;;
        "Core")
            echo "Constructor args: $(cast abi-encode 'constructor(address,address,address,address)' '0xaaBC29359629A93c7DC850ae938d4d8460eA5669' '0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878' '0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4' '0x0000000000000000000000000000000000000000')"
            ;;
        *)
            echo "Constructor args: (none)"
            ;;
    esac
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
done

echo ""
echo "=========================================="
echo "Alternative: Use Sourcify (open source)"
echo "=========================================="
echo ""
echo "Upload contracts manually to: https://sourcify.dev/"
echo "Select all .sol files from src/ directory"
echo ""

