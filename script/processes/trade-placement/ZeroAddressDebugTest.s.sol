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

contract ZeroAddressDebugTest is Test {
    using SafeERC20 for IERC20;

    // Core protocol contracts
    Core public core;
    StreamDaemon public streamDaemon;
    Executor public executor;
    Registry public registry;

    // DEX addresses
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // Token addresses
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    // Whale addresses
    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;
    address constant DAI_WHALE = 0x28C6c06298d514Db089934071355E5743bf21d60;

    function setUp() public {
        console.log("=== Zero Address Debug Test Setup ===");
        
        console.log("Using existing anvil fork at block:", block.number);
        
        // Deploy contracts with minimal setup
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        
        address[] memory dexs = new address[](2);
        dexs[0] = address(uniswapV2Fetcher);
        dexs[1] = address(sushiswapFetcher);
        
        address[] memory routers = new address[](2);
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = SUSHISWAP_ROUTER;
        
        streamDaemon = new StreamDaemon(dexs, routers);
        executor = new Executor();
        registry = new Registry();
        
        registry.setRouter("UniswapV2", UNISWAP_V2_ROUTER);
        registry.setRouter("Sushiswap", SUSHISWAP_ROUTER);
        
        core = new Core(address(streamDaemon), address(executor), address(registry), address(0));
        
        // Fund contract
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(address(this), 50_000 * 1e6);
        vm.stopPrank();
        
        vm.startPrank(DAI_WHALE);
        IERC20(DAI).transfer(address(this), 50_000 * 1e18);
        vm.stopPrank();
        
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        IERC20(DAI).forceApprove(address(core), type(uint256).max);
        
        console.log("Setup completed");
    }

    function testZeroAddressIssue() public {
        console.log("=== Testing Zero Address Issue ===");
        
        // Place a trade
        uint256 amountIn = 5_000 * 1e6; // 5,000 USDC
        uint256 amountOutMin = 4_500 * 1e18; // 4,500 DAI
        
        bytes memory tradeData = abi.encode(
            USDC, DAI, amountIn, amountOutMin, false, false, 100, false
        );
        
        core.placeTrade(tradeData);
        
        // Get trade details
        bytes32 pairId = keccak256(abi.encode(USDC, DAI));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        Utils.Trade memory trade = core.getTrade(tradeId);
        
        console.log("Trade placed:");
        console.log("  Trade ID: %d", tradeId);
        console.log("  Token In: %s", trade.tokenIn);
        console.log("  Token Out: %s", trade.tokenOut);
        console.log("  Amount In: %d USDC", trade.amountIn / 1e6);
        console.log("  Amount Remaining: %d USDC", trade.amountRemaining / 1e6);
        console.log("  Last Sweet Spot: %d", trade.lastSweetSpot);
        
        // Debug StreamDaemon evaluation
        console.log("\n--- Debugging StreamDaemon Evaluation ---");
        debugStreamDaemonCall(trade.tokenIn, trade.tokenOut, trade.amountRemaining);
        
        // Try to execute the trade and catch any errors
        console.log("\n--- Attempting Trade Execution ---");
        try core.executeTrades(pairId) {
            console.log("executeTrades succeeded");
            
            // Check trade state after execution
            Utils.Trade memory updatedTrade = core.getTrade(tradeId);
            console.log("After execution:");
            console.log("  Amount Remaining: %d USDC", updatedTrade.amountRemaining / 1e6);
            console.log("  Realised Amount Out: %d DAI", updatedTrade.realisedAmountOut / 1e18);
            console.log("  Last Sweet Spot: %d", updatedTrade.lastSweetSpot);
            console.log("  Attempts: %d", updatedTrade.attempts);
            
        } catch Error(string memory reason) {
            console.log("executeTrades failed with reason: %s", reason);
        } catch (bytes memory lowLevelData) {
            console.log("executeTrades failed with low level error");
            console.log("Error data: %s", vm.toString(lowLevelData));
        }
    }

    function debugStreamDaemonCall(address tokenIn, address tokenOut, uint256 amountRemaining) internal view {
        console.log("Calling streamDaemon.evaluateSweetSpotAndDex with:");
        console.log("  Token In: %s", tokenIn);
        console.log("  Token Out: %s", tokenOut);
        console.log("  Amount Remaining: %d", amountRemaining);
        
        try streamDaemon.evaluateSweetSpotAndDex(
            tokenIn,
            tokenOut,
            amountRemaining,
            0, // effectiveGas
            false // usePriceBased
        ) returns (uint256 sweetSpot, address bestFetcher, address router) {
            console.log("StreamDaemon returned:");
            console.log("  Sweet Spot: %d", sweetSpot);
            console.log("  Best Fetcher: %s", bestFetcher);
            console.log("  Router: %s", router);
            
            // Test the fetcher directly
            if (bestFetcher != address(0)) {
                console.log("\n--- Testing Fetcher Directly ---");
                testFetcherDirectly(bestFetcher, tokenIn, tokenOut, amountRemaining);
            }
            
        } catch Error(string memory reason) {
            console.log("StreamDaemon evaluation failed: %s", reason);
        } catch (bytes memory lowLevelData) {
            console.log("StreamDaemon evaluation failed with low level error");
            console.log("Error data: %s", vm.toString(lowLevelData));
        }
    }

    function testFetcherDirectly(address fetcher, address tokenIn, address tokenOut, uint256 amountIn) internal view {
        console.log("Testing fetcher %s directly", fetcher);
        
        try IUniversalDexInterface(fetcher).getDexType() returns (string memory dexType) {
            console.log("  DEX Type: %s", dexType);
        } catch {
            console.log("  Could not get DEX type");
        }
        
        try IUniversalDexInterface(fetcher).getReserves(tokenIn, tokenOut) returns (uint256 reserveIn, uint256 reserveOut) {
            console.log("  Reserve In: %d", reserveIn);
            console.log("  Reserve Out: %d", reserveOut);
        } catch {
            console.log("  Could not get reserves");
        }
        
        try IUniversalDexInterface(fetcher).getPrice(tokenIn, tokenOut, amountIn) returns (uint256 amountOut) {
            console.log("  Expected Amount Out: %d", amountOut);
        } catch {
            console.log("  Could not get price");
        }
    }

    function run() external {
        testZeroAddressIssue();
    }
}
