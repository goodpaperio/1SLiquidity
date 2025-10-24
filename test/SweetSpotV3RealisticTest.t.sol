// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/StreamDaemon.sol";
import "../src/adapters/UniswapV2Fetcher.sol";
import "../src/adapters/UniswapV3Fetcher.sol";
import "../src/adapters/CurveFetcher.sol";
import "../src/adapters/SushiswapFetcher.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SweetSpotV3RealisticTest is Test {
    StreamDaemon streamDaemon;
    
    // Token addresses on mainnet
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // DEX addresses
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    function setUp() public {
        // Deploy fetchers
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 3000);
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        CurveFetcher curveFetcher = new CurveFetcher(CURVE_3POOL);
        
        // Deploy StreamDaemon
        address[] memory dexs = new address[](4);
        address[] memory routers = new address[](4);
        
        dexs[0] = address(uniswapV2Fetcher);
        dexs[1] = address(uniswapV3Fetcher);
        dexs[2] = address(sushiswapFetcher);
        dexs[3] = address(curveFetcher);
        
        routers[0] = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // Uniswap V2 Router
        routers[1] = 0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router
        routers[2] = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F; // SushiSwap Router
        routers[3] = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7; // Curve 3Pool
        
        streamDaemon = new StreamDaemon(dexs, routers);
    }
    
    function testSweetSpotV3WithDifferentAmounts() public {
        console.log("=== Testing SweetSpotAlgo v3 with Different WETH Amounts ===");
        
        // Test amounts: 1, 10, 100, 1000, 10000 WETH
        uint256[] memory testAmounts = new uint256[](5);
        testAmounts[0] = 1 * 1e18;     // 1 WETH
        testAmounts[1] = 10 * 1e18;    // 10 WETH
        testAmounts[2] = 100 * 1e18;   // 100 WETH
        testAmounts[3] = 1000 * 1e18;  // 1000 WETH
        testAmounts[4] = 10000 * 1e18; // 10000 WETH
        
        for (uint256 i = 0; i < testAmounts.length; i++) {
            uint256 amountIn = testAmounts[i];
            console.log("\n--- Testing with", amountIn / 1e18, "WETH ---");
            
            // Test both price-based and reserve-based selection
            testSweetSpotForAmount(amountIn, false, "Reserve-based");
            testSweetSpotForAmount(amountIn, true, "Price-based");
        }
    }
    
    function testSweetSpotForAmount(uint256 amountIn, bool usePriceBased, string memory selectionType) internal {
        console.log("Testing %s selection for %d WETH", selectionType, amountIn / 1e18);
        
        // Get sweet spot evaluation without placing actual trade
        try streamDaemon.evaluateSweetSpotAndDex(
            WETH,
            DAI,
            amountIn,
            0, // effectiveGas
            usePriceBased
        ) returns (uint256 sweetSpot, address bestFetcher, address router) {
            console.log("  Sweet Spot: %d", sweetSpot);
            console.log("  Best Fetcher: %s", bestFetcher);
            console.log("  Router: %s", router);
            
            // Get some additional info about the selected DEX
            try IUniversalDexInterface(bestFetcher).getDexType() returns (string memory dexType) {
                console.log("  DEX Type: %s", dexType);
            } catch {
                console.log("  DEX Type: Unknown");
            }
            
            // Get reserves for context
            try IUniversalDexInterface(bestFetcher).getReserves(WETH, DAI) returns (uint256 reserveIn, uint256 reserveOut) {
                console.log("  WETH Reserve: %d WETH", reserveIn / 1e18);
                console.log("  DAI Reserve: %d DAI", reserveOut / 1e18);
                
                // Calculate what percentage of the pool this trade represents
                if (reserveIn > 0) {
                    uint256 poolPercentage = (amountIn * 10000) / reserveIn; // in basis points
                    console.log("  Trade as %% of pool: %d%%", poolPercentage / 100);
                }
            } catch {
                console.log("  Could not get reserves");
            }
            
            // Get a price quote for context
            try IUniversalDexInterface(bestFetcher).getPrice(WETH, DAI, amountIn) returns (uint256 amountOut) {
                console.log("  Expected DAI out: %d DAI", amountOut / 1e18);
                if (amountIn > 0) {
                    console.log("  Effective rate: %d DAI per WETH", (amountOut * 1e18) / amountIn);
                }
            } catch {
                console.log("  Could not get price quote");
            }
            
        } catch Error(string memory reason) {
            console.log("  Error: %s", reason);
        } catch {
            console.log("  Unknown error occurred");
        }
    }
}
