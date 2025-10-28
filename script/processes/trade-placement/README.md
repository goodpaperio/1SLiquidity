# Custom Trade Placement Tests

This directory contains custom test scripts to debug the zero address issue and gas problems in the 1SLiquidity protocol.

## Test Scripts

### 1. CustomTradePlacement.s.sol

A simplified trade placement test that:

- Uses only SushiSwap and UniswapV2 (removes complexity)
- Places a USDC/DAI trade
- Executes the trade multiple times until settled
- Monitors gas usage and execution flow

### 2. ZeroAddressDebugTest.s.sol

A focused debug test that:

- Specifically tests for the zero address issue
- Places a USDC/DAI trade
- Debugs StreamDaemon evaluation step by step
- Tests fetcher calls directly to isolate the issue

## Running the Tests

### Prerequisites

1. Set up your environment variables:
   ```bash
   export MAINNET_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
   ```

### Run Custom Trade Placement Test

```bash
chmod +x run-custom-test.sh
./run-custom-test.sh
```

### Run Zero Address Debug Test

```bash
chmod +x run-zero-address-debug.sh
./run-zero-address-debug.sh
```

### Run Individual Tests

```bash
# Custom trade placement
forge test --match-contract CustomTradePlacement --fork-url $MAINNET_RPC_URL -vvvv

# Zero address debug
forge test --match-contract ZeroAddressDebugTest --fork-url $MAINNET_RPC_URL -vvvv
```

## What These Tests Will Show

### CustomTradePlacement.s.sol

- Whether the simplified DEX setup works correctly
- Gas usage patterns during trade execution
- Whether trades settle properly with limited DEX options
- Execution flow and sweet spot behavior

### ZeroAddressDebugTest.s.sol

- Whether StreamDaemon is receiving correct token addresses
- Whether the issue is in StreamDaemon evaluation
- Whether fetchers are being called with correct parameters
- Step-by-step debugging of the evaluation process

## Expected Outcomes

If the zero address issue is in StreamDaemon:

- The debug test will show where addresses become zero
- We'll see which fetcher calls are failing
- We can isolate whether it's a specific DEX or a general issue

If the issue is elsewhere:

- The simplified setup will work correctly
- We can narrow down the problem to specific components

## Next Steps

Based on the test results:

1. **If StreamDaemon works**: The issue is in the full protocol setup
2. **If StreamDaemon fails**: We need to debug the StreamDaemon contract
3. **If specific DEXs fail**: We need to check the fetcher implementations
4. **If gas issues persist**: We need to optimize the execution logic

## Notes

- These tests use a mainnet fork to get real liquidity and prices
- They use whale addresses to fund the test contract
- The tests are designed to be deterministic and repeatable
- All tests include extensive logging for debugging
