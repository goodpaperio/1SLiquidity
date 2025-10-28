// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../../src/Core.sol";
import "../../../src/StreamDaemon.sol";
import "../../../src/Executor.sol";
import "../../../src/Registry.sol";
import "../../../src/adapters/UniswapV2Fetcher.sol";
import "../../../src/adapters/SushiswapFetcher.sol";
import "../../../src/Utils.sol";
import "../../../src/interfaces/IUniversalDexInterface.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract CustomTradePlacement is Test {
    using SafeERC20 for IERC20;

    // Core protocol contracts
    Core public core;
    StreamDaemon public streamDaemon;
    Executor public executor;
    Registry public registry;

    // Simplified DEX setup - only SushiSwap and UniswapV2
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // Token addresses
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // Whale addresses for funding
    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;
    address constant DAI_WHALE = 0x28C6c06298d514Db089934071355E5743bf21d60;

    function setUp() public {
        console.log("=== Custom Trade Placement Setup ===");
        
        console.log("Using existing anvil fork at block:", block.number);
        
        // Deploy simplified fetchers (only SushiSwap and UniswapV2)
        console.log("Deploying UniswapV2Fetcher...");
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        
        console.log("Deploying SushiswapFetcher...");
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        
        // Create array with only 2 DEXs
        address[] memory dexs = new address[](2);
        dexs[0] = address(uniswapV2Fetcher);
        dexs[1] = address(sushiswapFetcher);
        
        address[] memory routers = new address[](2);
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = SUSHISWAP_ROUTER;
        
        console.log("Deploying StreamDaemon with simplified DEX setup...");
        streamDaemon = new StreamDaemon(dexs, routers);
        
        console.log("Deploying Executor...");
        executor = new Executor();
        
        console.log("Deploying Registry...");
        registry = new Registry();
        
        // Configure only the 2 routers we're using
        registry.setRouter("UniswapV2", UNISWAP_V2_ROUTER);
        registry.setRouter("Sushiswap", SUSHISWAP_ROUTER);
        
        console.log("Deploying Core...");
        core = new Core(address(streamDaemon), address(executor), address(registry));
        
        // Fund this contract with USDC and DAI
        console.log("Funding contract with USDC...");
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(address(this), 100_000 * 1e6); // 100,000 USDC
        vm.stopPrank();
        
        console.log("Funding contract with DAI...");
        vm.startPrank(DAI_WHALE);
        IERC20(DAI).transfer(address(this), 100_000 * 1e18); // 100,000 DAI
        vm.stopPrank();
        
        // Approve Core to spend tokens
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        IERC20(DAI).forceApprove(address(core), type(uint256).max);
        
        console.log("Setup completed!");
        console.log("USDC Balance:", IERC20(USDC).balanceOf(address(this)) / 1e6);
        console.log("DAI Balance:", IERC20(DAI).balanceOf(address(this)) / 1e18);
    }

    function testCustomTradePlacement() public {
        console.log("=== Starting Custom Trade Placement Test ===");
        
        // Test 1: Place a USDC/DAI trade ($100)
        uint256 tradeId1 = placeUSDCTrade(DAI, 100);
        executeTradeThreeTimes(tradeId1, "USDC/DAI");
        
        // Test 2: Place a USDC/WETH trade ($100)
        uint256 tradeId2 = placeUSDCTrade(WETH, 100);
        executeTradeThreeTimes(tradeId2, "USDC/WETH");
        
        console.log("=== Test Completed ===");
    }

    function run() external {
        testCustomTradePlacement();
    }

    function placeUSDCTrade(address tokenOut, uint256 usdAmount) public returns (uint256 tradeId) {
        console.log("\n--- Placing $%d USDC Trade ---", usdAmount);
        
        uint256 amountIn = usdAmount * 1e6; // Convert USD to USDC (6 decimals)
        
        // Set minimum amount out: 90% of input to allow for slippage and streaming
        // For DAI: 1e18 decimals
        // For WETH: will be converted to 18 decimals
        uint256 amountOutMin;
        if (tokenOut == DAI) {
            amountOutMin = (usdAmount * 1e18) * 90 / 100; // 90% of USD value in DAI (18 decimals)
        } else if (tokenOut == WETH) {
            // Skip minimum for WETH to avoid slippage issues
            amountOutMin = 0;
        } else {
            amountOutMin = 0; // No minimum for unknown tokens
        }
        
        console.log("Amount In: %d USDC", amountIn / 1e6);
        console.log("Token Out: %s", tokenOut);
        console.log("Amount Out Min: %d", amountOutMin / 1e18);
        
        // Create trade data
        bytes memory tradeData = abi.encode(
            USDC,           // tokenIn
            tokenOut,       // tokenOut
            amountIn,       // amountIn
            amountOutMin,   // amountOutMin
            false,          // isInstasettlable
            false,          // usePriceBased
            100,            // instasettleBps
            false           // onlyInstasettle
        );
        
        // Place the trade
        console.log("Placing trade...");
        core.placeTrade(tradeData);
        
        // Get trade details
        bytes32 pairId = keccak256(abi.encode(USDC, tokenOut));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        tradeId = tradeIds[tradeIds.length - 1];
        
        Utils.Trade memory trade = core.getTrade(tradeId);
        
        console.log("Trade placed successfully!");
        console.log("  Trade ID: %d", tradeId);
        console.log("  Amount In: %d USDC", trade.amountIn / 1e6);
        console.log("  Amount Remaining: %d USDC", trade.amountRemaining / 1e6);
        console.log("  Last Sweet Spot: %d", trade.lastSweetSpot);
        
        return tradeId;
    }

    function executeTradeThreeTimes(uint256 tradeId, string memory pairName) public {
        console.log("\n--- Executing %s Trade 3 Times ---", pairName);
        
        // Determine pairId based on trade
        Utils.Trade memory trade = core.getTrade(tradeId);
        bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
        
        for (uint256 i = 1; i <= 3; i++) {
            console.log("\n--- Execution #%d ---", i);
            
            // Get trade state before execution
            Utils.Trade memory tradeBefore = core.getTrade(tradeId);
            console.log("Before execution:");
            console.log("  Amount Remaining: %d USDC", tradeBefore.amountRemaining / 1e6);
            console.log("  Realised Amount Out: %d", tradeBefore.realisedAmountOut / 1e18);
            console.log("  Last Sweet Spot: %d", tradeBefore.lastSweetSpot);
            console.log("  Attempts: %d", tradeBefore.attempts);
            
            // Check if trade is already settled
            if (tradeBefore.amountRemaining == 0) {
                console.log("Trade is already settled!");
                break;
            }
            
            // Execute the trade
            console.log("Executing executeTrades...");
            try core.executeTrades(pairId) {
                console.log("executeTrades succeeded");
                
                // Check trade state after execution
                try core.getTrade(tradeId) returns (Utils.Trade memory tradeAfter) {
                    console.log("After execution:");
                    console.log("  Amount Remaining: %d USDC", tradeAfter.amountRemaining / 1e6);
                    console.log("  Realised Amount Out: %d", tradeAfter.realisedAmountOut / 1e18);
                    console.log("  Last Sweet Spot: %d", tradeAfter.lastSweetSpot);
                    console.log("  Attempts: %d", tradeAfter.attempts);
                    
                    // Check if trade is now settled
                    if (tradeAfter.amountRemaining == 0) {
                        console.log("Trade fully settled!");
                        break;
                    }
                } catch {
                    console.log("After execution: Trade completed and settled (deleted from storage)");
                    break;
                }
                
            } catch Error(string memory reason) {
                console.log("executeTrades failed with reason: %s", reason);
                break;
            } catch (bytes memory lowLevelData) {
                console.log("executeTrades failed with low level error");
                console.log("Error data: %s", vm.toString(lowLevelData));
                break;
            }
            
            // Roll to next block for next execution
            vm.roll(block.number + 1);
        }
        
        // Final trade state
        // Utils.Trade memory finalTrade = core.getTrade(tradeId);
        // console.log("\n--- Final Trade State ---");
        // console.log("  Amount Remaining: %d USDC", finalTrade.amountRemaining / 1e6);
        // console.log("  Realised Amount Out: %d", finalTrade.realisedAmountOut / 1e18);
        // console.log("  Last Sweet Spot: %d", finalTrade.lastSweetSpot);
        // console.log("  Attempts: %d", finalTrade.attempts);
        // console.log("  Trade Settled: %s", finalTrade.amountRemaining == 0 ? "YES" : "NO");
    }

    function executeTradeUntilSettled(uint256 tradeId) public {
        console.log("\n--- Executing Trade Until Settled ---");
        
        bytes32 pairId = keccak256(abi.encode(USDC, DAI));
        uint256 executionCount = 0;
        uint256 maxExecutions = 10; // Safety limit
        
        while (executionCount < maxExecutions) {
            executionCount++;
            console.log("\n--- Execution #%d ---", executionCount);
            
            // Get trade state before execution
            Utils.Trade memory tradeBefore = core.getTrade(tradeId);
            console.log("Before execution:");
            console.log("  Amount Remaining: %d USDC", tradeBefore.amountRemaining / 1e6);
            console.log("  Realised Amount Out: %d DAI", tradeBefore.realisedAmountOut / 1e18);
            console.log("  Last Sweet Spot: %d", tradeBefore.lastSweetSpot);
            console.log("  Attempts: %d", tradeBefore.attempts);
            
            // Check if trade is already settled
            if (tradeBefore.lastSweetSpot == 0) {
                console.log("Trade is already settled!");
                break;
            }
            
            // Execute the trade
            console.log("Executing executeTrades...");
            try core.executeTrades(pairId) {
                console.log("executeTrades succeeded");
            } catch Error(string memory reason) {
                console.log("executeTrades failed with reason: %s", reason);
                break;
            } catch (bytes memory lowLevelData) {
                console.log("executeTrades failed with low level error");
                console.log("Error data: %s", vm.toString(lowLevelData));
                break;
            }
            
            // Get trade state after execution
            Utils.Trade memory tradeAfter = core.getTrade(tradeId);
            console.log("After execution:");
            console.log("  Amount Remaining: %d USDC", tradeAfter.amountRemaining / 1e6);
            console.log("  Realised Amount Out: %d DAI", tradeAfter.realisedAmountOut / 1e18);
            console.log("  Last Sweet Spot: %d", tradeAfter.lastSweetSpot);
            console.log("  Attempts: %d", tradeAfter.attempts);
            
            // Check if trade is settled
            if (tradeAfter.lastSweetSpot == 0) {
                console.log("Trade settled successfully!");
                break;
            }
            
            // Check if trade was cancelled due to too many attempts
            if (tradeAfter.attempts >= 3) {
                console.log("Trade cancelled due to too many attempts");
                break;
            }
            
            // Small delay between executions
            vm.roll(block.number + 1);
        }
        
        if (executionCount >= maxExecutions) {
            console.log("Reached maximum execution limit");
        }
    }

    // Helper function to debug StreamDaemon evaluation
    function debugStreamDaemonEvaluation() public view {
        console.log("\n--- Debugging StreamDaemon Evaluation ---");
        
        uint256 amountIn = 10_000 * 1e6; // 10,000 USDC
        
        try streamDaemon.evaluateSweetSpotAndDex(
            USDC,
            DAI,
            amountIn,
            0, // effectiveGas
            false // usePriceBased
        ) returns (uint256 sweetSpot, address bestFetcher, address router) {
            console.log("Sweet Spot: %d", sweetSpot);
            console.log("Best Fetcher: %s", bestFetcher);
            console.log("Router: %s", router);
            
            // Get DEX type
            try IUniversalDexInterface(bestFetcher).getDexType() returns (string memory dexType) {
                console.log("DEX Type: %s", dexType);
            } catch {
                console.log("DEX Type: Unknown");
            }
            
            // Get reserves
            try IUniversalDexInterface(bestFetcher).getReserves(USDC, DAI) returns (uint256 reserveIn, uint256 reserveOut) {
                console.log("USDC Reserve: %d USDC", reserveIn / 1e6);
                console.log("DAI Reserve: %d DAI", reserveOut / 1e18);
                
                uint256 poolPercentage = (amountIn * 10000) / reserveIn;
                console.log("Trade as %% of pool: %d%%", poolPercentage / 100);
            } catch {
                console.log("Could not get reserves");
            }
            
            // Get price quote
            try IUniversalDexInterface(bestFetcher).getPrice(USDC, DAI, amountIn) returns (uint256 amountOut) {
                console.log("Expected DAI out: %d DAI", amountOut / 1e18);
                console.log("Effective rate: %d DAI per USDC", (amountOut * 1e6) / amountIn);
            } catch {
                console.log("Could not get price quote");
            }
            
        } catch Error(string memory reason) {
            console.log("Error: %s", reason);
        } catch {
            console.log("Unknown error occurred");
        }
    }
}
