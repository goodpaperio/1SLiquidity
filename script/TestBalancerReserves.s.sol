// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {Executor} from "../src/Executor.sol";
import {IUniversalDexInterface} from "../src/interfaces/IUniversalDexInterface.sol";
import {BalancerV2Fetcher} from "../src/adapters/BalancerV2Fetcher.sol";
import {BalancerV2PoolRegistry} from "../src/adapters/BalancerV2PoolRegistry.sol";

contract TestBalancerReservesScript is Script {
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    
    // Real Balancer V2 pool addresses
    address constant BAL_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56; // BAL/WETH 80/20
    address constant USDC_WETH_POOL = 0x96646936B91d6b9d7D0c47C496AFbF3D6eC7b6f0; // USDC/WETH 50/50
    address constant DAI_USDC_POOL = 0x06Df3b2bbB68adc8B0e302443692037ED9f91b42; // DAI/USDC 50/50

    function run() external {
        vm.startBroadcast();

        console.log("=== Testing Balancer V2 Reserves ===");

        // Set up Balancer V2 registry and fetcher instances
        BalancerV2PoolRegistry registry = new BalancerV2PoolRegistry(address(this));
        registry.setKeeper(address(this), true);

        // Register pools for both token orders
        registry.addPool(BAL, WETH, BAL_WETH_POOL, true);
        registry.addPool(WETH, BAL, BAL_WETH_POOL, true);
        registry.addPool(USDC, WETH, USDC_WETH_POOL, true);
        registry.addPool(WETH, USDC, USDC_WETH_POOL, true);
        registry.addPool(DAI, USDC, DAI_USDC_POOL, true);
        registry.addPool(USDC, DAI, DAI_USDC_POOL, true);

        BalancerV2Fetcher balWethFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));
        BalancerV2Fetcher usdcWethFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));
        BalancerV2Fetcher daiUsdcFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));

        // Test token pairs
        address[2][3] memory tokenPairs = [
            [BAL, WETH],
            [USDC, WETH],
            [DAI, USDC]
        ];

        BalancerV2Fetcher[3] memory fetchers = [
            balWethFetcher,
            usdcWethFetcher,
            daiUsdcFetcher
        ];

        string[3] memory pairNames = [
            "BAL/WETH",
            "USDC/WETH", 
            "DAI/USDC"
        ];

        // Test reserves for each pool
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            console.log(string(abi.encodePacked("\n=== Testing ", pairNames[i], " Reserves ===")));
            testReservesForPair(fetchers[i], tokenPairs[i][0], tokenPairs[i][1], pairNames[i]);
        }

        // Test StreamDaemon integration
        console.log("\n=== Testing StreamDaemon Integration ===");
        testStreamDaemonIntegration(fetchers);

        // Test sweet spot calculation
        console.log("\n=== Testing Sweet Spot Calculation ===");
        testSweetSpotCalculation(fetchers, tokenPairs);

        vm.stopBroadcast();
    }

    function testReservesForPair(
        BalancerV2Fetcher fetcher,
        address tokenA,
        address tokenB,
        string memory pairName
    ) internal view {
        try fetcher.getReserves(tokenA, tokenB) returns (uint256 reserveA, uint256 reserveB) {
            console.log(string(abi.encodePacked("Reserves for ", pairName, ": ")));
            console.log("Token A reserves:", reserveA);
            console.log("Token B reserves:", reserveB);
            
            // Test price calculation
            uint256 amountIn = 1e18; // 1 token (assuming 18 decimals)
            try fetcher.getPrice(tokenA, tokenB, amountIn) returns (uint256 price) {
                console.log("Price for 1 token A in token B:", price);
            } catch {
                console.log("Price calculation failed");
            }
            
            console.log(string(abi.encodePacked(pairName, " reserves test PASSED")));
        } catch Error(string memory reason) {
            console.log(string(abi.encodePacked(pairName, " reserves test FAILED: ", reason)));
        } catch {
            console.log(string(abi.encodePacked(pairName, " reserves test FAILED with low level error")));
        }
    }

    function testStreamDaemonIntegration(BalancerV2Fetcher[3] memory fetchers) internal {
        // Create array of fetcher addresses
        address[] memory dexAddresses = new address[](3);
        for (uint256 i = 0; i < fetchers.length; i++) {
            dexAddresses[i] = address(fetchers[i]);
        }

        address[] memory routers = new address[](3);
        for (uint256 i = 0; i < routers.length; i++) {
            routers[i] = BALANCER_VAULT;
        }

        StreamDaemon streamDaemon = new StreamDaemon(dexAddresses, routers);

        // Test findHighestReservesForTokenPair
        address[][] memory testPairs = new address[][](2);
        testPairs[0] = new address[](2);
        testPairs[0][0] = BAL;
        testPairs[0][1] = WETH;
        testPairs[1] = new address[](2);
        testPairs[1][0] = USDC;
        testPairs[1][1] = WETH;

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
        BalancerV2Fetcher[3] memory fetchers,
        address[2][3] memory tokenPairs
    ) internal {
        // Create array of fetcher addresses
        address[] memory dexAddresses = new address[](3);
        for (uint256 i = 0; i < fetchers.length; i++) {
            dexAddresses[i] = address(fetchers[i]);
        }

        address[] memory routers = new address[](3);
        for (uint256 i = 0; i < routers.length; i++) {
            routers[i] = BALANCER_VAULT;
        }

        StreamDaemon streamDaemon = new StreamDaemon(dexAddresses, routers);

        // Test sweet spot calculation
        uint256 testVolume = 2 * 33_333_333_333_333_333_333; // ~66 eth in 18 decimal
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

    function getTokenSymbol(address token) internal pure returns (string memory) {
        if (token == WETH) return "WETH";
        if (token == USDC) return "USDC";
        if (token == BAL) return "BAL";
        if (token == DAI) return "DAI";
        if (token == USDT) return "USDT";
        return "UNKNOWN";
    }
}
