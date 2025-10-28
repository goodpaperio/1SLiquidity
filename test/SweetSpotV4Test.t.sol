// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/StreamDaemon.sol";
import "../src/adapters/UniswapV3Fetcher.sol";

contract SweetSpotV4Test is Test {
    StreamDaemon public streamDaemon;
    UniswapV3Fetcher public uniswapV3Fetcher;
    
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    
    function setUp() public {
        // Deploy contracts
        uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 3000);
        
        address[] memory dexs = new address[](1);
        address[] memory routers = new address[](1);
        dexs[0] = address(uniswapV3Fetcher);
        routers[0] = 0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router
        
        streamDaemon = new StreamDaemon(dexs, routers);
    }
    
    function testSweetSpotV4BasicCalculation() public view {
        console.log("\n=== Testing Sweet Spot V4 - Basic Slippage Calculation ===\n");
        
        // Test with different volumes
        uint256[] memory testAmounts = new uint256[](5);
        testAmounts[0] = 1 * 1e18;    // 1 WETH
        testAmounts[1] = 10 * 1e18;   // 10 WETH
        testAmounts[2] = 100 * 1e18;  // 100 WETH
        testAmounts[3] = 1000 * 1e18; // 1000 WETH
        testAmounts[4] = 10000 * 1e18; // 10000 WETH
        
        for (uint256 i = 0; i < testAmounts.length; i++) {
            uint256 volume = testAmounts[i];
            console.log("\n--- Testing with %d WETH ---", volume / 1e18);
            
            uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
                WETH,
                USDC,
                volume,
                address(uniswapV3Fetcher)
            );
            
            uint256 effectiveVolume = volume / sweetSpot;
            console.log("Sweet Spot: %d", sweetSpot);
            console.log("Effective Volume: %d WETH", effectiveVolume / 1e18);
            console.log("Volume Reduction: %d%%", ((volume - effectiveVolume) * 100) / volume);
            console.log("");
        }
    }
}
