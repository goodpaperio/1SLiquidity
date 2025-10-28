// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {Executor} from "../src/Executor.sol";
import {IUniversalDexInterface} from "../src/interfaces/IUniversalDexInterface.sol";
import {CurveMetaFetcher} from "../src/adapters/CurveMetaFetcher.sol";
import {ICurveMetaRegistry} from "../src/interfaces/dex/ICurveMetaRegistry.sol";

contract TestCurveReservesScript is Script {
    address constant CURVE_META_REGISTRY = 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant FRAX = 0x853d955aCEf822Db058eb8505911ED77F175b99e;

    function run() external {
        vm.startBroadcast();

        console.log("=== Testing Curve MetaRegistry Reserves ===");

        // Create Curve MetaFetcher
        CurveMetaFetcher curveFetcher = new CurveMetaFetcher(CURVE_META_REGISTRY);

        // Test token pairs
        address[2][4] memory tokenPairs = [
            [USDC, DAI],
            [DAI, USDT],
            [USDC, USDT],
            [USDC, FRAX]
        ];

        string[4] memory pairNames = [
            "USDC/DAI",
            "DAI/USDT", 
            "USDC/USDT",
            "USDC/FRAX"
        ];

        // Test reserves for each pair
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            console.log(string(abi.encodePacked("\n=== Testing ", pairNames[i], " Reserves ===")));
            testReservesForPair(curveFetcher, tokenPairs[i][0], tokenPairs[i][1], pairNames[i]);
        }

        // Test StreamDaemon integration
        console.log("\n=== Testing StreamDaemon Integration ===");
        testStreamDaemonIntegration(curveFetcher);

        // Test sweet spot calculation
        console.log("\n=== Testing Sweet Spot Calculation ===");
        testSweetSpotCalculation(curveFetcher, tokenPairs);

        // Test MetaRegistry direct calls
        console.log("\n=== Testing MetaRegistry Direct Calls ===");
        testMetaRegistryDirectCalls();

        vm.stopBroadcast();
    }

    function testReservesForPair(
        CurveMetaFetcher fetcher,
        address tokenA,
        address tokenB,
        string memory pairName
    ) internal view {
        try fetcher.getReserves(tokenA, tokenB) returns (uint256 reserveA, uint256 reserveB) {
            console.log(string(abi.encodePacked("Reserves for ", pairName, ": ")));
            console.log("Token A reserves:", reserveA);
            console.log("Token B reserves:", reserveB);
            
            // Test price calculation
            uint256 amountIn = 100 * 10**6; // 100 USDC (6 decimals) or equivalent
            try fetcher.getPrice(tokenA, tokenB, amountIn) returns (uint256 price) {
                console.log("Price for 100 token A in token B:", price);
            } catch {
                console.log("Price calculation failed");
            }
            
            // Test pool address retrieval
            try fetcher.getPoolAddress(tokenA, tokenB) returns (address poolAddress) {
                console.log("Best pool address:", poolAddress);
            } catch {
                console.log("Pool address retrieval failed");
            }
            
            console.log(string(abi.encodePacked(pairName, " reserves test PASSED")));
        } catch Error(string memory reason) {
            console.log(string(abi.encodePacked(pairName, " reserves test FAILED: ", reason)));
        } catch {
            console.log(string(abi.encodePacked(pairName, " reserves test FAILED with low level error")));
        }
    }

    function testStreamDaemonIntegration(CurveMetaFetcher curveFetcher) internal {
        // Create array with single Curve fetcher
        address[] memory dexAddresses = new address[](1);
        dexAddresses[0] = address(curveFetcher);

        address[] memory routers = new address[](1);
        routers[0] = CURVE_META_REGISTRY; // Use MetaRegistry as router

        StreamDaemon streamDaemon = new StreamDaemon(dexAddresses, routers);

        // Test findHighestReservesForTokenPair
        address[][] memory testPairs = new address[][](2);
        testPairs[0] = new address[](2);
        testPairs[0][0] = USDC;
        testPairs[0][1] = DAI;
        testPairs[1] = new address[](2);
        testPairs[1][0] = DAI;
        testPairs[1][1] = USDT;

        for (uint256 i = 0; i < testPairs.length; i++) {
            address token0 = testPairs[i][0];
            address token1 = testPairs[i][1];

            try streamDaemon.findHighestReservesForTokenPair(token0, token1) returns (
                address bestDex,
                uint256 maxReserveIn,
                uint256 maxReserveOut
            ) {
                console.log(string(abi.encodePacked("Best DEX for ", getTokenSymbol(token0), "-", getTokenSymbol(token1), ": ")));
                console.log(bestDex);
                console.log("Highest reserve in:", maxReserveIn);
                console.log("Highest reserve out:", maxReserveOut);
            } catch {
                console.log(string(abi.encodePacked("Failed to find highest reserves for ", getTokenSymbol(token0), "-", getTokenSymbol(token1))));
            }
        }
    }

    function testSweetSpotCalculation(
        CurveMetaFetcher curveFetcher,
        address[2][4] memory tokenPairs
    ) internal {
        // Create array with single Curve fetcher
        address[] memory dexAddresses = new address[](1);
        dexAddresses[0] = address(curveFetcher);

        address[] memory routers = new address[](1);
        routers[0] = CURVE_META_REGISTRY;

        StreamDaemon streamDaemon = new StreamDaemon(dexAddresses, routers);

        // Test sweet spot calculation
        uint256 testVolume = 100 * 10**6; // 100 USDC (6 decimals)
        uint256 effectiveGasInDollars = 1; // $1 gas cost

        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            try streamDaemon.evaluateSweetSpotAndDex(token0, token1, testVolume, effectiveGasInDollars, false) returns (
                uint256 sweetSpot,
                address bestFetcher,
                address router
            ) {
                console.log(string(abi.encodePacked("Token Pair: ", getTokenSymbol(token0), "-", getTokenSymbol(token1))));
                console.log("Best DEX:", bestFetcher);
                console.log("Sweet Spot:", sweetSpot);
            } catch {
                console.log(string(abi.encodePacked("Failed to evaluate sweet spot for ", getTokenSymbol(token0), "-", getTokenSymbol(token1))));
            }
        }
    }

    function testMetaRegistryDirectCalls() internal {
        // Test direct MetaRegistry calls
        try ICurveMetaRegistry(CURVE_META_REGISTRY).find_pools_for_coins(USDC, DAI) returns (address[] memory pools) {
            console.log("Direct MetaRegistry call - Found pools count:", pools.length);
            
            for (uint256 i = 0; i < pools.length; i++) {
                console.log("Pool", i, ":", pools[i]);
                
                // Try to get coin indices
                try ICurveMetaRegistry(CURVE_META_REGISTRY).get_coin_indices(pools[i], USDC, DAI) returns (
                    int128 coinI,
                    int128 coinJ,
                    bool isUnderlying
                ) {
                    console.log("Coin indices for pool:");
                    console.log(uint256(int256(coinI)));
                    console.log(uint256(int256(coinJ)));
                    console.log("isUnderlying:");
                    console.log(isUnderlying);
                } catch {
                    console.log("Failed to get coin indices for pool", i);
                }
            }
        } catch Error(string memory reason) {
            console.log("Direct MetaRegistry call failed:", reason);
        } catch {
            console.log("Direct MetaRegistry call failed with low level error");
        }
    }

    function getTokenSymbol(address token) internal pure returns (string memory) {
        if (token == WETH) return "WETH";
        if (token == USDC) return "USDC";
        if (token == DAI) return "DAI";
        if (token == USDT) return "USDT";
        if (token == FRAX) return "FRAX";
        return "UNKNOWN";
    }
}
