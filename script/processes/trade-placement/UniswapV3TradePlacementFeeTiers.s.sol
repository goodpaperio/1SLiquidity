// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./UniswapV3TradePlacement.s.sol";

/// @notice Run trade-placement stack against 0.05% tier (WETH/USDC pool exists at 500).
contract UniswapV3TradePlacement_Fee500 is UniswapV3TradePlacement {
    function setUp() public override {
        _bootstrapUniswapV3(500);
    }
}

/// @notice Run trade-placement stack against 1% tier (WETH/USDC pool exists at 10000).
contract UniswapV3TradePlacement_Fee10000 is UniswapV3TradePlacement {
    function setUp() public override {
        _bootstrapUniswapV3(10000);
    }
}
