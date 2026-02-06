# Config.sol - Configuration Contract

This `Config.sol` file dynamically loads all token addresses that form pairs with USDC from the JSON file `config/usdc_pairs_clean.json`.

## 🔧 Generation Script

An automated script generates `*_pairs_clean.json` files from `liquidity.json`:

```bash
# From the config folder
npm run generate:pairs

# Or directly
node generate-pairs.js
```

This script automatically generates:

- `usdc_pairs_clean.json` (71 pairs)
- `usdt_pairs_clean.json` (54 pairs)
- `wbtc_pairs_clean.json` (30 pairs)
- `weth_pairs_clean.json` (99 pairs)

📖 See [SCRIPT_README.md](./SCRIPT_README.md) for more details.

## Features

- ✅ **No hardcoded addresses** - All addresses are loaded from JSON
- ✅ **71 USDC pair addresses** - All tokens from the JSON file are available
- ✅ **Search by name** - Get an address by token name
- ✅ **Search by address** - Get a token name by its address
- ✅ **Utility functions** - Verification, indexing, subsets

## Usage in your CoreFork.t.sol

### 1. Import and Setup

```solidity
// In your test/fork/CoreFork.t.sol file
import { Config } from "../../config/Config.sol";

contract CoreForkTest is Fork_Test {
    Config public config;
    address[] public usdcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Setup Config
        config = new Config();
        config.loadUSDCPairAddresses();

        // Load addresses locally (optional)
        usdcPairAddresses = config.getUSDCPairAddresses();
    }
}
```

### 2. Main Functions

```solidity
// Get all addresses
address[] memory allAddresses = config.getUSDCPairAddresses();

// Get the number of addresses
uint256 count = config.getUSDCPairAddressesCount();

// Get an address by index
address tokenAddr = config.getUSDCPairAddressAt(0);

// Get an address by name
address usdcAddr = config.getTokenAddress("USDC");
address wethAddr = config.getTokenAddress("WETH");

// Get the name by address
string memory tokenName = config.getTokenName(tokenAddr);

// Check if an address is in USDC pairs
bool isUSDCPair = config.isUSDCPairAddress(someAddress);

// Find the index of an address
(bool found, uint256 index) = config.findUSDCPairAddressIndex(tokenAddr);
```

### 3. Utility Functions

```solidity
// Get the first N addresses
address[] memory first10 = config.getFirstNAddresses(10);

// Get addresses by names
string[] memory tokenNames = new string[](3);
tokenNames[0] = "USDC";
tokenNames[1] = "WETH";
tokenNames[2] = "WBTC";
address[] memory addresses = config.getAddressesByNames(tokenNames);

// Get addresses by indices
uint256[] memory indices = new uint256[](3);
indices[0] = 0;
indices[1] = 5;
indices[2] = 10;
address[] memory selectedAddresses = config.getAddressesByIndices(indices);
```

### 4. Complete Example for CoreFork.t.sol

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Fork_Test } from "test/fork/Fork.t.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Config } from "../../config/Config.sol";

contract CoreForkTest is Fork_Test {
    Config public config;
    address[] public usdcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Setup Config - load all addresses from JSON
        config = new Config();
        config.loadUSDCPairAddresses();

        // Optional: load locally for performance
        usdcPairAddresses = config.getUSDCPairAddresses();
    }

    function test_PlaceTradeWithAllUSDCPairs() public {
        uint256 count = config.getUSDCPairAddressesCount();
        console.log("Testing with", count, "USDC pair tokens");

        // Test with the first 5 tokens
        for (uint256 i = 0; i < 5 && i < count; i++) {
            address tokenIn = config.getUSDCPairAddressAt(i);
            address tokenOut = config.getTokenAddress("USDC");
            string memory tokenName = config.getTokenName(tokenIn);

            console.log("Testing trade:", tokenName, "->", "USDC");

            // Your test logic here
            // uint256 amountIn = formatTokenAmount(tokenIn, 1);
            // bytes memory tradeData = abi.encode(tokenIn, tokenOut, amountIn, 0, false, 0.0005 ether);
            // core.placeTrade(tradeData);
        }
    }

    function test_SpecificTokenTrades() public {
        // Test with specific tokens
        address wethAddr = config.getTokenAddress("WETH");
        address wbtcAddr = config.getTokenAddress("WBTC");
        address linkAddr = config.getTokenAddress("link");

        assertTrue(wethAddr != address(0), "WETH should be available");
        assertTrue(wbtcAddr != address(0), "WBTC should be available");
        assertTrue(linkAddr != address(0), "LINK should be available");

        // Test trades with these tokens...
    }

    function test_BatchProcessing() public {
        // Process in batches of 10
        uint256 batchSize = 10;
        uint256 totalCount = config.getUSDCPairAddressesCount();

        for (uint256 batch = 0; batch < totalCount; batch += batchSize) {
            uint256 endIndex = batch + batchSize;
            if (endIndex > totalCount) endIndex = totalCount;

            console.log("Processing batch", batch, "to", endIndex);

            for (uint256 i = batch; i < endIndex; i++) {
                address tokenAddr = config.getUSDCPairAddressAt(i);
                // Process token...
            }
        }
    }
}
```

## Available Tokens

The JSON file contains **89 tokens** including:

- USDC, USDT, WBTC, WETH
- 1inch, AAVE, APE, ARB, BNB
- DAI, ENS, CVX, SHIB, SAND
- MKR, FRAX, SNX, LDO, LINK
- STETH, WSTETH, and many others...

## Error Handling

```solidity
// Always check if data is loaded
require(config.isLoaded(), "Config not loaded");

// Check indices
require(index < config.getUSDCPairAddressesCount(), "Index out of bounds");

// Check null addresses
address tokenAddr = config.getTokenAddress("SOME_TOKEN");
require(tokenAddr != address(0), "Token not found");
```

## Performance

- **Initial loading**: ~8M gas (one time only)
- **Data access**: ~2-5k gas per call
- **Search**: O(n) for address search, O(1) for name search

## Testing

```bash
# Test Config.sol
forge script script/TestConfig.s.sol:TestConfig --ffi -vv

# See usage example
forge script script/ExampleUsage.s.sol:ExampleUsage --ffi -vv
```
