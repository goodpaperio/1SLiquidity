// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FindWhales is Test {
    // Common token addresses for testing
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    function run() public {
        // Check the top 100 addresses on mainnet
        for (uint256 i = 0; i < 100; i++) {
            address addr = address(uint160(i));
            uint256 wethBalance = IERC20(WETH).balanceOf(addr);
            uint256 usdcBalance = IERC20(USDC).balanceOf(addr);
            uint256 usdtBalance = IERC20(USDT).balanceOf(addr);
            if (wethBalance > 0) {
                console.log("WETH Whale: %s, Balance: %s", addr, wethBalance);
            }
            if (usdcBalance > 0) {
                console.log("USDC Whale: %s, Balance: %s", addr, usdcBalance);
            }
            if (usdtBalance > 0) {
                console.log("USDT Whale: %s, Balance: %s", addr, usdtBalance);
            }
        }
    }
}
